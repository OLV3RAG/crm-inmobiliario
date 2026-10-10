import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { isFacebookConfigured } from './facebook.service.js';

const FB_GRAPH = `https://graph.facebook.com/${env.facebook.graphVersion}`;
const IG_GRAPH = `https://graph.instagram.com/${env.facebook.graphVersion}`;

export function isInstagramPublishConfigured() {
  return Boolean(
    (env.metaMessaging.instagramAccessToken && env.metaMessaging.instagramAccountId)
    || isFacebookConfigured(),
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toHttpsUrl(url) {
  if (!url) return null;
  const raw = String(url).trim();
  if (/^https:\/\//i.test(raw)) return raw;
  if (/^http:\/\//i.test(raw)) return raw.replace(/^http:/i, 'https:');
  return null;
}

async function graphGet(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || 'Error al consultar Instagram');
  }
  return data;
}

async function graphPost(url, params) {
  const body = new URLSearchParams(params);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || 'Error al publicar en Instagram');
  }
  return data;
}

async function resolveInstagramTarget() {
  const igAccountId = env.metaMessaging.instagramAccountId;
  const igToken = env.metaMessaging.instagramAccessToken;
  const pageToken = env.facebook.pageAccessToken;

  const targets = [];
  if (pageToken && igAccountId) {
    targets.push({ base: FB_GRAPH, igUserId: igAccountId, token: pageToken });
  }
  if (pageToken && env.facebook.pageId) {
    try {
      const page = await graphGet(
        `${FB_GRAPH}/${env.facebook.pageId}?fields=instagram_business_account&access_token=${encodeURIComponent(pageToken)}`,
      );
      const linkedId = page?.instagram_business_account?.id;
      if (linkedId) {
        targets.push({ base: FB_GRAPH, igUserId: linkedId, token: pageToken });
      }
    } catch (err) {
      logger.warn('Instagram: no se pudo leer la cuenta ligada a la página', { err: err.message });
    }
  }
  if (igToken && igAccountId) {
    targets.push({ base: IG_GRAPH, igUserId: igAccountId, token: igToken });
  }

  const seen = new Set();
  return targets.filter((t) => {
    const key = `${t.base}:${t.igUserId}:${t.token.slice(0, 8)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function waitForContainer(base, creationId, token) {
  let last = 'IN_PROGRESS';
  for (let i = 0; i < 24; i += 1) {
    try {
      const data = await graphGet(
        `${base}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
      );
      last = data.status_code || data.status || last;
      if (data.status_code === 'FINISHED' || data.status_code === 'PUBLISHED') return;
      if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
        throw new Error(data.status || 'Instagram no pudo procesar la imagen');
      }
    } catch (err) {
      if (/no pudo procesar/i.test(err.message)) throw err;
      last = err.message;
    }
    await sleep(2500);
  }
  throw new Error(`Instagram tardó demasiado en procesar la imagen (${last})`);
}

async function fetchPermalink(base, mediaId, token) {
  try {
    const data = await graphGet(
      `${base}/${mediaId}?fields=permalink,id&access_token=${encodeURIComponent(token)}`,
    );
    return data.permalink || `https://www.instagram.com/p/${mediaId}/`;
  } catch {
    return `https://www.instagram.com/p/${mediaId}/`;
  }
}

async function createImageContainer({ base, igUserId, token, imageUrl, carouselItem = false }) {
  const params = {
    image_url: imageUrl,
    access_token: token,
  };
  if (carouselItem) params.is_carousel_item = 'true';
  const container = await graphPost(`${base}/${igUserId}/media`, params);
  if (!container.id) throw new Error('Instagram no devolvió el contenedor de la foto');
  await waitForContainer(base, container.id, token);
  return container.id;
}

