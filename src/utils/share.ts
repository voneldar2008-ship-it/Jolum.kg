export const DEFAULT_SHARED_APP_URL =
  'https://ais-pre-abprhnvnpkuc7fghmqx3wi-899415044006.asia-east1.run.app';

export interface ShareUrlResolution {
  url: string;
  source: 'public-origin' | 'configured-app-url' | 'shared-fallback' | 'custom';
  isLocalPreview: boolean;
}

/**
 * Checks whether a URL points to a local developer machine rather than a public web address.
 */
export function isLocalOrigin(rawUrl: string): boolean {
  if (!rawUrl) return true;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '[::1]' ||
      host.endsWith('.local')
    );
  } catch {
    return true;
  }
}

/**
 * Checks whether a URL is an internal AI Studio dev sandbox host rather than the shared public URL.
 */
export function isDevSandboxOrigin(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host.startsWith('ais-dev-');
  } catch {
    return false;
  }
}

/**
 * Normalizes and validates an optional custom URL entered by the user.
 * Returns null when input is invalid or empty.
 */
export function normalizeCustomShareUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return null;
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

/**
 * Resolves the best public URL for QR codes so scanning never points to localhost.
 */
export function resolveSiteShareUrl(params: {
  currentOrigin?: string;
  envAppUrl?: string;
  defaultSharedUrl?: string;
  customUrl?: string;
}): ShareUrlResolution {
  const {
    currentOrigin = '',
    envAppUrl = '',
    defaultSharedUrl = DEFAULT_SHARED_APP_URL,
    customUrl = '',
  } = params;

  const normalizedCustom = normalizeCustomShareUrl(customUrl);
  if (normalizedCustom) {
    return {
      url: normalizedCustom,
      source: 'custom',
      isLocalPreview: isLocalOrigin(currentOrigin),
    };
  }

  const cleanOrigin = currentOrigin.trim().replace(/\/$/, '');
  const cleanEnv = envAppUrl.trim().replace(/\/$/, '');
  const isLocal = isLocalOrigin(cleanOrigin);

  // If the app is already opened on a live public domain (not localhost and not ais-dev sandbox), use it directly.
  if (cleanOrigin && !isLocal && !isDevSandboxOrigin(cleanOrigin)) {
    return {
      url: cleanOrigin,
      source: 'public-origin',
      isLocalPreview: false,
    };
  }

  // If opened on an ais-dev sandbox domain, map it directly to its corresponding ais-pre shared URL.
  if (cleanOrigin && isDevSandboxOrigin(cleanOrigin)) {
    return {
      url: cleanOrigin.replace('://ais-dev-', '://ais-pre-'),
      source: 'shared-fallback',
      isLocalPreview: false,
    };
  }

  // Prefer runtime APP_URL if it is a public non-dev URL.
  if (cleanEnv && !isLocalOrigin(cleanEnv) && !isDevSandboxOrigin(cleanEnv)) {
    return {
      url: cleanEnv,
      source: 'configured-app-url',
      isLocalPreview: isLocal,
    };
  }

  if (cleanEnv && isDevSandboxOrigin(cleanEnv)) {
    return {
      url: cleanEnv.replace('://ais-dev-', '://ais-pre-'),
      source: 'shared-fallback',
      isLocalPreview: isLocal,
    };
  }

  // Fallback to the published shared app URL so scanning the QR on a phone opens Jolum directly.
  return {
    url: defaultSharedUrl.replace(/\/$/, ''),
    source: 'shared-fallback',
    isLocalPreview: isLocal,
  };
}
