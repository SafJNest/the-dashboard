import type { RequestHandler } from '@qwik.dev/router';
import { isSoundsHost, SOUNDS_PATH } from '../lib/sounds-site';

export const onRequest: RequestHandler = (event) => {
  const { hostname, pathname } = event.url;
  const alreadyRewritten = pathname === SOUNDS_PATH || pathname.startsWith(`${SOUNDS_PATH}/`);
  if ( !isSoundsHost(hostname) || alreadyRewritten ) { return; }
  throw event.rewrite(`${SOUNDS_PATH}${pathname}`);
};
