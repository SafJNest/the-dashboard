import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  return { url, module: await import(url) };
}

const sounds = await load('../src/lib/sounds.ts');
const stats = await load('../src/lib/sound-stats.ts');
const library = (await load('../src/lib/sound-library.ts', { "'./sound-stats'": JSON.stringify(stats.url), "'./sounds'": JSON.stringify(sounds.url) })).module;
const endpoints = await load('../src/lib/beebot/endpoints.ts');
const helper = await load('../src/lib/beebot.server.ts');
const guild = await load('../src/lib/guild.ts');
const { BeebotClient } = (await load('../src/lib/beebot/client.server.ts', {
  "'../beebot.server'": JSON.stringify(helper.url),
  "'../guild'": JSON.stringify(guild.url),
  "'../sounds'": JSON.stringify(sounds.url),
  "'./endpoints'": JSON.stringify(endpoints.url),
})).module;

const { parseSound, parseGuildSoundLibrary, parseMySoundLibrary, parseGuildSoundAnalytics, parseSoundAnalytics, parseGreets, parseGreetResults, readPeriod } = sounds.module;
const { heatRows, replayRows, topShare, viewFromSoundAnalytics, dayBars, formatLength } = stats.module;
const { withQuery, ENDPOINTS } = endpoints.module;

const rawSound = {
  id: '42', name: 'airhorn', guildId: '123', userId: '456',
  uploader: { id: '456', name: 'Luna', avatarUrl: null },
  public: true, createdAt: '2026-03-02T10:00:00Z', url: 'https://cdn.example.com/sounds/42.mp3', durationMs: 2000,
  tags: [{ id: '1', name: 'meme' }], plays: 2140, listeners: 728, likes: 214, dislikes: 13, myPlays: 29,
  likedByMe: true, dislikedByMe: false, ownedByMe: false, canEdit: false, canDelete: false, soundboardCount: 2,
};

const aggregate = (plays, extra = {}) => ({
  plays, listeners: 10, averagePlaysPerListener: 5, previousPlays: 40, playsChangePercent: 25,
  playsPerDay: [{ date: '2026-11-10', plays }], heatmap: [{ weekday: 6, hour: 21, plays }],
  sources: [{ source: 'SOUNDBOARD', plays }], replayDistribution: [], ...extra,
});

function sessionEvent() {
  const config = { BEEBOT_API_URL: 'https://api.safjnest.com/beebot', BEEBOT_API_KEY: 'test-key', BEEBOT_AUTH_CALLBACK_URI: 'https://safjnest.com/auth/callback/' };
  const cookies = new Map([['beebot_session', 'session-value']]);
  return {
    url: new URL('https://safjnest.com/dashboard/me/sounds/'), headers: new Headers(),
    env: { get: (name) => config[name] },
    cookie: { get: (name) => (cookies.has(name) ? { value: cookies.get(name) } : null), delete: (name) => cookies.delete(name) },
    redirect: (status, url) => ({ status, url }),
  };
}

test('a Sound keeps the shared contract and drops unknown fields', () => {
  const sound = parseSound(rawSound);
  assert.equal(sound.id, '42');
  assert.equal(sound.uploader.name, 'Luna');
  assert.equal('soundboardCount' in sound, false);
  assert.equal(parseSound({ ...rawSound, durationMs: null }).durationMs, null);
  assert.equal(parseSound({ ...rawSound, tags: 'meme' }), null);
  assert.equal(parseSound({ ...rawSound, id: 42 }), null);
});

test('guild and personal libraries are parsed with their groups', () => {
  const guildLibrary = parseGuildSoundLibrary({
    guildId: '123', counts: { all: 1, mine: 0, others: 1 }, tags: [{ id: '1', name: 'meme', soundCount: 1 }],
    summary: { period: '30d', plays: 50, previousPlays: 40, playsChangePercent: 25, listeners: 10, likes: 8, myPlays: 4 },
    sounds: [rawSound],
  }, '123');
  assert.equal(guildLibrary.sounds[0].name, 'airhorn');
  assert.equal(guildLibrary.summary.playsChangePercent, 25);
  assert.equal(parseGuildSoundLibrary({ ...guildLibrary, guildId: '999' }, '123'), null);

  const mine = parseMySoundLibrary({
    counts: { all: 1 }, tags: [], summary: { period: 'all', plays: 1, previousPlays: null, playsChangePercent: null, listeners: 1, likes: 0, myPlays: 0 },
    guilds: { 123: { name: 'Night Shift', sounds: [rawSound] }, 789: { name: null, sounds: [] } },
  });
  assert.deepEqual(mine.guilds.map((group) => [group.guildId, group.name, group.sounds.length]), [['123', 'Night Shift', 1], ['789', null, 0]]);
  assert.equal(mine.summary.playsChangePercent, null);
});

