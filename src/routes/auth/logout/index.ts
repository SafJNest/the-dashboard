import type { RequestHandler } from '@qwik.dev/router';
import { beebotFetch, SESSION_COOKIE } from '../../../lib/beebot.server';

export const onPost: RequestHandler = async (event) => {
  event.headers.set('Cache-Control', 'no-store');
  if (event.request.headers.get('origin') !== event.url.origin) throw event.error(403, 'Invalid origin.');
  const token = event.cookie.get(SESSION_COOKIE)?.value;
  if (token) {
    let response: Response;
    try {
      response = await beebotFetch(event, '/auth/logout', { method: 'POST', token });
    } catch {
      throw event.error(503, 'Logout is temporarily unavailable. Please try again.');
    }
    if (!response.ok && response.status !== 401) throw event.error(503, 'Logout is temporarily unavailable. Please try again.');
  }
  event.cookie.delete(SESSION_COOKIE, { path: '/' });
  throw event.redirect(303, '/');
};
