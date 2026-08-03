import { toValue, watch, type MaybeRefOrGetter } from 'vue';
import { resolveTenantMediaUrl } from '../../core/utils/mediaUrl';

const DEFAULT_FALLBACK_COLOR = '#2f6d4a';

function guessFaviconType(href: string): string | undefined {
  const path = href.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.svg') || href.startsWith('data:image/svg')) return 'image/svg+xml';
  if (path.endsWith('.png') || href.startsWith('data:image/png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg') || href.startsWith('data:image/jpeg')) {
    return 'image/jpeg';
  }
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.webp')) return 'image/webp';
  return undefined;
}

function setDocumentFavicon(href: string, type?: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  if (type) {
    link.type = type;
  } else {
    link.removeAttribute('type');
  }
  link.href = href;
}

function generateLetterFavicon(letter: string, bgColor: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "DM Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter.toUpperCase(), 32, 34);

  return canvas.toDataURL('image/png');
}

type UseTenantFaviconOptions = {
  /** Absolute or API-relative logo URL; when set, used as the tab icon. */
  logoUrl: MaybeRefOrGetter<string | null | undefined>;
  /** Letter used when there is no logo (e.g. store name initial). */
  fallbackLetter: MaybeRefOrGetter<string>;
  /** Background for the letter fallback. */
  fallbackColor?: MaybeRefOrGetter<string | null | undefined>;
};

/**
 * Sets `document` favicon from the tenant logo, with a letter-circle fallback.
 * Shared by public storefront and admin shell.
 */
export function useTenantFavicon(options: UseTenantFaviconOptions) {
  watch(
    () =>
      [
        toValue(options.logoUrl),
        toValue(options.fallbackLetter),
        toValue(options.fallbackColor) ?? DEFAULT_FALLBACK_COLOR,
      ] as const,
    ([logoUrl, letter, color]) => {
      const resolvedLogo = resolveTenantMediaUrl(logoUrl);
      if (resolvedLogo) {
        setDocumentFavicon(resolvedLogo, guessFaviconType(resolvedLogo));
        return;
      }

      const safeLetter = (letter.trim().charAt(0) || '?').toUpperCase();
      const dataUrl = generateLetterFavicon(safeLetter, color || DEFAULT_FALLBACK_COLOR);
      if (dataUrl) {
        setDocumentFavicon(dataUrl, 'image/png');
      }
    },
    { immediate: true },
  );
}
