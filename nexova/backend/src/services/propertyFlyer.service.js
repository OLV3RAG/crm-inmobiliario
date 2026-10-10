import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { parsePropertyImages } from '../utils/propertyImages.js';
import { generateFlyerCopy } from './claude.service.js';
import { buildPropertyFlyerFeatures } from '../utils/propertyFlyerMeta.js';

const W = 1080;
const H = 1620;
const NAVY = '#1B2A4A';
const YELLOW = '#E8B923';
const GALLERY_LABELS = [
  'Sala / Estancia',
  'Cocina',
  'Recámara',
  'Terraza / Exterior',
  'Pasillo / Acceso',
];

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatPrice(price, currency = 'MXN') {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(price) || 0);
  } catch {
    return `$${Number(price || 0).toLocaleString('es-MX')}`;
  }
}

function formatWhatsApp(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('52')) {
    return `${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  return digits || '—';
}

function whatsappDigits() {
  return String(env.facebook.contactWhatsapp || '').replace(/\D/g, '');
}

function resolveLocalImagePath(url) {
  if (!url) return null;
  const raw = String(url);
  const match = raw.match(/\/uploads\/.+$/);
  if (!match && !raw.startsWith('/uploads/')) return null;
  const rel = (match ? match[0] : raw).split('?')[0];
  const filePath = path.resolve(process.cwd(), rel.replace(/^\//, '').replace(/\//g, path.sep));
  const root = path.resolve(process.cwd(), 'uploads');
  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) return null;
  return filePath;
}

async function loadImageBuffer(url) {
  const local = resolveLocalImagePath(url);
  if (local) return fs.promises.readFile(local);
  if (/^https?:\/\//i.test(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo descargar imagen: ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`Imagen no accesible: ${url}`);
}

async function toCoverJpeg(buffer, width, height) {
  return sharp(buffer)
    .rotate()
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 88 })
    .toBuffer();
}

function wrapText(text, maxChars, maxLines = 2) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  return lines.slice(0, maxLines);
}

function buildOtros(property) {
  const extras = [];
  if (property.description) {
    const lower = property.description.toLowerCase();
    if (/terraza|balc[oó]n/.test(lower)) extras.push('Terraza');
    if (/cocina/.test(lower)) extras.push('Cocina equipada');
    if (/lavado|laundry/.test(lower)) extras.push('Área de lavado');
    if (/seguridad|vigilancia|plusval/.test(lower)) extras.push('Seguridad / plusvalía');
  }
  const features = property.features;
  if (Array.isArray(features?.amenities)) {
    extras.push(...features.amenities.slice(0, 4).map(String));
  }
  const unique = [...new Set(extras)].slice(0, 4);
  return unique.length ? unique : ['Acabados de calidad', 'Excelente ubicación'];
}

function buildLocationLine(property) {
  return [property.address, property.city || property.municipality, property.state]
    .filter(Boolean)
    .join(', ') || 'Consultar ubicación';
}

function buildOverlaySvg({
  headline,
  subtitle,
  priceLabel,
  location,
  phoneLabel,
  chars,
  otros,
  galleryLabels,
  qrDataUri,
}) {
  const headlineLines = wrapText(headline, 18, 2);
  const subtitleLines = wrapText(subtitle, 42, 2);
  const locationLines = wrapText(location, 48, 2);

  const charRows = chars.map((c, i) => {
    const y = 760 + i * 58;
    return `
      <circle cx="620" cy="${y}" r="18" fill="${NAVY}"/>
      <text x="620" y="${y + 6}" text-anchor="middle" fill="#fff" font-size="14" font-family="Arial, Helvetica, sans-serif">${escapeXml(c.icon)}</text>
      <text x="655" y="${y + 6}" fill="${NAVY}" font-size="22" font-family="Arial, Helvetica, sans-serif" font-weight="700">${escapeXml(c.label)}</text>
    `;
  }).join('');

  const otrosLines = otros.map((o, i) => `
    <text x="655" y="${1040 + i * 26}" fill="${NAVY}" font-size="18" font-family="Arial, Helvetica, sans-serif">• ${escapeXml(o)}</text>
  `).join('');

  const galleryLabelSvg = galleryLabels.map((label, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 48 + col * 250;
    const y = 640 + row * 168;
    return `
      <rect x="${x}" y="${y + 118}" width="140" height="28" rx="4" fill="rgba(27,42,74,0.85)"/>
      <text x="${x + 8}" y="${y + 137}" fill="#fff" font-size="13" font-family="Arial, Helvetica, sans-serif">${escapeXml(label)}</text>
    `;
  }).join('');

  const headlineSvg = headlineLines.map((line, i) => `
    <text x="48" y="${118 + i * 52}" fill="#fff" font-size="46" font-family="Arial Black, Arial, sans-serif" font-weight="900">${escapeXml(line)}</text>
  `).join('');

  const subtitleSvg = subtitleLines.map((line, i) => `
    <text x="48" y="${230 + i * 28}" fill="#fff" font-size="20" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>
  `).join('');

  const locationSvg = locationLines.map((line, i) => `
    <text x="90" y="${1488 + i * 22}" fill="#fff" font-size="16" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>
  `).join('');

  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(10,18,36,0.55)"/>
      <stop offset="45%" stop-color="rgba(10,18,36,0.12)"/>
      <stop offset="100%" stop-color="rgba(10,18,36,0.55)"/>
    </linearGradient>
  </defs>

  <!-- Hero fade for text readability (transparent elsewhere) -->
  <rect x="0" y="0" width="${W}" height="560" fill="url(#heroFade)"/>

  <rect x="48" y="40" width="150" height="42" rx="4" fill="${YELLOW}"/>
  <text x="123" y="69" text-anchor="middle" fill="#111" font-size="22" font-family="Arial Black, Arial, sans-serif" font-weight="900">EN VENTA</text>

  ${headlineSvg}
  ${subtitleSvg}
  <rect x="48" y="${230 + subtitleLines.length * 28 + 8}" width="90" height="6" rx="3" fill="${YELLOW}"/>

  <!-- Characteristics panel -->
  <rect x="560" y="620" width="472" height="620" rx="8" fill="#EEF1F5"/>
  <text x="590" y="670" fill="${NAVY}" font-size="28" font-family="Arial Black, Arial, sans-serif" font-weight="900">CARACTERÍSTICAS</text>
  ${charRows}
  <text x="655" y="1010" fill="${NAVY}" font-size="20" font-family="Arial, Helvetica, sans-serif" font-weight="700">Otros:</text>
  ${otrosLines}

  <!-- Price -->
  <rect x="560" y="1260" width="472" height="78" rx="10" fill="${YELLOW}"/>
  <circle cx="610" cy="1299" r="22" fill="${NAVY}"/>
  <text x="610" y="1306" text-anchor="middle" fill="#fff" font-size="22" font-family="Arial, sans-serif" font-weight="700">$</text>
  <text x="650" y="1308" fill="${NAVY}" font-size="26" font-family="Arial Black, Arial, sans-serif" font-weight="900">PRECIO: ${escapeXml(priceLabel)}</text>

  <!-- Gallery labels -->
  ${galleryLabelSvg}

  <!-- Footer -->
  <path d="M0 1420 Q540 1380 1080 1420 L1080 1620 L0 1620 Z" fill="${NAVY}"/>
  <text x="90" y="1468" fill="#fff" font-size="16" font-family="Arial, sans-serif" font-weight="700">Ubicación:</text>
  ${locationSvg}

  <text x="90" y="1555" fill="#fff" font-size="16" font-family="Arial, sans-serif" font-weight="700">¡Contáctanos!</text>
  <text x="90" y="1580" fill="#fff" font-size="18" font-family="Arial, sans-serif">Tel. / WhatsApp ${escapeXml(phoneLabel)}</text>

  <image href="${qrDataUri}" x="880" y="1455" width="120" height="120"/>
  <text x="940" y="1595" text-anchor="middle" fill="#fff" font-size="11" font-family="Arial, sans-serif">Escanea para más info</text>

  <text x="540" y="1605" text-anchor="middle" fill="#D6DEEA" font-size="14" font-family="Arial, sans-serif" letter-spacing="2">TU INVERSIÓN, NUESTRO COMPROMISO</text>
</svg>`;
}

