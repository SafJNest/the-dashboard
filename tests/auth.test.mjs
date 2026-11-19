import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(path, helper) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  if (helper) source = source.replace("'../../../lib/beebot.server'", JSON.stringify(helper));
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  return { url, module: await import(url) };
}
const helper = await load('../src/lib/beebot.server.ts');
const callback = (await load('../src/routes/auth/callback/index.ts', helper.url)).module;
const login = (await load('../src/routes/auth/login/index.ts', helper.url)).module;
const logout = (await load('../src/routes/auth/logout/index.ts', helper.url)).module;

function event(query = 'code=discord-code&state=expected-state') {
  const cookies = new Map([['beebot_oauth_state', 'expected-state']]);
  const config = { BEEBOT_API_URL: 'https://api.safjnest.com/beebot', BEEBOT_API_KEY: 'test-key', BEEBOT_AUTH_CALLBACK_URI: 'https://safjnest.com/auth/callback/' };
  const url = new URL(`https://safjnest.com/auth/callback/?${query}`);
  return { url, query: url.searchParams, cookies, headers: new Headers(),
    env: { get: (name) => config[name] },
    cookie: { get: (name) => cookies.has(name) ? { value: cookies.get(name) } : null,
      set: (name, value, options) => cookies.set(name, { value, options }), delete: (name) => cookies.delete(name) },
    error: (status) => ({ status }), redirect: (status, url) => ({ status, url }),
  };
}

test('login requests Discord authorization and redirects the browser with a protected state cookie', async (t) => {
  const request = event();
  request.url = new URL('https://safjnest.com/auth/login/');
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.safjnest.com/beebot/auth/discord/authorize');
    assert.equal(options.headers.get('X-API-Key'), 'test-key');
    assert.equal(options.headers.has('Authorization'), false);
    const body = JSON.parse(options.body);
    assert.match(body.state, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(body.redirectUri, 'https://safjnest.com/auth/callback/');
    return Response.json({ authorizationUrl: `https://discord.com/oauth2/authorize?state=${body.state}` });
  });
  await assert.rejects(login.onGet(request), (error) => error.status === 302 && error.url.startsWith('https://discord.com/oauth2/authorize?'));
  const state = request.cookies.get('beebot_oauth_state');
  assert.equal(state.options.httpOnly, true);
  assert.equal(state.options.secure, true);
  assert.equal(state.options.sameSite, 'lax');
});

test('callback exchanges the Discord code server-to-server and protects the session cookie', async (t) => {
  const request = event();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.safjnest.com/beebot/auth/session');
    assert.equal(options.headers.get('X-API-Key'), 'test-key');
    assert.deepEqual(JSON.parse(options.body), { code: 'discord-code', state: 'expected-state', redirectUri: 'https://safjnest.com/auth/callback/' });
    return Response.json({ sessionToken: 'session-value', expiresAt: Date.now() + 60000 });
  });
  await assert.rejects(callback.onGet(request), (error) => error.status === 303 && error.url === '/dashboard/');
  assert.equal(calls, 1);
  assert.equal(request.cookies.has('beebot_oauth_state'), false);
  const session = request.cookies.get('beebot_session');
  assert.equal(session.value, 'session-value');
  assert.equal(session.options.httpOnly, true);
  assert.equal(session.options.secure, true);
  assert.ok(session.options.maxAge > 0 && session.options.maxAge <= 60);
});

test('invalid state and Discord denial never contact Beebot', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('unexpected network request'));
  for (const query of ['code=code&state=wrong', 'error=access_denied&state=expected-state']) {
    const request = event(query);
    await assert.rejects(callback.onGet(request), (error) => error.status === 400);
    assert.equal(request.cookies.has('beebot_session'), false);
  }
});

test('expired session response is not stored', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ sessionToken: 'expired', expiresAt: Date.now() - 1000 }));
  const request = event();
  await assert.rejects(callback.onGet(request), (error) => error.status === 502);
  assert.equal(request.cookies.has('beebot_session'), false);
});

test('logout rejects foreign origins before contacting Beebot', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('unexpected network request'));
  const request = event();
  request.request = new Request(request.url, { method: 'POST', headers: { Origin: 'https://other.test' } });
  await assert.rejects(logout.onPost(request), (error) => error.status === 403);
});

const { parseMe, parseServers, sessionFetch, apiError } = helper.module;
const meResponse = {
  user: { id: '42', username: 'tester', globalName: null, avatarUrl: null },
  servers: [{ id: '1', name: 'Guild', iconUrl: null, owner: true }],
};

function sessionEvent() {
  const request = event();
  request.cookies.set('beebot_session', 'session-value');
  return request;
}

