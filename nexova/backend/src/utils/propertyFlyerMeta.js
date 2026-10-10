export function getPropertyFlyerMeta(property) {
  const flyer = property?.features?.flyer;
  if (!flyer?.url) return null;
  return flyer;
}

export function buildPropertyFlyerFeatures(existingFeatures, flyerMeta) {
  return {
    ...(existingFeatures && typeof existingFeatures === 'object' ? existingFeatures : {}),
    flyer: {
      ...(existingFeatures?.flyer && typeof existingFeatures.flyer === 'object' ? existingFeatures.flyer : {}),
      ...flyerMeta,
    },
  };
}
