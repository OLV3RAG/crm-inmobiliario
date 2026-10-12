import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import { Property, Asesor, Business, User, UserRole } from '../models/index.js';
import { applyPropertyScope, assertAsesorInAdminTeam } from '../middlewares/scopeFilter.js';
import { generateId } from '../utils/uuid.js';
import { isFacebookConfigured } from '../services/facebook.service.js';
import { isInstagramPublishConfigured } from '../services/instagramPublish.service.js';
import { publishPropertyToFacebook } from '../services/propertyFacebook.service.js';
import { publishPropertyToInstagram } from '../services/propertyInstagram.service.js';
import { generatePropertyFlyer, saveFlyerOnProperty, getFlyerPublicMeta } from '../services/propertyFlyer.service.js';
import { publishPropertyFlyer } from '../services/propertyFlyerPublish.service.js';
import { buildPropertyFacebookFeatures } from '../utils/propertyFacebookMeta.js';
import { buildPropertyInstagramFeatures } from '../utils/propertyInstagramMeta.js';
import { resolveMexicoLocation } from '../data/mexicoLocations.js';
import { parsePropertyImages } from '../utils/propertyImages.js';
import { logger } from '../utils/logger.js';

const PROPERTY_TYPES = ['casa', 'depa', 'terreno', 'local', 'oficina', 'bodega', 'preventa'];
const STATUSES = ['disponible', 'reservada', 'vendida', 'pausada'];

function parseImages(images) {
  if (images === undefined || images === null) return undefined;
  if (Array.isArray(images)) {
    return images.map((item) => (typeof item === 'string' ? { url: item } : item)).filter((i) => i?.url);
  }
  if (typeof images === 'string') {
    const trimmed = images.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parseImages(parsed);
    } catch {
      /* URLs separadas por línea o coma */
    }
    return trimmed
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean)
      .map((url) => ({ url }));
  }
  return null;
}

function numOrNull(value, parser = parseFloat) {
  if (value === undefined || value === null || value === '') return null;
  const n = parser(value);
  return Number.isNaN(n) ? null : n;
}

function parseGeolocation(latitude, longitude) {
  const latRaw = latitude === undefined || latitude === null || latitude === '' ? null : parseFloat(latitude);
  const lngRaw = longitude === undefined || longitude === null || longitude === '' ? null : parseFloat(longitude);

  if (latRaw === null && lngRaw === null) {
    return { latitude: null, longitude: null };
  }
  if (latRaw === null || lngRaw === null || Number.isNaN(latRaw) || Number.isNaN(lngRaw)) {
    return { error: 'Indica latitud y longitud, o deja ambos vacíos' };
  }
  if (latRaw < -90 || latRaw > 90) {
    return { error: 'La latitud debe estar entre -90 y 90' };
  }
  if (lngRaw < -180 || lngRaw > 180) {
    return { error: 'La longitud debe estar entre -180 y 180' };
  }
  return { latitude: latRaw, longitude: lngRaw };
}

async function resolveGerenteId(req, businessId, adminIdBody) {
  if (req.user.role === 'admin') return req.user.id;
  if (!adminIdBody) return { error: 'Selecciona el gerente responsable' };
  const role = await UserRole.findOne({
    where: { user_id: adminIdBody, business_id: businessId, role: 'admin' },
  });
  if (!role) return { error: 'Gerente no válido para esta empresa' };
  return adminIdBody;
}


function normalizeLocation(state, municipality) {
  const location = resolveMexicoLocation(state, municipality);
  if (!location.state) {
    return { error: location.warnings[0] || 'Estado no reconocido' };
  }
  return {
    state: location.state,
    municipality: location.municipality || null,
    zone: location.state,
  };
}

const propertyIncludes = [
  { model: Asesor, as: 'asesor', attributes: ['id', 'name', 'phone', 'email'], required: false },
  { model: User, as: 'gerente', attributes: ['id', 'full_name', 'email'], required: false },
];

function canEditProperty(req, property) {
  const { role, businessId, asesorId } = req.user || {};
  if (role === 'owner') return true;
  if (role === 'admin') return property.business_id === businessId;
  if (role === 'asesor') return Boolean(asesorId) && property.asesor_id === asesorId;
  return false;
}

