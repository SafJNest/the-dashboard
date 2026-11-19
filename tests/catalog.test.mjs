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
const endpoints = await load('../src/lib/beebot/endpoints.ts');
const catalog = (await load('../src/lib/catalog.ts', { "'./sounds'": JSON.stringify(sounds.url), "'./beebot/endpoints'": JSON.stringify(endpoints.url) })).module;
const { withQuery, ENDPOINTS } = endpoints.module;

const card = { id: '42', name: 'Airhorn', public: true, createdAt: '2026-11-01T10:00:00Z', durationMs: 2088, audioUrl: 'https://cdn.example.com/sounds/42/42.mp3', imageUrl: null, uploader: { id: '456', name: 'Luna', avatarUrl: null }, tags: [{ id: '1', name: 'meme' }], plays: 18, listeners: 7, likes: 4, dislikes: 1, commentCount: 2 };

test('sound card parses guest and viewer forms', () => {
  assert.equal(catalog.parseSoundCard(card).viewer, null);
  assert.deepEqual(catalog.parseSoundCard({ ...card, viewer: { ownedByMe: false, vote: 'LIKE' } }).viewer, { ownedByMe: false, vote: 'LIKE' });
  assert.equal(catalog.parseSoundCard({ ...card, viewer: { ownedByMe: false, vote: 'MEH' } }), null);
  assert.equal(catalog.parseSoundCard({ ...card, uploader: null }), null);
});

test('catalog query drops defaults and maps length presets', () => {
  assert.equal(withQuery(ENDPOINTS.publicSounds, catalog.catalogQuery({})), '/public/sounds');
  assert.equal(withQuery(ENDPOINTS.publicSounds, catalog.catalogQuery({ q: '  air ', length: 'short', sort: null })), '/public/sounds?q=air&maxDurationMs=3000');
  assert.equal(withQuery(ENDPOINTS.publicSounds, catalog.catalogQuery({ tag: 'arcade', cursor: 'abc' })), '/public/sounds?tag=arcade&cursor=abc');
  assert.equal(withQuery(ENDPOINTS.publicComments('42'), catalog.commentQuery({ sort: 'top', parentId: '7' })), '/public/sounds/42/comments?parentId=7');
});

test('comments keep deleted placeholders and votes', () => {
  const page = catalog.parseCommentPage({ items: [{ id: '7', soundId: '42', parentId: null, author: null, text: null, createdAt: '2026-11-01T10:00:00Z', editedAt: null, deleted: true, pinned: false, hearted: false, likes: 0, replyCount: 2, uploader: false }], nextCursor: null });
  assert.equal(page.items[0].deleted, true);
  assert.equal(page.items[0].author, null);
  assert.deepEqual(catalog.parseSoundVoteResult({ soundId: '42', commentId: null, likes: 5, dislikes: 1, vote: null }), { likes: 5, dislikes: 1, vote: null });
});
