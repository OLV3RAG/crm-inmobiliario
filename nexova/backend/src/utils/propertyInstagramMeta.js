export function getPropertyInstagramMeta(property) {
  const ig = property?.features?.instagram;
  if (!ig?.media_id) return null;
  return ig;
}

export function buildPropertyInstagramFeatures(existingFeatures, { mediaId, permalink }) {
  return {
    ...(existingFeatures && typeof existingFeatures === 'object' ? existingFeatures : {}),
    instagram: {
      media_id: mediaId,
      permalink: permalink || null,
      published_at: new Date().toISOString(),
    },
  };
}