export async function requirePropertyEditor(req, res, next) {
  try {
    const where = applyPropertyScope({ id: req.params.id }, req);
    const property = await Property.findOne({ where });
    if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });
    if (!canEditProperty(req, property)) {
      return res.status(403).json({ error: 'Solo puedes editar tus propiedades' });
    }
    req.editableProperty = property;
    next();
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
}

const PUBLIC_CATALOG_ATTRS = [
  'id',
  'title',
  'property_type',
  'zone',
  'state',
  'municipality',
  'city',
  'address',
  'price',
  'currency',
  'bedrooms',
  'bathrooms',
  'm2_construccion',
  'm2_terreno',
  'parking',
  'description',
  'images',
  'latitude',
  'longitude',
  'created_at',
];

export async function listPublicCatalog(req, res) {
  const slug = (req.query.business || 'gareva-zenith').trim();
  const business = await Business.findOne({ where: { slug, status: 'active' } });
  if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

  const properties = await Property.findAll({
    where: { business_id: business.id, status: 'disponible' },
    attributes: PUBLIC_CATALOG_ATTRS,
    order: [['created_at', 'DESC']],
  });

  const data = properties.map((p) => {
    const plain = p.get({ plain: true });
    return { ...plain, images: parsePropertyImages(plain.images) };
  });

  res.json({ data, business: { name: business.name, slug: business.slug } });
}

export async function listProperties(req, res) {
  const where = applyPropertyScope({}, req);
  const {
    zone,
    state,
    municipality,
    city,
    property_type,
    status,
    asesor_id,
    admin_id,
    min_price,
    max_price,
    search,
  } = req.query;

  if (state) where.state = state;
  else if (zone) where.state = { [Op.like]: `%${zone}%` };
  if (municipality) where.municipality = municipality;
  if (city) where.city = { [Op.like]: `%${city}%` };
  if (property_type) where.property_type = property_type;
  if (status) where.status = status;
  if (asesor_id) where.asesor_id = asesor_id;
  if (admin_id && req.user.role === 'owner') where.admin_id = admin_id;
  if (min_price || max_price) {
    where.price = {};
    if (min_price) where.price[Op.gte] = parseFloat(min_price);
    if (max_price) where.price[Op.lte] = parseFloat(max_price);
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { title: { [Op.like]: term } },
      { state: { [Op.like]: term } },
      { municipality: { [Op.like]: term } },
      { city: { [Op.like]: term } },
      { zone: { [Op.like]: term } },
      { address: { [Op.like]: term } },
    ];
  }

  const properties = await Property.findAll({
    where,
    include: propertyIncludes,
    order: [['created_at', 'DESC']],
  });

  res.json({ data: properties });
}

export async function getProperty(req, res) {
  const where = applyPropertyScope({ id: req.params.id }, req);
  const property = await Property.findOne({
    where,
    include: [
      { model: Asesor, as: 'asesor', attributes: ['id', 'name', 'phone', 'email'], required: false },
      { model: User, as: 'gerente', attributes: ['id', 'full_name', 'email'], required: false },
    ],
  });
  if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });
  res.json({ data: property });
}

