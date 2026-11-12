import type { RequestHandler } from '@qwik.dev/router';
import { beebotFetch, configuration, cookieOptions, SESSION_COOKIE, STATE_COOKIE } from '../../../lib/beebot.server';

export const onGet: RequestHandler = async (event) => {
  event.headers.set('Cache-Control', 'no-store');
  event.headers.set('Referrer-Policy', 'no-referrer');
  const expected = event.cookie.get(STATE_COOKIE)?.value;
  event.cookie.delete(STATE_COOKIE, { path: '/' });
  const code = event.query.get('code');
  const state = event.query.get('state');
  if (event.query.has('error') || !expected || typeof state !== 'string' || state !== expected || typeof code !== 'string' || !code || code.length > 512) {
    throw event.error(400, 'Login failed or expired. Please try again.');
  }
  let response: Response;
  try {
    response = await beebotFetch(event, '/auth/session', { method: 'POST', body: { code, state, redirectUri: configuration(event).callback } });
  } catch {
    throw event.error(503, 'Login is temporarily unavailable.');
  }
  if (!response.ok) throw event.error(response.status === 401 ? 401 : 502, 'Login failed. Please try again.');
  const result = await response.json() as { sessionToken?: unknown; expiresAt?: unknown };
  if (typeof result.sessionToken !== 'string' || !result.sessionToken || result.sessionToken.length > 1024 ||
      typeof result.expiresAt !== 'number' || !Number.isFinite(result.expiresAt)) throw event.error(502, 'Invalid login response.');
  const maxAge = Math.min(8 * 60 * 60, Math.floor((result.expiresAt - Date.now()) / 1000));
  if (maxAge <= 0) throw event.error(502, 'Invalid login response.');
  event.cookie.set(SESSION_COOKIE, result.sessionToken, cookieOptions(event, maxAge));
  throw event.redirect(303, '/dashboard/');
};
