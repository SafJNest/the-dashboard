import type { RequestEvent } from '@qwik.dev/router';

type ServerEvent = Pick<RequestEvent, 'env' | 'url'>;
type SessionEvent = ServerEvent & Pick<RequestEvent, 'cookie' | 'headers' | 'redirect'>;

export const SESSION_COOKIE = 'beebot_session';
export const STATE_COOKIE = 'beebot_oauth_state';
export const STATE_SECONDS = 600;

export const INVALID_RESPONSE = 'Invalid server response.';
export const GUILD_NOT_AVAILABLE = "This server isn't available. Beebot may not be in it, or you no longer manage it.";
const UNAVAILABLE = 'Beebot is temporarily unavailable. Please try again.';
const REJECTED = 'The request was rejected. Check the values and try again.';
const MISCONFIGURED = 'The dashboard is not configured correctly. Please contact the Beebot team.';
const FAILURE_MESSAGES: Record<string, string> = {
  discord_unavailable: 'Discord is temporarily unavailable. Please try again.',
  auth_unavailable: 'Sign-in is temporarily unavailable. Please try again.',
  settings_unavailable: 'Server settings are temporarily unavailable. Please try again.',
  guild_forbidden: "Access denied. You don't have permission to manage this server.",
  guild_not_found: GUILD_NOT_AVAILABLE,
};

export interface User {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string | null;
}

export interface Server {
  id: string;
  name: string;
  iconUrl: string | null;
  owner: boolean;
}

export interface Me {
  user: User;
  servers: Server[];
}

type FailureStatus = 400 | 403 | 404 | 500 | 502 | 503;

export interface ApiFailure {
  ok: false;
  status: FailureStatus;
  code: string;
  message: string;
  retryAfter: number | null;
}

export type ApiResult = { ok: true; data: unknown } | ApiFailure;

const isNullableString = (value: unknown) => value === null || value === undefined || typeof value === 'string';

function parseUser(value: unknown): User | null {
  const user = value as User | null;
  if (!user || typeof user.id !== 'string' || typeof user.username !== 'string' ||
      !isNullableString(user.globalName) || !isNullableString(user.avatarUrl)) return null;
  return { id: user.id, username: user.username, globalName: user.globalName || null, avatarUrl: user.avatarUrl || null };
}

export function parseServers(value: unknown): Server[] | null {
  if (!Array.isArray(value)) return null;
  const servers: Server[] = [];
  for (const server of value as Server[]) {
    if (!server || typeof server.id !== 'string' || typeof server.name !== 'string' ||
        !isNullableString(server.iconUrl) || typeof server.owner !== 'boolean') return null;
    servers.push({ id: server.id, name: server.name, iconUrl: server.iconUrl || null, owner: server.owner });
  }
  return servers;
}

export function parseMe(value: unknown): Me | null {
  const me = value as Me | null;
  const user = parseUser(me?.user);
  const servers = parseServers(me?.servers);
  return user && servers ? { user, servers } : null;
}

export function configuration(event: ServerEvent) {
  const base = event.env.get('BEEBOT_API_URL');
  const apiKey = event.env.get('BEEBOT_API_KEY');
  const callback = event.env.get('BEEBOT_AUTH_CALLBACK_URI');
  if (!base || !apiKey || !callback) throw new Error('Beebot authentication is not configured');
  const apiUrl = new URL(base);
  const callbackUrl = new URL(callback);
  if (apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) throw new Error('Invalid Beebot API URL');
  if (apiUrl.protocol !== 'https:' && !(apiUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(apiUrl.hostname))) {
    throw new Error('Invalid Beebot API URL');
  }
  if (callbackUrl.origin !== event.url.origin || callbackUrl.pathname !== '/auth/callback/' || callbackUrl.search || callbackUrl.hash) {
    throw new Error('Invalid Beebot callback URL');
  }
  if (callbackUrl.protocol !== 'https:' && !(callbackUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(callbackUrl.hostname))) {
    throw new Error('Invalid Beebot callback URL');
  }
  return { base: base.replace(/\/$/, ''), apiKey, callback };
}