export async function createProperty(req, res) {
  const {
    title,
    property_type,
    zone,
    state,
    municipality,
    city,
    address,
    price,
    currency,
    bedrooms,
    bathrooms,
    m2_construccion,
    m2_terreno,
    parking,
    description,
    images,
    status,
    admin_id,
    latitude,
    longitude,
    business_id: bodyBusinessId,
  } = req.body;

  if (!title?.trim() || !property_type || price === undefined || price === null || price === '') {
    return res.status(400).json({ error: 'Título, tipo y precio son obligatorios' });
  }
  if (!PROPERTY_TYPES.includes(property_type)) {
    return res.status(400).json({ error: 'Tipo de propiedad no válido' });
  }

  let businessId = req.user.businessId;
  if (req.user.role === 'owner') {
    businessId = bodyBusinessId;
    if (!businessId) return res.status(400).json({ error: 'Selecciona la empresa' });
    const business = await Business.findByPk(businessId);
    if (!business) return res.status(400).json({ error: 'Empresa no válida' });
  } else if (!businessId) {
    return res.status(400).json({ error: 'Tu usuario no tiene empresa asignada' });
  }

  let gerenteId;
  let asesorId = null;
  if (req.user.role === 'asesor') {
    if (!req.user.asesorId) {
      return res.status(400).json({ error: 'Tu usuario no tiene perfil de asesor' });
    }
    const asesor = await Asesor.findByPk(req.user.asesorId);
    if (!asesor || asesor.business_id !== businessId) {
      return res.status(400).json({ error: 'Tu perfil de asesor no pertenece a esta empresa' });
    }
    gerenteId = asesor.admin_id || null;
    asesorId = asesor.id;
  } else {
    gerenteId = await resolveGerenteId(req, businessId, admin_id);
    if (gerenteId?.error) return res.status(400).json({ error: gerenteId.error });
    if (req.body.asesor_id) {
      const asesor = await Asesor.findOne({
        where: { id: req.body.asesor_id, business_id: businessId },
      });
      if (!asesor) return res.status(400).json({ error: 'Asesor no válido' });
      if (req.user.role === 'admin') {
        const allowed = await assertAsesorInAdminTeam(req, asesor.id);
        if (!allowed) return res.status(400).json({ error: 'Solo puedes asignar asesores de tu equipo' });
      }
      asesorId = asesor.id;
    }
  }

  const location = normalizeLocation(state || zone, municipality);
  if (location.error) return res.status(400).json({ error: location.error });

  const parsedImages = parseImages(images);
  const geo = parseGeolocation(latitude, longitude);
  if (geo.error) return res.status(400).json({ error: geo.error });

  const property = await Property.create({
    id: generateId(),
    business_id: businessId,
    admin_id: gerenteId,
    title: title.trim(),
    property_type,
    zone: location.zone,
    state: location.state,
    municipality: location.municipality,
    city: city?.trim() || null,
    address: address?.trim() || null,
    latitude: geo.latitude,
    longitude: geo.longitude,
    price: parseFloat(price),
    currency: currency || 'MXN',
    bedrooms: numOrNull(bedrooms, parseInt),
    bathrooms: numOrNull(bathrooms, parseFloat),
    m2_construccion: numOrNull(m2_construccion, parseFloat),
    m2_terreno: numOrNull(m2_terreno, parseFloat),
    parking: numOrNull(parking, parseInt),
    description: description?.trim() || null,
    images: parsedImages,
    status: STATUSES.includes(status) ? status : 'disponible',
    asesor_id: asesorId,
  });

  const fresh = await Property.findOne({ where: { id: property.id }, include: propertyIncludes });
  res.status(201).json({ data: fresh });
}

export async function updateProperty(req, res) {
  const where = applyPropertyScope({ id: req.params.id }, req);
  const property = await Property.findOne({ where });
  if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });
  if (!canEditProperty(req, property)) {
    return res.status(403).json({ error: 'Solo puedes editar tus propiedades' });
  }

  const {
    title,
    property_type,
    zone,
    state,
    municipality,
    city,
    address,
    price,
    currency,
    bedrooms,
    bathrooms,
    m2_construccion,
    m2_terreno,
    parking,
    description,
    images,
    status,
    admin_id,
    latitude,
    longitude,
  } = req.body;

  if (property_type && !PROPERTY_TYPES.includes(property_type)) {
    return res.status(400).json({ error: 'Tipo de propiedad no válido' });
  }
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Estatus no válido' });
  }

  let gerenteId = property.admin_id;
  if (req.user.role === 'owner' && admin_id !== undefined) {
    const resolved = await resolveGerenteId(req, property.business_id, admin_id);
    if (resolved?.error) return res.status(400).json({ error: resolved.error });
    gerenteId = resolved;
  }

  let locationFields = {};
  if (state !== undefined || municipality !== undefined || zone !== undefined) {
    const location = normalizeLocation(
      state !== undefined ? state : (zone !== undefined ? zone : property.state),
      municipality !== undefined ? municipality : property.municipality,
    );
    if (location.error) return res.status(400).json({ error: location.error });
    locationFields = {
      state: location.state,
      municipality: location.municipality,
      zone: location.zone,
    };
  }

  const parsedImages = images !== undefined ? parseImages(images) : undefined;
  const geoFields = {};
  if (latitude !== undefined || longitude !== undefined) {
    const geo = parseGeolocation(
      latitude !== undefined ? latitude : property.latitude,
      longitude !== undefined ? longitude : property.longitude,
    );
    if (geo.error) return res.status(400).json({ error: geo.error });
    geoFields.latitude = geo.latitude;
    geoFields.longitude = geo.longitude;
  }

  await property.update({
    title: title !== undefined ? title.trim() : property.title,
    property_type: property_type ?? property.property_type,
    ...locationFields,
    city: city !== undefined ? (city?.trim() || null) : property.city,
    address: address !== undefined ? (address?.trim() || null) : property.address,
    ...geoFields,
    price: price !== undefined ? parseFloat(price) : property.price,
    currency: currency ?? property.currency,
    bedrooms: bedrooms !== undefined ? numOrNull(bedrooms, parseInt) : property.bedrooms,
    bathrooms: bathrooms !== undefined ? numOrNull(bathrooms, parseFloat) : property.bathrooms,
    m2_construccion: m2_construccion !== undefined ? numOrNull(m2_construccion, parseFloat) : property.m2_construccion,
    m2_terreno: m2_terreno !== undefined ? numOrNull(m2_terreno, parseFloat) : property.m2_terreno,
    parking: parking !== undefined ? numOrNull(parking, parseInt) : property.parking,
    description: description !== undefined ? (description?.trim() || null) : property.description,
    images: parsedImages !== undefined ? parsedImages : property.images,
    status: status ?? property.status,
    admin_id: gerenteId,
  });

  const fresh = await Property.findOne({ where: { id: property.id }, include: propertyIncludes });
  res.json({ data: fresh });
}

