import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const GRAPH_BASE = `https://graph.facebook.com/${env.facebook.graphVersion}`;

export function isFacebookConfigured() {
  return Boolean(
    env.facebook.enabled
    && env.facebook.pageId
    && env.facebook.pageAccessToken,
  );
}

export function formatFacebookError(data) {
  const code = data?.error?.code;
  const raw = data?.error?.message || 'Error desconocido';
  if (code === 200 && /pages_manage_posts|pages_read_engagement/i.test(raw)) {
    return 'El token no puede publicar en la página. Usa un Page Access Token (no un token de usuario) con permisos pages_manage_posts y pages_read_engagement. Ejecuta: node scripts/test-facebook.js';
  }
  if (code === 190) {
    return 'Token de Facebook inválido o expirado. Genera uno nuevo en Meta for Developers.';
  }
  if (code === 100) {
    return `ID de página o token incorrecto: ${raw}`;
  }
  return raw;
}

async function graphRequest(endpoint, form) {
  const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE}${endpoint}`;
  const res = await fetch(url, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Facebook: ${formatFacebookError(data)}`);
  }
  return data;
}

export async function verifyFacebookPageAccess() {
  if (!isFacebookConfigured()) {
    return { ok: false, error: 'FACEBOOK_PAGE_ID o FACEBOOK_PAGE_ACCESS_TOKEN no configurados' };
  }

  const token = env.facebook.pageAccessToken;
  const pageId = env.facebook.pageId;

  const pageRes = await fetch(
    `${GRAPH_BASE}/${pageId}?fields=id,name&access_token=${encodeURIComponent(token)}`,
  );
  const pageData = await pageRes.json();
  if (!pageRes.ok) {
    return { ok: false, error: formatFacebookError(pageData) };
  }

  const debugRes = await fetch(
    `${GRAPH_BASE}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
  );
  const debugData = await debugRes.json();
  const scopes = debugData?.data?.scopes || [];

  const required = ['pages_manage_posts', 'pages_read_engagement'];
  const missing = required.filter((s) => !scopes.includes(s));

  return {
    ok: missing.length === 0,
    pageName: pageData.name,
    pageId: pageData.id,
    scopes,
    missing,
    error: missing.length
      ? `Faltan permisos: ${missing.join(', ')}`
      : null,
  };
}

function mimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

function appendImageToForm(form, { sourcePath, publicUrl }) {
  if (sourcePath && fs.existsSync(sourcePath)) {
    const buffer = fs.readFileSync(sourcePath);
    const filename = path.basename(sourcePath);
    const mime = mimeFromPath(sourcePath);
    form.append('source', new File([buffer], filename, { type: mime }));
    return 'binary';
  }
  if (publicUrl) {
    form.append('url', publicUrl);
    return 'url';
  }
  throw new Error('Imagen sin archivo local ni URL pública');
}

async function postPhotoForm(form, image, { caption, unpublished = false } = {}) {
  if (caption !== undefined) form.append('caption', caption);
  form.append('access_token', env.facebook.pageAccessToken);

  try {
    return await graphRequest(`/${env.facebook.pageId}/photos`, form);
  } catch (err) {
    if (image?.publicUrl) {
      logger.warn('Facebook: reintentando foto por URL pública', { url: image.publicUrl, error: err.message });
      const retry = new FormData();
      if (unpublished) retry.append('published', 'false');
      if (caption !== undefined) retry.append('caption', caption);
      retry.append('access_token', env.facebook.pageAccessToken);
      retry.append('url', image.publicUrl);
      return graphRequest(`/${env.facebook.pageId}/photos`, retry);
    }
    throw err;
  }
}

export async function uploadUnpublishedPhoto(image) {
  const form = new FormData();
  form.append('published', 'false');
  appendImageToForm(form, image);
  const data = await postPhotoForm(form, image, { unpublished: true });
  return data.id;
}

export async function publishPhotoWithCaption(message, image) {
  const form = new FormData();
  appendImageToForm(form, image);
  return postPhotoForm(form, image, { caption: message });
}

export async function publishFeedPost(message, mediaFbids = []) {
  const form = new FormData();
  form.append('message', message);
  form.append('access_token', env.facebook.pageAccessToken);
  mediaFbids.forEach((fbid, index) => {
    form.append(`attached_media[${index}]`, JSON.stringify({ media_fbid: fbid }));
  });
  const data = await graphRequest(`/${env.facebook.pageId}/feed`, form);
  return data;
}

export async function publishTextPost(message) {
  const form = new FormData();
  form.append('message', message);
  form.append('access_token', env.facebook.pageAccessToken);
  return graphRequest(`/${env.facebook.pageId}/feed`, form);
}

/**
 * Publica en la página de Facebook con 0, 1 o varias imágenes.
 * @param {{ message: string, images: Array<{ sourcePath?: string, publicUrl?: string }> }} payload
 */
export async function publishPagePost({ message, images = [] }) {
  if (!isFacebookConfigured()) {
    return { skipped: true, reason: 'not_configured' };
  }

  const validImages = images.filter((img) => img.sourcePath || img.publicUrl);
  if (!validImages.length) {
    logger.info('Facebook: publicación de texto sin imágenes');
    const data = await publishTextPost(message);
    return { postId: data.id, postUrl: `https://www.facebook.com/${data.id}` };
  }

  if (validImages.length === 1) {
    logger.info('Facebook: publicación con 1 foto');
    const data = await publishPhotoWithCaption(message, validImages[0]);
    const postId = data.post_id || data.id;
    return { postId, postUrl: `https://www.facebook.com/${postId}` };
  }

  logger.info('Facebook: publicación con múltiples fotos', { count: validImages.length });
  const mediaFbids = [];
  for (const image of validImages.slice(0, 10)) {
    const fbid = await uploadUnpublishedPhoto(image);
    mediaFbids.push(fbid);
  }
  const data = await publishFeedPost(message, mediaFbids);
  return { postId: data.id, postUrl: `https://www.facebook.com/${data.id}` };
}