test('analytics accept abbreviated series and reject malformed ones', () => {
  const analytics = parseGuildSoundAnalytics({
    guildId: '123', period: '30d', timezone: 'Europe/Rome',
    summary: { plays: 50, listeners: 10, averagePlaysPerListener: 5, myPlays: 4, likes: 8, dislikes: 1, soundCount: 1 },
    playsPerDay: [{ date: '2026-11-10', plays: 12 }], topSounds: [{ soundId: '42', plays: 50 }], mostLiked: [{ soundId: '42', likes: 8 }],
    users: [{ user: { id: '456', name: 'Luna', avatarUrl: null }, soundCount: 1, plays: 12 }],
    sounds: [{ soundId: '42', ...aggregate(50), likes: 8, dislikes: 1, my: { plays: 4, history: [{ id: '900', playedAt: '2026-11-10T20:30:00Z', guildId: '123', source: 'SOUNDBOARD' }], nextCursor: null } }],
  }, '123');
  assert.deepEqual(analytics.topSounds, [{ soundId: '42', value: 50 }]);
  assert.equal(analytics.sounds[0].my.history[0].source, 'SOUNDBOARD');
  assert.equal(parseSoundAnalytics({ soundId: '42', totals: aggregate(1, { heatmap: [{ weekday: 8, hour: 1, plays: 1 }] }) }), null);
});

test('the all-servers view sums additive series but never listener distributions', () => {
  const analytics = parseSoundAnalytics({
    soundId: '42', period: '30d', timezone: 'Europe/Rome',
    totals: { plays: 70, listeners: 15, averagePlaysPerListener: 4.6667, likes: 8, dislikes: 1 },
    guilds: { 123: { ...aggregate(50), users: [] } },
    otherGuilds: aggregate(20),
    my: { plays: 4, history: [{ id: '1', playedAt: '2026-11-10T20:30:00Z', guildId: '123', source: 'AUDIO' }, { id: '2', playedAt: '2026-11-09T20:30:00Z', guildId: null, source: 'AUDIO' }], nextCursor: null },
  });
  const all = viewFromSoundAnalytics(analytics, null);
  assert.equal(all.plays, 70);
  assert.equal(all.listeners, 15);
  assert.deepEqual(all.playsPerDay, [{ date: '2026-11-10', plays: 70 }]);
  assert.deepEqual(all.heatmap, [{ weekday: 6, hour: 21, plays: 70 }]);
  assert.deepEqual(all.replay, []);
  assert.deepEqual(all.where.map((row) => [row.guildId, row.plays]), [['123', 50], [null, 20]]);
  const scoped = viewFromSoundAnalytics(analytics, '123');
  assert.equal(scoped.plays, 50);
  assert.equal(scoped.myPlays, 1);
});

test('heatmap, replay groups and percentile describe aggregate data only', () => {
  const heat = heatRows([{ weekday: 6, hour: 21, plays: 7 }, { weekday: 6, hour: 20, plays: 3 }, { weekday: 1, hour: 9, plays: 10 }]);
  assert.deepEqual(heat.peak, { weekday: 1, hour: 9, plays: 10 });
  assert.equal(heat.peakDayShare, 50);
  assert.equal(heat.rows[5].cells[21].level, 3);
  const buckets = [{ min: 1, max: 1, users: 4 }, { min: 2, max: 5, users: 3 }, { min: 6, max: 20, users: 3 }, { min: 21, max: 50, users: 0 }, { min: 51, max: null, users: 0 }];
  assert.deepEqual(replayRows(buckets, 4).map((row) => row.mine), [false, true, false, false, false]);
  assert.equal(topShare(buckets, 4), 45);
  assert.equal(topShare(buckets, 0), null);
  assert.equal(dayBars(Array.from({ length: 100 }, (_, index) => ({ date: `d${index}`, plays: 1 }))).weekly, true);
  assert.equal(formatLength(2000), '0:02');
  assert.equal(formatLength(null), '—');
});