const PROPERTY_PHOTO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export function getPublicPropertyPhoto(req, res) {
  const { propertyId, filename } = req.params;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename || '')) {
    return res.status(400).json({ error: 'Archivo inválido' });
  }
  if (!/^[a-fA-F0-9-]{16,}$/.test(propertyId || '')) {
    return res.status(400).json({ error: 'Propiedad inválida' });
  }

  const filePath = path.resolve(process.cwd(), 'uploads', 'properties', propertyId, filename);
  const root = path.resolve(process.cwd(), 'uploads', 'properties');
  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Foto no encontrada' });
  }

  const ext = path.extname(filename).toLowerCase();
  res.setHeader('Content-Type', PROPERTY_PHOTO_MIME[ext] || 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.sendFile(filePath);
}

export async function uploadPropertyPhotos(req, res) {
  const property = req.editableProperty;
  if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });

  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No se recibieron imágenes' });

  const uploaded = files.map((f) => ({
    url: `/uploads/properties/${req.params.id}/${f.filename}`,
    name: f.originalname,
  }));

  const existing = parsePropertyImages(property.images);
  await property.update({ images: [...existing, ...uploaded] });
  const fresh = await Property.findOne({ where: { id: property.id }, include: propertyIncludes });
  res.json({ data: fresh });
}

export async function deletePropertyPhoto(req, res) {
  const property = req.editableProperty;
  if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL de imagen requerida' });

  const existing = parsePropertyImages(property.images);
  const next = existing.filter((img) => img.url !== url);
  await property.update({ images: next.length ? next : null });
  const fresh = await Property.findOne({ where: { id: property.id }, include: propertyIncludes });

  if (url.startsWith('/uploads/properties/')) {
    const filePath = path.join(process.cwd(), url.replace(/^\//, '').replace(/\//g, path.sep));
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }
  }

  res.json({ data: fresh });
}

export async function deleteProperty(req, res) {
  const where = applyPropertyScope({ id: req.params.id }, req);
  const property = await Property.findOne({ where });
  if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });

  const uploadDir = path.join(process.cwd(), 'uploads', 'properties', req.params.id);
  if (fs.existsSync(uploadDir)) {
    try { fs.rmSync(uploadDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  await property.destroy();
  res.json({ success: true });
}

export async function getFacebookStatus(req, res) {
  res.json({
    configured: isFacebookConfigured(),
    instagram: isInstagramPublishConfigured(),
  });
}

export async function publishPropertyFacebook(req, res) {
  const where = applyPropertyScope({ id: req.params.id }, req);
  const property = await Property.findOne({
    where,
    include: [
      { model: Business, attributes: ['id', 'name', 'slug'] },
      { model: Asesor, as: 'asesor', attributes: ['id', 'name', 'phone'], required: false },
    ],
  });
  if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });

  const force = req.body?.force === true;

  try {
    await property.reload({
      include: [
        { model: Business, attributes: ['id', 'name', 'slug'] },
        { model: Asesor, as: 'asesor', attributes: ['id', 'name', 'phone'], required: false },
      ],
    });

    const result = await publishPropertyToFacebook(property, { force });
    if (result.skipped) {
      return res.json(result);
    }

    await property.update({
      features: buildPropertyFacebookFeatures(property.features, {
        postId: result.postId,
        postUrl: result.postUrl,
      }),
    });

    res.json({
      success: true,
      facebook_post_id: result.postId,
      facebook_url: result.postUrl,
    });
  } catch (err) {
    logger.error('Error al publicar propiedad en Facebook', {
      propertyId: property.id,
      error: err.message,
    });
    res.status(502).json({ error: err.message || 'No se pudo publicar en Facebook' });
  }
}

