import { Business } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { buildPropertyFacebookMessage, resolveInstagramImageUrls } from './propertyFacebook.service.js';
import { isInstagramPublishConfigured, publishInstagramPost } from './instagramPublish.service.js';
import { getPropertyInstagramMeta } from '../utils/propertyInstagramMeta.js';

function toCaption(message) {
  const text = String(message || '').trim();
  if (text.length <= 2200) return text;
  return `${text.slice(0, 2197)}...`;
}

export async function publishPropertyToInstagram(property, { force = false } = {}) {
  if (!isInstagramPublishConfigured()) {
    return { skipped: true, reason: 'not_configured' };
  }

  if (getPropertyInstagramMeta(property) && !force) {
    const ig = getPropertyInstagramMeta(property);
    return {
      skipped: true,
      reason: 'already_published',
      instagram_media_id: ig.media_id,
      instagram_url: ig.permalink,
    };
  }

  const business = property.business
    || await Business.findByPk(property.business_id, { attributes: ['id', 'name', 'slug'] });

  const caption = toCaption(buildPropertyFacebookMessage(property, business));
  const imageUrls = resolveInstagramImageUrls(property.images);

  if (!imageUrls.length) {
    throw new Error('La propiedad no tiene fotos públicas para Instagram. Agrega al menos una imagen.');
  }

  logger.info('Instagram: publicando propiedad', {
    propertyId: property.id,
    imageCount: imageUrls.length,
    imageUrls,
  });

  const result = await publishInstagramPost({ caption, imageUrls });
  if (result.skipped) return result;

  logger.info('Propiedad publicada en Instagram', {
    propertyId: property.id,
    mediaId: result.mediaId,
  });

  return result;
}
