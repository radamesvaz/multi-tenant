/** Recommended dimensions for product gallery images (`image_urls`). Soft guidance only — backend does not enforce pixels. */

export const PRODUCT_IMAGE_IDEAL_WIDTH_PX = 1200;
export const PRODUCT_IMAGE_IDEAL_HEIGHT_PX = 1200;
export const PRODUCT_IMAGE_MIN_WIDTH_PX = 800;
export const PRODUCT_IMAGE_MIN_HEIGHT_PX = 800;

export function productImageUploadHintEs(): string {
  return (
    `Dimensiones ideales: ${PRODUCT_IMAGE_IDEAL_WIDTH_PX}×${PRODUCT_IMAGE_IDEAL_HEIGHT_PX}px (relación 1:1). ` +
    `Mínimo recomendado: ${PRODUCT_IMAGE_MIN_WIDTH_PX}×${PRODUCT_IMAGE_MIN_HEIGHT_PX}px. ` +
    `Centrá el producto: la galería se muestra en cuadrado.`
  );
}
