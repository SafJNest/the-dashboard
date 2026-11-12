import type { RequestHandler } from '@qwik.dev/router';
import { beebotFetch, configuration, cookieOptions, randomState, STATE_COOKIE, STATE_SECONDS } from '../../../lib/beebot.server';

export const onGet: RequestHandler = async (event) => {
  event.headers.set('Cache-Control', 'no-store');
  const { callback } = configuration(event);
  const state = randomState();
  let response: Response;
  const startedAt = Date.now();
  try {
    response = await beebotFetch(event, '/auth/discord/authorize', { method: 'POST', body: { state, redirectUri: callback } });
  } catch (error) {
    const failure = error as Error & { cause?: { code?: string } };
    const cause = failure.cause?.code ? `, cause=${failure.cause.code}` : '';
    const apiKey = event.env.get('BEEBOT_API_KEY');
    const message = (apiKey ? failure.message.replaceAll(apiKey, '[redacted]') : failure.message).replace(/[\r\n]/g, ' ');
    console.error(`[Beebot auth] authorize request failed after ${Date.now() - startedAt}ms: ${failure.name}${cause}: ${message}`);
    throw event.error(503, 'Login is temporarily unavailable.');
  }
  if (!response.ok) {
    const failure = await response.json().catch(() => null) as { code?: unknown } | null;
    const code = typeof failure?.code === 'string' && /^[a-z_]{1,64}$/.test(failure.code) ? failure.code : 'unknown';
    console.error(`[Beebot auth] authorize failed: HTTP ${response.status}, code=${code}`);
    throw event.error(503, 'Login is temporarily unavailable.');
  }
  const result = await response.json() as { authorizationUrl?: unknown };
  if (typeof result.authorizationUrl !== 'string') throw event.error(502, 'Invalid login response.');
  let destination: URL;
  try {
    destination = new URL(result.authorizationUrl);
  } catch {
    throw event.error(502, 'Invalid login response.');
  }
  if (destination.protocol !== 'https:' || destination.hostname !== 'discord.com' || destination.port || destination.username || destination.password) {
    throw event.error(502, 'Invalid login response.');
  }
  event.cookie.set(STATE_COOKIE, state, cookieOptions(event, STATE_SECONDS));
  throw event.redirect(302, destination.href);
};