export function cookieOptions(event: ServerEvent, maxAge: number) {
  return { httpOnly: true, secure: event.url.protocol === 'https:', sameSite: 'lax' as const, path: '/', maxAge };
}

export function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function beebotFetch(event: ServerEvent, path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const { base, apiKey } = configuration(event);
  const headers = new Headers({ 'X-API-Key': apiKey, Accept: 'application/json' });
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  return fetch(`${base}${path}`, {
    method: options.method || 'GET', headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(15000),
    redirect: 'manual',
  });
}

export function loginRedirect(event: Pick<RequestEvent, 'headers' | 'redirect'>) {
  event.headers.set('Cache-Control', 'no-store');
  return event.redirect(302, '/auth/login/');
}

function retryAfterSeconds(payload: { retryAfter?: unknown } | null, header: string | null) {
  const value = typeof payload?.retryAfter === 'number' ? payload.retryAfter : Number(header);
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : null;
}

function failureMessage(status: number, code: string, retryAfter: number | null) {
  if (code === 'discord_rate_limited') {
    return retryAfter ? `Discord is receiving too many requests. Try again in ${retryAfter} second${retryAfter === 1 ? '' : 's'}.` : 'Discord is receiving too many requests. Try again shortly.';
  }
  return FAILURE_MESSAGES[code] ?? (status === 404 ? GUILD_NOT_AVAILABLE : status === 400 ? REJECTED : UNAVAILABLE);
}

export async function sessionFetch(event: SessionEvent, path: string, options: { method?: string; body?: unknown } = {}): Promise<ApiResult> {
  const token = event.cookie.get(SESSION_COOKIE)?.value;
  if (!token) throw loginRedirect(event);
  const method = options.method || 'GET';
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await beebotFetch(event, path, { ...options, token });
  } catch (error) {
    const failure = error as Error & { cause?: { code?: string } };
    console.error(`[Beebot] ${method} ${path} failed after ${Date.now() - startedAt}ms: ${failure.name} ${failure.cause?.code ?? failure.message}`);
    return { ok: false, status: 503, code: 'network_error', message: UNAVAILABLE, retryAfter: null };
  }
  if (response.ok) {
    if (response.status === 204) return { ok: true, data: null };
    try {
      return { ok: true, data: await response.json() };
    } catch {
      console.error(`[Beebot] ${method} ${path}: invalid JSON after ${Date.now() - startedAt}ms`);
      return { ok: false, status: 502, code: 'invalid_response', message: INVALID_RESPONSE, retryAfter: null };
    }
  }
  const payload = await response.json().catch(() => null) as { code?: unknown; retryAfter?: unknown } | null;
  const code = typeof payload?.code === 'string' && /^[a-z_]{1,64}$/.test(payload.code) ? payload.code : 'unknown';
  console.error(`[Beebot] ${method} ${path}: HTTP ${response.status} code=${code} after ${Date.now() - startedAt}ms`);
  if (response.status === 401 && code === 'invalid_api_key') return { ok: false, status: 500, code, message: MISCONFIGURED, retryAfter: null };
  if (response.status === 401) {
    event.cookie.delete(SESSION_COOKIE, { path: '/' });
    throw loginRedirect(event);
  }
  const retryAfter = code === 'discord_rate_limited' ? retryAfterSeconds(payload, response.headers.get('Retry-After')) : null;
  const status = ([400, 403, 404, 503] as const).find((value) => value === response.status) ?? 502;
  return { ok: false, status, code, message: failureMessage(response.status, code, retryAfter), retryAfter };
}

export function apiError(event: Pick<RequestEvent, 'error' | 'headers'>, failure: ApiFailure) {
  event.headers.set('Cache-Control', 'no-store');
  if (failure.retryAfter) event.headers.set('Retry-After', String(failure.retryAfter));
  return event.error(failure.status, failure.message);
}
