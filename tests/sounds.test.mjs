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
const { SoundLibrary } = (await load('../src/lib/sound-library.ts', { "'./sounds'": JSON.stringify(sounds.url) })).module;
const endpoints = await load('../src/lib/beebot/endpoints.ts');
const helper = await load('../src/lib/beebot.server.ts');
const guild = await load('../src/lib/guild.ts');
const soundboards = await load('../src/lib/soundboards.ts', { "'./sounds'": JSON.stringify(sounds.url) });
const { BeebotClient } = (await load('../src/lib/beebot/client.server.ts', {
  "'../beebot.server'": JSON.stringify(helper.url),
  "'../guild'": JSON.stringify(guild.url),
  "'../sounds'": JSON.stringify(sounds.url),
  "'../soundboards'": JSON.stringify(soundboards.url),
  "'./endpoints'": JSON.stringify(endpoints.url),
})).module;
const { Soundboards } = soundboards.module;

const { parseSound, parseGuildSoundLibrary, parseMySoundLibrary, parseGuildSoundAnalytics, parseSoundAnalytics, parseGreets, parseGreetResults, readPeriod } = sounds.module;
const { dayBars, formatLength } = stats.module;
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
  assert.equal(sound.soundboardCount, 2);
  assert.equal(parseSound({ ...rawSound, soundboardCount: undefined }).soundboardCount, 0);
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

test('daily bars switch to weeks for long periods and lengths are readable', () => {
  assert.equal(dayBars(Array.from({ length: 100 }, (_, index) => ({ date: `d${index}`, plays: 1 }))).weekly, true);
  assert.equal(dayBars([{ date: 'd1', plays: 0 }]).bars[0].peak, false);
  assert.equal(formatLength(2000), '0:02');
  assert.equal(formatLength(null), '—');
});

test('the library filters, sorts and ranks sounds of the current view', () => {
  const sound = parseSound(rawSound);
  const mine = { ...sound, id: '43', name: 'bonk', ownedByMe: true, public: false, plays: 9000, createdAt: '2026-04-01T10:00:00Z', tags: [{ id: '2', name: 'arcade' }] };
  const twin = { ...sound, id: '7', name: 'Bonk', ownedByMe: true, plays: 1, createdAt: '2026-01-01T10:00:00Z' };
  const guildLibrary = { guildId: '123', counts: { all: 3, mine: 2, others: 1 }, tags: [], summary: {}, sounds: [sound, mine, twin] };
  const entries = SoundLibrary.guildEntries(guildLibrary);
  const query = { text: '', owner: 'all', visibility: 'all', sort: 'plays' };
  assert.deepEqual(SoundLibrary.filter(entries, query).map((entry) => entry.sound.id), ['43', '42', '7']);
  assert.deepEqual(SoundLibrary.filter(entries, { ...query, sort: 'name' }).map((entry) => entry.sound.id), ['42', '43', '7']);
  assert.deepEqual(SoundLibrary.filter(entries, { ...query, sort: 'newest' }).map((entry) => entry.sound.id), ['43', '42', '7']);
  assert.deepEqual(SoundLibrary.filter(entries, { ...query, owner: 'others' }).map((entry) => entry.sound.id), ['42']);
  assert.deepEqual(SoundLibrary.filter(entries, { ...query, visibility: 'private' }).map((entry) => entry.sound.id), ['43']);
  assert.deepEqual(SoundLibrary.filter(entries, { ...query, text: '#arc' }).map((entry) => entry.sound.id), ['43']);
  assert.deepEqual(SoundLibrary.ranked([{ soundId: '43', value: 3 }, { soundId: '999', value: 9 }, { soundId: '42', value: 0 }], guildLibrary.sounds).map((entry) => [entry.sound.id, entry.plays]), [['43', 3]]);
  assert.equal(SoundLibrary.guildPath('123', '43'), '/dashboard/123/sounds/43/');
  assert.equal(SoundLibrary.myPath('43'), '/dashboard/me/sounds/43/');
  assert.equal(SoundLibrary.recentDays(Array.from({ length: 30 }, (_, index) => ({ date: String(index), plays: index }))).length, 14);
});

test('the personal library keeps the server of each sound', () => {
  const sound = parseSound(rawSound);
  const other = { ...sound, id: '50', name: 'alpha', guildId: '789' };
  const entries = SoundLibrary.myEntries({ counts: { all: 2 }, tags: [], summary: {}, guilds: [{ guildId: '123', name: 'Night Shift', sounds: [sound] }, { guildId: '789', name: null, sounds: [other] }] });
  assert.deepEqual(entries.map((entry) => [entry.sound.id, entry.guildName]), [['42', 'Night Shift'], ['50', 'Unavailable server']]);
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
  assert.equal(ENDPOINTS.soundVote('4/2'), '/sounds/4%2F2/vote');
  assert.equal(ENDPOINTS.soundboardSound('9', '4/2'), '/soundboards/9/sounds/4%2F2');
});

