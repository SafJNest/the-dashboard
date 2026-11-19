export const SOUNDS_PATH = '/sounds';
export const SOUNDS_HOST_PREFIX = 'sounds.';

export function isSoundsHost(hostname: string) {
  return hostname.startsWith(SOUNDS_HOST_PREFIX);
}

export function soundsBase(url: URL) {
  return isSoundsHost(url.hostname) ? '' : SOUNDS_PATH;
}

export function siteOrigin(url: URL) {
  if ( !isSoundsHost(url.hostname) ) { return ''; }
  const host = url.host.slice(SOUNDS_HOST_PREFIX.length);
  return `${url.protocol}//${host}`;
}

export function publicSoundsUrl(path = '/') {
  const origin = import.meta.env.PUBLIC_SOUNDS_URL as string | undefined;
  return origin ? `${origin.replace(/\/$/, '')}${path}` : `${SOUNDS_PATH}${path}`;
}
