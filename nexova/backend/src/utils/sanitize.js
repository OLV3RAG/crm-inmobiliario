import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export function sanitizeInput(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return purify.sanitize(value, { ALLOWED_TAGS: [] });
  if (Array.isArray(value)) return value.map(sanitizeInput);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeInput(v);
    }
    return out;
  }
  return value;
}