/**
 * Genera flyer PNG al estilo plantilla y lo guarda en uploads.
 */
export async function generatePropertyFlyer(property) {
  const images = parsePropertyImages(property.images);
  if (!images.length) {
    throw new Error('Agrega al menos una foto para generar el flyer.');
  }

  const imageUrls = images.map((img) => img.url).filter(Boolean);
  const copy = await generateFlyerCopy(property);
  const phoneDigits = whatsappDigits();
  const phoneLabel = formatWhatsApp(phoneDigits);
  const waUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hola, me interesa: ${property.title || 'esta propiedad'}`)}`
    : `${env.publicUrl}/catalogo`;

  const qrPng = await QRCode.toBuffer(waUrl, {
    type: 'png',
    width: 240,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  const qrDataUri = `data:image/png;base64,${qrPng.toString('base64')}`;

  const heroBuf = await toCoverJpeg(await loadImageBuffer(imageUrls[0]), W, 560);
  const galleryUrls = imageUrls.slice(1, 6);
  const galleryBuffers = [];
  for (const url of galleryUrls) {
    try {
      galleryBuffers.push(await toCoverJpeg(await loadImageBuffer(url), 230, 150));
    } catch (err) {
      logger.warn('Flyer: foto de galería omitida', { url, err: err.message });
    }
  }

  while (galleryBuffers.length < 5 && imageUrls[0]) {
    // fill remaining slots with hero crop variants if few photos
    if (galleryBuffers.length >= Math.max(1, galleryUrls.length) && galleryBuffers.length >= 3) break;
    try {
      galleryBuffers.push(await toCoverJpeg(await loadImageBuffer(imageUrls[galleryBuffers.length % imageUrls.length]), 230, 150));
    } catch {
      break;
    }
  }

  const chars = [
    { icon: 'T', label: `Terreno: ${property.m2_terreno != null ? `${property.m2_terreno} m²` : '—'}` },
    { icon: 'C', label: `Construcción: ${property.m2_construccion != null ? `${property.m2_construccion} m²` : '—'}` },
    { icon: 'R', label: `Recámaras: ${property.bedrooms ?? '—'}` },
    { icon: 'B', label: `Baños: ${property.bathrooms ?? '—'}` },
    { icon: 'E', label: `Estacionamientos: ${property.parking ?? '—'}` },
  ];

  const overlaySvg = buildOverlaySvg({
    headline: copy.headline,
    subtitle: copy.subtitle,
    priceLabel: formatPrice(property.price, property.currency || 'MXN'),
    location: buildLocationLine(property),
    phoneLabel,
    chars,
    otros: buildOtros(property),
    galleryLabels: GALLERY_LABELS.slice(0, galleryBuffers.length),
    qrDataUri,
  });

  const composites = [
    { input: heroBuf, top: 0, left: 0 },
  ];

  galleryBuffers.forEach((buf, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    composites.push({
      input: buf,
      top: 640 + row * 168,
      left: 48 + col * 250,
    });
  });

  // CTA tile in last gallery slot if we have fewer than 6 gallery images conceptually
  // Position: row 2 col 1 (third row second column) = index 5 area
  const ctaSvg = Buffer.from(`
    <svg width="230" height="150" xmlns="http://www.w3.org/2000/svg">
      <rect width="230" height="150" rx="6" fill="${NAVY}"/>
      <text x="115" y="68" text-anchor="middle" fill="#fff" font-size="36" font-family="Arial, sans-serif">♥</text>
      <text x="115" y="100" text-anchor="middle" fill="#fff" font-size="16" font-family="Arial, sans-serif" font-weight="700">Tu nuevo hogar</text>
      <text x="115" y="122" text-anchor="middle" fill="#fff" font-size="16" font-family="Arial, sans-serif" font-weight="700">te espera</text>
      <rect x="70" y="132" width="90" height="4" rx="2" fill="${YELLOW}"/>
    </svg>
  `);
  const ctaPng = await sharp(ctaSvg).png().toBuffer();
  composites.push({ input: ctaPng, top: 640 + 2 * 168, left: 48 + 1 * 250 });

  const overlayPng = await sharp(Buffer.from(overlaySvg)).png().toBuffer();
  composites.push({ input: overlayPng, top: 0, left: 0 });

  const outDir = path.join(process.cwd(), 'uploads', 'properties', property.id);
  fs.mkdirSync(outDir, { recursive: true });
  const filename = `flyer-${Date.now()}.png`;
  const outPath = path.join(outDir, filename);
  const relativeUrl = `/uploads/properties/${property.id}/${filename}`;

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: 244, g: 246, b: 248 },
    },
  })
    .composite(composites)
    .png({ quality: 90 })
    .toFile(outPath);

  const publicUrl = `${env.publicUrl.replace(/\/$/, '').replace(/^http:/i, 'https:')}/api/public/property-photos/${property.id}/${encodeURIComponent(filename)}`;

  logger.info('Flyer generado', { propertyId: property.id, path: relativeUrl });

  return {
    url: relativeUrl,
    publicUrl,
    localPath: outPath,
    headline: copy.headline,
    subtitle: copy.subtitle,
    generated_at: new Date().toISOString(),
  };
}

export async function saveFlyerOnProperty(property, flyerResult) {
  const features = buildPropertyFlyerFeatures(property.features, {
    url: flyerResult.url,
    public_url: flyerResult.publicUrl,
    headline: flyerResult.headline,
    subtitle: flyerResult.subtitle,
    generated_at: flyerResult.generated_at,
  });
  await property.update({ features });
  await property.reload();
  return getFlyerPublicMeta(property);
}

export function getFlyerPublicMeta(property) {
  const flyer = property?.features?.flyer;
  if (!flyer?.url) return null;
  const match = String(flyer.url).match(/\/uploads\/properties\/([^/]+)\/([^/?#]+)/);
  const publicUrl = match
    ? `${env.publicUrl.replace(/\/$/, '').replace(/^http:/i, 'https:')}/api/public/property-photos/${match[1]}/${encodeURIComponent(match[2])}`
    : flyer.public_url || null;
  return {
    url: flyer.url,
    public_url: publicUrl,
    headline: flyer.headline,
    subtitle: flyer.subtitle,
    generated_at: flyer.generated_at,
    facebook: flyer.facebook || null,
    instagram: flyer.instagram || null,
  };
}