test('library model needs only the library and keeps a stable name order', () => {
  const sound = parseSound(rawSound);
  const mineSound = { ...sound, id: '43', name: 'bonk', ownedByMe: true, canEdit: true };
  const twin = { ...sound, id: '7', name: 'bonk', ownedByMe: true };
  const data = {
    period: '30d', guildId: '123',
    library: { guildId: '123', counts: { all: 3, mine: 2, others: 1 }, tags: [], summary: { period: '30d', plays: 0, previousPlays: null, playsChangePercent: null, listeners: 0, likes: 0, myPlays: 0 }, sounds: [sound, mineSound, twin] },
  };
  const base = library.guildLibraryModel(data, undefined, 'Night Shift');
  assert.deepEqual(base.entries.map((entry) => entry.sound.id), ['42', '7', '43']);
  assert.equal(base.selected.sound.id, '42');
  assert.equal(base.sort, 'name');

  const mine = library.guildLibraryModel(data, undefined, 'Night Shift', { owner: 'mine', sort: 'name', tab: 'everyone', period: null });
  assert.deepEqual(mine.entries.map((entry) => entry.sound.id), ['7', '43']);
  assert.equal(mine.selected.sound.id, '7');
  assert.deepEqual(mine.ownerCounts, { all: 3, mine: 2, others: 1 });

  const filtered = library.guildLibraryModel(data, '42', 'Night Shift', { owner: 'mine', sort: 'plays', tab: 'mine', period: null });
  assert.equal(filtered.sort, 'plays');
  assert.equal(filtered.tab, 'mine');
  assert.equal(filtered.selected.sound.id, '42');
  assert.equal(filtered.missing, false);

  const missing = library.guildLibraryModel(data, '999', 'Night Shift');
  assert.equal(missing.selected, null);
  assert.equal(missing.missing, true);

  const analytics = { guildId: '123', period: '30d', timezone: 'Europe/Rome', summary: {}, playsPerDay: [], topSounds: [{ soundId: '43', value: 3 }], mostLiked: [], users: [], sounds: [{ soundId: '43', ...aggregate(9), likes: 0, dislikes: 0, my: { plays: 0, history: [], nextCursor: null } }] };
  const stats = library.guildLibraryStats(base, { period: '30d', analytics });
  assert.deepEqual(stats.overview.top, [{ id: '43', name: 'bonk', detail: 'you', value: 3 }]);
  const byPlays = library.guildLibraryModel({ ...data, library: { ...data.library, sounds: [sound, { ...mineSound, plays: 9000 }, { ...twin, plays: 1 }] } }, undefined, 'Night Shift', { owner: 'all', sort: 'plays', tab: 'everyone', period: null });
  assert.deepEqual(byPlays.entries.map((entry) => entry.sound.id), ['43', '42', '7']);
  assert.equal(byPlays.selected.sound.id, '43');

  assert.equal(library.soundHref(base, '43'), '/dashboard/123/sounds/43/');
});

test('library state separates stale, updating and failed results', () => {
  const sound = parseSound(rawSound);
  const libraryData = { guildId: '123', counts: { all: 1, mine: 0, others: 1 }, tags: [], summary: { period: '30d', plays: 0, previousPlays: null, playsChangePercent: null, listeners: 0, likes: 0, myPlays: 0 }, sounds: [sound] };
  const load = (data, guildId = '123') => ({ scope: 'guild', guildId, guildName: 'Night Shift', library: data });
  const later = { owner: 'all', sort: 'name', tab: 'everyone', period: '7d' };
  assert.equal(library.readLibrary(load({ period: '30d', guildId: '123', library: libraryData }), {}).status, 'ready');
  assert.equal(library.readLibrary(load({ period: '30d', guildId: '123', library: libraryData }, '456'), {}).status, 'stale');
  assert.equal(library.readLibrary(load({ period: '30d', guildId: '123', library: libraryData }), {}, later).updating, true);
  const failed = library.readLibrary(load({ failed: true, status: 503, message: 'Down', retryAfter: null, period: '30d', guildId: '123' }), {});
  assert.equal(failed.status, 'failed');
  assert.equal(failed.failure.message, 'Down');
  const ready = library.readLibrary(load({ period: '30d', guildId: '123', library: libraryData }), {});
  const stats = { period: '30d', guildId: '123', analytics: { guildId: '123', period: '30d', timezone: 'UTC', summary: {}, playsPerDay: [], topSounds: [], mostLiked: [], users: [], sounds: [] } };
  assert.equal(library.readStats({ ...load(null), analytics: stats }, ready.model, later), null);
  assert.equal(library.readStats({ ...load(null), analytics: stats }, ready.model).timezone, 'UTC');
});

