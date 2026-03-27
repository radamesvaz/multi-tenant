/**
 * Valores de UI alineados con `markdowns/THUMBNAIL_SPECIFICATIONS.md`.
 */
export const PRODUCT_THUMBNAIL_IDEAL_WIDTH_PX = 800;
export const PRODUCT_THUMBNAIL_IDEAL_HEIGHT_PX = 600;
export const PRODUCT_THUMBNAIL_MIN_WIDTH_PX = 400;
export const PRODUCT_THUMBNAIL_MIN_HEIGHT_PX = 300;

/** Texto breve junto al control de subida del thumbnail en el admin. */
export function productThumbnailUploadHintEs(): string {
  return (
    `Dimensiones ideales: ${PRODUCT_THUMBNAIL_IDEAL_WIDTH_PX}×${PRODUCT_THUMBNAIL_IDEAL_HEIGHT_PX}px (relación 4:3). ` +
    `Mínimo recomendado: ${PRODUCT_THUMBNAIL_MIN_WIDTH_PX}×${PRODUCT_THUMBNAIL_MIN_HEIGHT_PX}px.`
  );
}
