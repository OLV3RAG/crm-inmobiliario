import multer from 'multer';
import path from 'path';
import fs from 'fs';

const baseDir = path.join(process.cwd(), 'uploads', 'properties');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(baseDir, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

export const propertyPhotosUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter(req, file, cb) {
    if (file.mimetype?.startsWith('image/')) return cb(null, true);
    cb(new Error('Solo se permiten archivos de imagen'));
  },
});

const CHAT_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const CHAT_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx']);

const chatStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(process.cwd(), 'uploads', 'chat', req.params.id || 'temp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '';
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

export const chatAttachmentUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 16 * 1024 * 1024, files: 5 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (CHAT_MIMES.has(file.mimetype) || CHAT_EXTS.has(ext)) return cb(null, true);
    cb(new Error('Tipo de archivo no permitido. Usa imagen, PDF, Word o Excel.'));
  },
});

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function isAllowedChatFile(filename, mime) {
  const ext = path.extname(filename || '').toLowerCase();
  return CHAT_MIMES.has(mime) || CHAT_EXTS.has(ext);
}

export function saveChatAttachmentsFromJson(conversationId, attachments = []) {
  if (!Array.isArray(attachments) || !attachments.length) return [];

  const dir = path.join(process.cwd(), 'uploads', 'chat', conversationId);
  fs.mkdirSync(dir, { recursive: true });

  return attachments.slice(0, 5).map((item, index) => {
    const filename = String(item.filename || `archivo-${index + 1}`).replace(/[/\\]/g, '');
    const ext = path.extname(filename).toLowerCase() || '';
    const contentType = item.contentType || MIME_BY_EXT[ext] || 'application/octet-stream';
    if (!isAllowedChatFile(filename, contentType)) {
      throw new Error('Tipo de archivo no permitido. Usa imagen, PDF, Word o Excel.');
    }

    const raw = String(item.data || '');
    const base64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw;
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) throw new Error(`El archivo ${filename} está vacío`);
    if (buffer.length > 16 * 1024 * 1024) throw new Error(`${filename} supera 16 MB`);

    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    fs.writeFileSync(path.join(dir, storedName), buffer);

    const relativeUrl = `/uploads/chat/${conversationId}/${storedName}`;
    return {
      url: relativeUrl,
      contentType,
      filename,
    };
  });
}
