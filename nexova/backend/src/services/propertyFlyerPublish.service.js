import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';
import { buildPropertyFacebookMessage } from './propertyFacebook.service.js';
import { isFacebookConfigured, publishPagePost } from './facebook.service.js';
import { isInstagramPublishConfigured, publishInstagramPost } from './instagramPublish.service.js';
import { getFlyerPublicMeta } from './propertyFlyer.service.js';
import { buildPropertyFlyerFeatures } from '../utils/propertyFlyerMeta.js';
import { Business } from '../models/index.js';

function resolveFlyerLocalPath(flyerUrl) {
  const match = String(flyerUrl || '').match(/\/uploads\/properties\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  const filePath = path.resolve(process.cwd(), 'uploads', 'properties', match[1], match[2]);
  const root = path.resolve(process.cwd(), 'uploads', 'properties');
  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) return null;
  return filePath;
}

/**
 * Publica el flyer guardado (una sola imagen) en Facebook y/o Instagram.
 */
export async function publishPropertyFlyer(property, { facebook = true, instagram = true, force = false } = {}) {
  const flyer = getFlyerPublicMeta(property);
  if (!flyer?.url) {
    throw new Error('No hay flyer guardado. Genera el flyer primero.');
  }

  const localPath = resolveFlyerLocalPath(flyer.url);
  if (!localPath) {
    throw new Error('El archivo del flyer no está en el servidor. Vuelve a generarlo.');
  }

  const business = property.business
    || await Business.findByPk(property.business_id, { attributes: ['id', 'name', 'slug'] });
  const caption = [
    flyer.headline,
    flyer.subtitle,
    '',
    buildPropertyFacebookMessage(property, business),
  ].filter((line) => line != null).join('\n');

  const result = { flyer };
  const featuresPatch = { ...flyer };

  if (facebook) {
    if (!isFacebookConfigured()) {
      result.facebook = { skipped: true, reason: 'not_configured' };
    } else if (flyer.facebook?.post_id && !force) {
      result.facebook = { skipped: true, reason: 'already_published', ...flyer.facebook };
    } else {
      const fb = await publishPagePost({
        message: caption,
        images: [{ sourcePath: localPath, publicUrl: flyer.public_url }],
      });
      featuresPatch.facebook = {
        post_id: fb.postId,
        post_url: fb.postUrl,
        published_at: new Date().toISOString(),
      };
      result.facebook = { success: true, ...featuresPatch.facebook };
      logger.info('Flyer publicado en Facebook', { propertyId: property.id, postId: fb.postId });
    }
  }

  if (instagram) {
    if (!isInstagramPublishConfigured()) {
      result.instagram = { skipped: true, reason: 'not_configured' };
    } else if (flyer.instagram?.media_id && !force) {
      result.instagram = { skipped: true, reason: 'already_published', ...flyer.instagram };
    } else {
      if (!flyer.public_url || !/^https:\/\//i.test(flyer.public_url)) {
        throw new Error('Instagram necesita URL pública HTTPS del flyer (PUBLIC_URL).');
      }
      const ig = await publishInstagramPost({
        caption: caption.slice(0, 2200),
        imageUrls: [flyer.public_url],
      });
      featuresPatch.instagram = {
        media_id: ig.mediaId,
        permalink: ig.permalink,
        published_at: new Date().toISOString(),
      };
      result.instagram = { success: true, ...featuresPatch.instagram };
      logger.info('Flyer publicado en Instagram', { propertyId: property.id, mediaId: ig.mediaId });
    }
  }

  await property.update({
    features: buildPropertyFlyerFeatures(property.features, featuresPatch),
  });
  await property.reload();
  result.flyer = getFlyerPublicMeta(property);
  return result;
}
