import path from 'path';
import { Business } from '../models/index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { parsePropertyImages } from '../utils/propertyImages.js';
import { isFacebookConfigured, publishPagePost } from './facebook.service.js';
import { getPropertyFacebookMeta } from '../utils/propertyFacebookMeta.js';

const TYPE_LABELS = {
  casa: 'Casa',
  depa: 'Departamento',
  terreno: 'Terreno',
  local: 'Local comercial',
  oficina: 'Oficina',
  bodega: 'Bodega',
  preventa: 'Preventa',
};

function formatPrice(price, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(price));
}

function lineIf(label, value) {
  if (value === null || value === undefined || value === '') return null;
  return `${label}: ${value}`;
}

function buildWhatsAppUrl(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export function buildPropertyFacebookMessage(property, business) {
  const lines = [
    `🏠 ${property.title}`,
    lineIf('Tipo', TYPE_LABELS[property.property_type] || property.property_type),
    lineIf('Estado', property.state || property.zone),
    lineIf('Municipio', property.municipality),
    lineIf('Ciudad', property.city),
    lineIf('Precio', formatPrice(property.price, property.currency || 'MXN')),
    lineIf('Recámaras', property.bedrooms),
    lineIf('Baños', property.bathrooms),
    lineIf('m² construcción', property.m2_construccion),
    lineIf('m² terreno', property.m2_terreno),
    lineIf('Estacionamientos', property.parking),
    lineIf('Dirección', property.address),
  ].filter(Boolean);

  if (property.description?.trim()) {
    lines.push('', property.description.trim());
  }

  const whatsappUrl = buildWhatsAppUrl(env.facebook.contactWhatsapp);
  if (whatsappUrl) {
    lines.push('', `📱 Contáctanos por WhatsApp: ${whatsappUrl}`);
  }
  if (business?.name) {
    lines.push(`🏢 ${business.name}`);
  }

  return lines.join('\n');
}

function isPublicHttpUrl(url) {
  return /^https?:\/\//i.test(url);
}

function publicBaseUrl() {
  return env.publicUrl.replace(/\/$/, '');
}

function httpsPublicBaseUrl() {
  return publicBaseUrl().replace(/^http:/i, 'https:');
}

function propertyPhotoMatch(url) {
  return String(url || '').replace(/\\/g, '/').match(/\/uploads\/properties\/([^/]+)\/([^/?#]+)/);
}

export function resolveImageSources(images) {
  const list = parsePropertyImages(images);
  const publicBase = publicBaseUrl();

  return list
    .map((item) => {
      const url = typeof item === 'string' ? item : item?.url;
      if (!url) return null;
      const normalized = url.startsWith('uploads/') ? `/${url}` : url;

      if (normalized.includes('/uploads/')) {
        const rel = normalized.startsWith('http')
          ? (normalized.match(/\/uploads\/.+$/) || [normalized])[0].split('?')[0]
          : normalized.split('?')[0];
        const localPath = path.join(process.cwd(), rel.replace(/^\//, '').replace(/\//g, path.sep));
        const match = propertyPhotoMatch(rel);
        const publicUrl = match
          ? `${httpsPublicBaseUrl()}/api/public/property-photos/${match[1]}/${encodeURIComponent(match[2])}`
          : `${publicBase}${rel.startsWith('/') ? rel : `/${rel}`}`;
        return { sourcePath: localPath, publicUrl };
      }

      if (isPublicHttpUrl(url)) {
        return { publicUrl: url.replace(/^http:/i, 'https:') };
      }

      return null;
    })
    .filter(Boolean);
}

export function resolveInstagramImageUrls(images) {
  return resolveImageSources(images)
    .map((img) => img.publicUrl)
    .filter((url) => /^https:\/\//i.test(url))
    .slice(0, 10);
}

export async function publishPropertyToFacebook(property, { force = false } = {}) {
  if (!isFacebookConfigured()) {
    return { skipped: true, reason: 'not_configured' };
  }

  if (getPropertyFacebookMeta(property) && !force) {
    const fb = getPropertyFacebookMeta(property);
    return {
      skipped: true,
      reason: 'already_published',
      facebook_post_id: fb.post_id,
    };
  }

  const business = property.business
    || await Business.findByPk(property.business_id, { attributes: ['id', 'name', 'slug'] });

  const message = buildPropertyFacebookMessage(property, business);
  const images = resolveImageSources(property.images);

  if (!images.length) {
    logger.warn('Facebook: propiedad sin imágenes resueltas', {
      propertyId: property.id,
      rawImagesType: typeof property.images,
    });
    throw new Error('La propiedad no tiene fotos para publicar en Facebook. Agrega al menos una imagen.');
  }

  logger.info('Facebook: publicando propiedad con fotos', {
    propertyId: property.id,
    imageCount: images.length,
  });

  const result = await publishPagePost({ message, images });
  if (result.skipped) return result;

  logger.info('Propiedad publicada en Facebook', {
    propertyId: property.id,
    postId: result.postId,
  });

  return result;
}