async function createCarouselContainer({ base, igUserId, token, childIds, caption }) {
  const params = {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
    access_token: token,
  };
  try {
    const carousel = await graphPost(`${base}/${igUserId}/media`, params);
    if (!carousel.id) throw new Error('Instagram no devolvió el contenedor del carrusel');
    return carousel.id;
  } catch (err) {
    const retry = {};
    childIds.forEach((id, index) => {
      retry[`children[${index}]`] = id;
    });
    const carousel = await graphPost(`${base}/${igUserId}/media`, {
      media_type: 'CAROUSEL',
      caption,
      access_token: token,
      ...retry,
    });
    if (!carousel.id) throw err;
    return carousel.id;
  }
}

async function createAndPublish({ base, igUserId, token, imageUrls, caption }) {
  const validUrls = [...new Set(imageUrls.map(toHttpsUrl).filter(Boolean))].slice(0, 10);
  if (!validUrls.length) {
    throw new Error('Instagram requiere una URL pública HTTPS de cada foto (PUBLIC_URL / FRONTEND_URL).');
  }

  logger.info('Instagram: creando contenedores', { count: validUrls.length, igUserId });

  let creationId;
  let publishedCount = validUrls.length;
  let warning = null;

  if (validUrls.length === 1) {
    const single = await graphPost(`${base}/${igUserId}/media`, {
      image_url: validUrls[0],
      caption,
      access_token: token,
    });
    creationId = single.id;
    await waitForContainer(base, creationId, token);
  } else {
    const children = [];
    const failed = [];
    for (const [index, imageUrl] of validUrls.entries()) {
      try {
        const childId = await createImageContainer({
          base,
          igUserId,
          token,
          imageUrl,
          carouselItem: true,
        });
        children.push({ id: childId, url: imageUrl });
      } catch (err) {
        failed.push({ index: index + 1, error: err.message });
        logger.warn('Instagram: foto de carrusel omitida', {
          index: index + 1,
          imageUrl,
          err: err.message,
        });
      }
    }

    if (!children.length) {
      const detail = failed.map((f) => `foto ${f.index}: ${f.error}`).join(' · ');
      throw new Error(`Instagram no pudo procesar ninguna foto${detail ? ` (${detail})` : ''}`);
    }

    if (children.length === 1) {
      warning = `Solo se publicó 1 de ${validUrls.length} fotos. Instagram rechazó el resto.`;
      publishedCount = 1;
      const single = await graphPost(`${base}/${igUserId}/media`, {
        image_url: children[0].url,
        caption,
        access_token: token,
      });
      creationId = single.id;
      await waitForContainer(base, creationId, token);
    } else {
      if (failed.length) {
        warning = `Se publicaron ${children.length} de ${validUrls.length} fotos.`;
      }
      publishedCount = children.length;
      creationId = await createCarouselContainer({
        base,
        igUserId,
        token,
        childIds: children.map((child) => child.id),
        caption,
      });
      await waitForContainer(base, creationId, token);
    }
  }

  const published = await graphPost(`${base}/${igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: token,
  });
  const mediaId = published.id;
  const permalink = await fetchPermalink(base, mediaId, token);
  return { mediaId, permalink, imageCount: publishedCount, warning };
}

export async function publishInstagramPost({ caption, imageUrls = [] }) {
  if (!isInstagramPublishConfigured()) {
    return { skipped: true, reason: 'not_configured' };
  }

  const targets = await resolveInstagramTarget();
  if (!targets.length) {
    throw new Error('No hay cuenta de Instagram profesional ligada a la página o falta INSTAGRAM_ACCOUNT_ID.');
  }

  let lastError = 'No se pudo publicar en Instagram';
  for (const target of targets) {
    try {
      const result = await createAndPublish({
        ...target,
        imageUrls,
        caption,
      });
      logger.info('Instagram: publicación creada', {
        mediaId: result.mediaId,
        igUserId: target.igUserId,
        imageCount: result.imageCount,
      });
      return result;
    } catch (err) {
      lastError = err.message;
      logger.warn('Instagram: intento de publicación falló', {
        igUserId: target.igUserId,
        base: target.base,
        err: lastError,
      });
    }
  }

  throw new Error(lastError);
}