export async function publishPropertyInstagram(req, res) {
  const where = applyPropertyScope({ id: req.params.id }, req);
  const property = await Property.findOne({
    where,
    include: [
      { model: Business, attributes: ['id', 'name', 'slug'] },
      { model: Asesor, as: 'asesor', attributes: ['id', 'name', 'phone'], required: false },
    ],
  });
  if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });

  const force = req.body?.force === true;

  try {
    await property.reload({
      include: [
        { model: Business, attributes: ['id', 'name', 'slug'] },
        { model: Asesor, as: 'asesor', attributes: ['id', 'name', 'phone'], required: false },
      ],
    });

    const result = await publishPropertyToInstagram(property, { force });
    if (result.skipped) {
      return res.json(result);
    }

    await property.update({
      features: buildPropertyInstagramFeatures(property.features, {
        mediaId: result.mediaId,
        permalink: result.permalink,
      }),
    });

    res.json({
      success: true,
      instagram_media_id: result.mediaId,
      instagram_url: result.permalink,
      image_count: result.imageCount,
      warning: result.warning || null,
    });
  } catch (err) {
    logger.error('Error al publicar propiedad en Instagram', {
      propertyId: property.id,
      error: err.message,
    });
    res.status(502).json({ error: err.message || 'No se pudo publicar en Instagram' });
  }
}

async function loadPropertyForPublish(req) {
  const where = applyPropertyScope({ id: req.params.id }, req);
  return Property.findOne({
    where,
    include: [
      { model: Business, attributes: ['id', 'name', 'slug'] },
      { model: Asesor, as: 'asesor', attributes: ['id', 'name', 'phone'], required: false },
    ],
  });
}

export async function generatePropertyFlyerEndpoint(req, res) {
  const property = await loadPropertyForPublish(req);
  if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });

  try {
    const flyerResult = await generatePropertyFlyer(property);
    const flyer = await saveFlyerOnProperty(property, flyerResult);
    res.json({ success: true, flyer });
  } catch (err) {
    logger.error('Error al generar flyer', { propertyId: property.id, error: err.message });
    res.status(400).json({ error: err.message || 'No se pudo generar el flyer' });
  }
}

export async function getPropertyFlyer(req, res) {
  const property = await loadPropertyForPublish(req);
  if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });
  const flyer = getFlyerPublicMeta(property);
  if (!flyer) return res.status(404).json({ error: 'Esta propiedad aún no tiene flyer' });
  res.json({ flyer });
}

export async function publishPropertyFlyerEndpoint(req, res) {
  const property = await loadPropertyForPublish(req);
  if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });

  const facebook = req.body?.facebook !== false;
  const instagram = req.body?.instagram !== false;
  const force = req.body?.force === true;

  if (!facebook && !instagram) {
    return res.status(400).json({ error: 'Indica facebook y/o instagram para publicar el flyer' });
  }

  try {
    const result = await publishPropertyFlyer(property, { facebook, instagram, force });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('Error al publicar flyer', { propertyId: property.id, error: err.message });
    res.status(502).json({ error: err.message || 'No se pudo publicar el flyer' });
  }
}
