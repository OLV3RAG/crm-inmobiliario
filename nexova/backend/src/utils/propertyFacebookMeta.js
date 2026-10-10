/**
 * Metadatos de publicación en Facebook (guardados en properties.features.facebook).
 */
export function getPropertyFacebookMeta(property) {
  const fb = property?.features?.facebook;
  if (!fb?.post_id) return null;
  return fb;
}

export function buildPropertyFacebookFeatures(existingFeatures, { postId, postUrl }) {
  return {
    ...(existingFeatures && typeof existingFeatures === 'object' ? existingFeatures : {}),
    facebook: {
      post_id: postId,
      post_url: postUrl || null,
      published_at: new Date().toISOString(),
    },
  };
}
