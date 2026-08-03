/**
 * Tenant logo display slots and upload guidance.
 * Soft guidance only — layout always uses a fixed CSS bounding box; any aspect
 * ratio is scaled with `object-fit: contain` (horizontal, vertical, or circular).
 */

/** Public storefront header — desktop reserved slot. */
export const LOGO_DISPLAY_DESKTOP_WIDTH_PX = 200;
export const LOGO_DISPLAY_DESKTOP_HEIGHT_PX = 48;

/** Public storefront header — mobile reserved slot. */
export const LOGO_DISPLAY_MOBILE_WIDTH_PX = 140;
export const LOGO_DISPLAY_MOBILE_HEIGHT_PX = 44;

/** Admin sidebar brand reserved slot. */
export const LOGO_DISPLAY_ADMIN_WIDTH_PX = 160;
export const LOGO_DISPLAY_ADMIN_HEIGHT_PX = 48;

/** Suggested upload sizes (≈2× display) by logo shape — not enforced. */
export const LOGO_UPLOAD_HORIZONTAL_WIDTH_PX = 400;
export const LOGO_UPLOAD_HORIZONTAL_HEIGHT_PX = 96;
export const LOGO_UPLOAD_SQUARE_PX = 160;
export const LOGO_UPLOAD_VERTICAL_WIDTH_PX = 120;
export const LOGO_UPLOAD_VERTICAL_HEIGHT_PX = 160;

export function logoUploadHintEs(): string {
  return (
    `Aceptamos logos horizontales, verticales o circulares/cuadrados: se ajustan a un espacio fijo ` +
    `de ${LOGO_DISPLAY_DESKTOP_WIDTH_PX}×${LOGO_DISPLAY_DESKTOP_HEIGHT_PX}px (escritorio) y ` +
    `${LOGO_DISPLAY_MOBILE_WIDTH_PX}×${LOGO_DISPLAY_MOBILE_HEIGHT_PX}px (móvil) sin deformar ni romper la cabecera. ` +
    `Sugerencias de subida (≈2× para pantallas retina): ` +
    `horizontal ${LOGO_UPLOAD_HORIZONTAL_WIDTH_PX}×${LOGO_UPLOAD_HORIZONTAL_HEIGHT_PX}px; ` +
    `circular/cuadrado ${LOGO_UPLOAD_SQUARE_PX}×${LOGO_UPLOAD_SQUARE_PX}px; ` +
    `vertical ${LOGO_UPLOAD_VERTICAL_WIDTH_PX}×${LOGO_UPLOAD_VERTICAL_HEIGHT_PX}px. ` +
    `Preferí SVG o PNG con transparencia.`
  );
}