test('the client sends edits and validates the response', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, method: options.method, body: options.body && JSON.parse(options.body) });
    if (url.endsWith('/sounds/7')) return Response.json({ code: 'not_found', message: 'x' }, { status: 404 });
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    return Response.json({ ...rawSound, name: 'airhorn nuovo', description: 'A short blast.\nLoud.' });
  });
  const client = new BeebotClient(sessionEvent());
  const updated = await client.updateSound('42', { name: 'airhorn nuovo', description: null, public: true, tags: ['meme'] });
  assert.equal(updated.data.name, 'airhorn nuovo');
  assert.equal(updated.data.description, 'A short blast.\nLoud.');
  assert.deepEqual(calls[0], { url: 'https://api.safjnest.com/beebot/sounds/42', method: 'PATCH', body: { name: 'airhorn nuovo', description: null, public: true, tags: ['meme'] } });
  assert.deepEqual(await client.deleteSound('42'), { ok: true, data: null });
  const missing = await client.updateSound('7', { name: 'x' });
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

const rawBoard = { id: '9', guildId: null, userId: '456', name: 'Arcade', thumbnailUrl: null, soundCount: 2, canEdit: true, public: true, sortMode: 'MANUAL', likes: 12, plays: 42, commentCount: 3, viewer: { vote: 'LIKE' } };
const otherSound = { ...rawSound, id: '43', name: 'bonk' };

test('soundboards follow the user contract and keep the manual key order', () => {
  const board = Soundboards.parse(rawBoard);
  assert.equal(board.guildId, null);
  assert.equal(board.vote, 'LIKE');
  assert.equal(board.sortMode, 'MANUAL');
  assert.equal(Soundboards.parse({ ...rawBoard, viewer: undefined, sortMode: 'X' }).vote, null);
  assert.equal(Soundboards.parse({ ...rawBoard, sortMode: 'X' }).sortMode, 'NAME_ASC');
  assert.equal(Soundboards.parse({ ...rawBoard, soundCount: undefined }).soundCount, null);
  const detail = Soundboards.parseDetail({ board: rawBoard, sounds: [rawSound, otherSound], soundIds: ['43', '77', '42'] }, '9');
  assert.deepEqual(detail.sounds.map((sound) => sound.id), ['43', '42']);
  assert.deepEqual(detail.hiddenIds, ['77']);
  assert.deepEqual(Soundboards.storedIds(detail), ['43', '42', '77']);
  assert.equal(detail.sounds[1].audioUrl, rawSound.url);
  const card = Soundboards.parseDetail({ board: rawBoard, sounds: [{ id: '5', name: 'Card', audioUrl: 'https://cdn.example.com/5.mp3', imageUrl: 'https://cdn.example.com/5.png' }] });
  assert.equal(card.sounds[0].imageUrl, 'https://cdn.example.com/5.png');
  assert.equal(Soundboards.parseDetail({ board: rawBoard, sounds: [rawSound] }, '10'), null);
  assert.equal(Soundboards.parseDetail({ board: rawBoard, sounds: 'nope' }, '9'), null);
  assert.deepEqual(Soundboards.parseVote({ soundboardId: '9', commentId: null, likes: 13, vote: null }), { likes: 13, vote: null });
  assert.equal(Soundboards.parseVote({ likes: 13, vote: 'DISLIKE' }), null);
});

test('soundboard names, keys and paths follow the contract', () => {
  assert.equal(Soundboards.readName('  Arcade  '), 'Arcade');
  assert.equal(Soundboards.readName('   '), null);
  assert.equal(Soundboards.readName('2026'), null);
  assert.equal(Soundboards.readName('a'.repeat(41)), null);
  assert.deepEqual(Soundboards.readSoundIds(['42', '42', '73', 'x', 5]), ['42', '73']);
  assert.deepEqual(Soundboards.readSoundIds('42'), ['42']);
  assert.equal(Soundboards.KEYS.length, Soundboards.MAX_SOUNDS);
  assert.equal(Soundboards.KEYS.includes('M'), false);
  assert.equal(Soundboards.keyOf(0), 'Q');
  assert.equal(Soundboards.keyOf(24), 'N');
  assert.equal(Soundboards.keyOf(25), null);
  assert.equal(Soundboards.guildPath('123', '9'), '/dashboard/123/soundboards/9/');
  assert.equal(Soundboards.placePath('9', '42'), '/dashboard/me/soundboards/9/add/42/');
  assert.equal(Soundboards.command('9'), '/soundboard play 9');
});

test('the client manages soundboards by id and reports errors', async (t) => {
  const calls = [];
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, method: options.method, body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body });
    if (options.method === 'PUT') return Response.json({ code: 'soundboard_full', message: 'x' }, { status: 409 });
    if (url.endsWith('/soundboards/10')) return Response.json({ code: 'not_found', message: 'x' }, { status: 404 });
    return Response.json({ board: rawBoard, sounds: [rawSound] });
  });
  const client = new BeebotClient(sessionEvent());
  const full = await client.addSoundboardSound('9', '42');
  assert.equal(full.status, 409);
  assert.equal(full.message, 'This soundboard is full. Remove a sound before adding another.');
  assert.equal(calls[0].url, 'https://api.safjnest.com/beebot/soundboards/9/sounds/42');
  const updated = await client.updateSoundboard('9', { sortMode: 'MANUAL', soundIds: ['42'] });
  assert.equal(updated.data.board.name, 'Arcade');
  assert.deepEqual(calls[1], { url: 'https://api.safjnest.com/beebot/soundboards/9', method: 'PATCH', body: { sortMode: 'MANUAL', soundIds: ['42'] } });
  assert.equal((await client.guildSoundboard('123', '9')).data.board.id, '9');
  assert.equal(calls[2].url, 'https://api.safjnest.com/beebot/guilds/123/soundboards/9');
  assert.equal((await client.soundboard('10')).message, Soundboards.NOT_FOUND);
});