test('/me is parsed as profile and servers together', () => {
  assert.deepEqual(parseMe(meResponse), meResponse);
  assert.deepEqual(parseMe({ ...meResponse, servers: [{ id: '2', name: 'Other', owner: false }] }).servers, [{ id: '2', name: 'Other', iconUrl: null, owner: false }]);
  assert.equal(parseMe(meResponse.user), null);
  assert.equal(parseMe({ user: meResponse.user, servers: { servers: meResponse.servers } }), null);
});

test('list endpoints are parsed as a bare server array', () => {
  assert.deepEqual(parseServers(meResponse.servers), meResponse.servers);
  assert.deepEqual(parseServers([]), []);
  assert.equal(parseServers({ servers: meResponse.servers }), null);
  assert.equal(parseServers([{ id: 1, name: 'Guild', iconUrl: null, owner: true }]), null);
});

test('session requests forward API key and bearer and return the JSON body', async (t) => {
  const request = sessionEvent();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.safjnest.com/beebot/me');
    assert.equal(options.headers.get('X-API-Key'), 'test-key');
    assert.equal(options.headers.get('Authorization'), 'Bearer session-value');
    return Response.json(meResponse);
  });
  assert.deepEqual(await sessionFetch(request, '/me'), { ok: true, data: meResponse });
});

test('expired or invalid sessions clear the cookie and require login', async (t) => {
  for (const code of ['invalid_session', 'discord_token_expired']) {
    const request = sessionEvent();
    t.mock.method(globalThis, 'fetch', async () => Response.json({ code, message: 'no' }, { status: 401 }));
    await assert.rejects(sessionFetch(request, '/me'), (error) => error.status === 302 && error.url === '/auth/login/');
    assert.equal(request.cookies.has('beebot_session'), false);
  }
});

test('an invalid API key is a configuration error, not a login loop', async (t) => {
  const request = sessionEvent();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ code: 'invalid_api_key', message: 'no' }, { status: 401 }));
  const result = await sessionFetch(request, '/me');
  assert.equal(result.ok, false);
  assert.equal(result.status, 500);
  assert.equal(request.cookies.get('beebot_session'), 'session-value');
});

test('rate limits keep the session, are not retried and expose the delay', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return Response.json({ code: 'discord_rate_limited', message: 'Discord rate limit exceeded', retryAfter: 1.25 }, { status: 503, headers: { 'Retry-After': '2' } });
  });
  const request = sessionEvent();
  const result = await sessionFetch(request, '/me');
  assert.equal(calls, 1);
  assert.equal(request.cookies.get('beebot_session'), 'session-value');
  assert.deepEqual({ status: result.status, code: result.code, retryAfter: result.retryAfter }, { status: 503, code: 'discord_rate_limited', retryAfter: 2 });
  assert.match(result.message, /2 seconds/);
  assert.deepEqual(apiError(request, result), { status: 503 });
  assert.equal(request.headers.get('Retry-After'), '2');

  t.mock.method(globalThis, 'fetch', async () => Response.json({ code: 'discord_rate_limited', message: 'limited' }, { status: 503, headers: { 'Retry-After': '7' } }));
  assert.equal((await sessionFetch(sessionEvent(), '/me')).retryAfter, 7);
});

test('unavailable services and forbidden guilds are reported without logout', async (t) => {
  const cases = [
    [503, 'discord_unavailable', 503, /Discord is temporarily unavailable/],
    [503, 'auth_unavailable', 503, /Sign-in is temporarily unavailable/],
    [503, 'settings_unavailable', 503, /settings are temporarily unavailable/],
    [403, 'guild_forbidden', 403, /Access denied/],
    [404, 'guild_not_found', 404, /isn't available/],
  ];
  for (const [status, code, expected, message] of cases) {
    const request = sessionEvent();
    t.mock.method(globalThis, 'fetch', async () => Response.json({ code, message: 'backend' }, { status }));
    const result = await sessionFetch(request, '/guilds/1');
    assert.equal(result.status, expected);
    assert.match(result.message, message);
    assert.equal(result.retryAfter, null);
    assert.equal(request.cookies.get('beebot_session'), 'session-value');
  }
});

test('network failures and empty responses are handled', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });
  assert.equal((await sessionFetch(sessionEvent(), '/me')).status, 503);
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
  assert.deepEqual(await sessionFetch(sessionEvent(), '/auth/logout', { method: 'POST' }), { ok: true, data: null });
});

test('logout accepts an empty 204 and clears the session cookie', async (t) => {
  const request = sessionEvent();
  request.request = new Request(request.url, { method: 'POST', headers: { Origin: 'https://safjnest.com' } });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.safjnest.com/beebot/auth/logout');
    assert.equal(options.headers.get('Authorization'), 'Bearer session-value');
    return new Response(null, { status: 204 });
  });
  await assert.rejects(logout.onPost(request), (error) => error.status === 303 && error.url === '/');
  assert.equal(request.cookies.has('beebot_session'), false);
});
