/**
 * Normaliza properties.images (array, JSON string o null desde MySQL/Sequelize).
 */
export function parsePropertyImages(images) {
  if (!images) return [];
  if (Array.isArray(images)) {
    return images.map((img) => (typeof img === 'string' ? { url: img } : img)).filter((i) => i?.url);
  }
  if (typeof images === 'string') {
    const trimmed = images.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsePropertyImages(parsed) : [];
    } catch {
      return [];
    }
  }
  return [];
}