test('the personal library filters by the guild in the path', () => {
  const sound = parseSound(rawSound);
  const other = { ...sound, id: '50', name: 'alpha', guildId: '789' };
  const data = {
    period: '30d', guildId: null,
    library: { counts: { all: 2 }, tags: [], summary: { period: '30d', plays: 0, previousPlays: null, playsChangePercent: null, listeners: 0, likes: 0, myPlays: 0 }, guilds: [{ guildId: '123', name: 'Night Shift', sounds: [sound] }, { guildId: '789', name: null, sounds: [other] }] },
  };
  const all = library.myLibraryModel(data, undefined, undefined);
  assert.deepEqual(all.entries.map((entry) => entry.sound.id), ['42', '50']);
  assert.equal(all.basePath, '/dashboard/me/sounds/');
  const scoped = library.myLibraryModel(data, undefined, '123');
  assert.deepEqual(scoped.entries.map((entry) => entry.sound.id), ['42']);
  assert.equal(scoped.basePath, '/dashboard/me/sounds/guild/123/');
  assert.equal(library.soundHref(scoped, '42'), '/dashboard/me/sounds/guild/123/42/');
  const unknown = library.myLibraryModel(data, undefined, '555');
  assert.equal(unknown.guildMissing, true);
  assert.equal(unknown.selected, null);
  assert.equal(all.guilds.find((group) => group.id === '789').name, 'Unavailable server');
  assert.equal(library.mySoundTitle(data, { guildId: '123' }), 'My sounds in Night Shift · Beebot');
});

test('greets map the global key and report each entry separately', () => {
  assert.deepEqual(Object.keys(parseGreets({ 0: rawSound, 123: null })), ['0']);
  assert.deepEqual(parseGreetResults({ greets: { 0: { status: 'ok', errors: [] }, 123: { status: 'error', errors: [{ field: 'soundId', code: 'private_sound_wrong_guild', message: 'Wrong guild.' }] } } }), {
    0: { ok: true, errors: [] },
    123: { ok: false, errors: [{ field: 'soundId', code: 'private_sound_wrong_guild', message: 'Wrong guild.' }] },
  });
  assert.equal(readPeriod('1y'), '30d');
});

test('endpoints encode ids and skip empty query values', () => {
  assert.equal(withQuery(ENDPOINTS.guildSounds('123'), { period: '7d', timezone: '' }), '/guilds/123/sounds?period=7d');
  assert.equal(ENDPOINTS.soundVote('4/2', 'like'), '/sounds/4%2F2/like');
});

test('the client sends edits and votes and validates the response', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, method: options.method, body: options.body && JSON.parse(options.body) });
    if (url.endsWith('/like')) return Response.json({ soundId: '42', likes: 215, dislikes: 13, likedByMe: true, dislikedByMe: false });
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    if (url.endsWith('/sounds/7')) return Response.json({ code: 'not_found', message: 'x' }, { status: 404 });
    return Response.json({ ...rawSound, name: 'airhorn nuovo' });
  });
  const client = new BeebotClient(sessionEvent());
  const updated = await client.updateSound('42', { name: 'airhorn nuovo', public: true, tags: ['meme'] });
  assert.equal(updated.data.name, 'airhorn nuovo');
  assert.deepEqual(calls[0], { url: 'https://api.safjnest.com/beebot/sounds/42', method: 'PATCH', body: { name: 'airhorn nuovo', public: true, tags: ['meme'] } });
  assert.deepEqual((await client.setVote('42', 'like', true)).data.likes, 215);
  assert.deepEqual(calls[1].body, { enabled: true });
  assert.deepEqual(await client.deleteSound('42'), { ok: true, data: null });
  const missing = await client.sound('7');
  assert.equal(missing.status, 404);
  assert.equal(missing.message, "This sound doesn't exist, or you can't see it.");
});

test('the client turns unexpected shapes into an invalid response', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ sounds: 'nope' }));
  t.mock.method(console, 'error', () => {});
  const result = await new BeebotClient(sessionEvent()).mySounds('30d');
  assert.equal(result.ok, false);
  assert.equal(result.status, 502);
});
