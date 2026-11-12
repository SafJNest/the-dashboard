import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  for (const [from, to] of Object.entries(replacements)) source = source.replace(from, to);
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  return { url, module: await import(url) };
}

const guild = await load('../src/lib/guild.ts');
const { buildSettingsBody, readSettingsResult, SettingsInputError } = (await load('../src/lib/settings.ts', { "'./guild'": JSON.stringify(guild.url) })).module;

test('alert forms post only the changed section with its editable fields', () => {
  const request = buildSettingsBody({
    section: 'welcome',
    enabled: 'on',
    message: 'Hi #user',
    privateMessage: '',
    sendType: 'BOTH',
    channelId: '1094186395716817107',
    roleIds: ['732671413366030437', '732671413366030437'],
  });
  assert.deepEqual(request.body, {
    welcome: {
      enabled: true,
      message: 'Hi #user',
      privateMessage: '',
      sendType: 'BOTH',
      channelId: '1094186395716817107',
      roleIds: ['732671413366030437'],
    },
  });
});

test('keyed alerts are nested under their streamer or level', () => {
  const twitch = buildSettingsBody({ section: 'twitch', key: '30264374', message: 'Live', sendType: 'CHANNEL', channelId: '', roleId: '732671413366030437' });
  assert.deepEqual(twitch.body, { twitch: { 30264374: { enabled: false, message: 'Live', privateMessage: '', sendType: 'CHANNEL', channelId: null, roleId: '732671413366030437' } } });
  const reward = buildSettingsBody({ section: 'reward', key: '10', message: 'GG', sendType: 'PRIVATE', temporary: 'on' });
  assert.deepEqual(reward.body, { reward: { 10: { enabled: false, message: 'GG', privateMessage: '', sendType: 'PRIVATE', roleIds: [], temporary: true } } });
});

test('experience sends only the channels that changed', () => {
  const original = JSON.stringify({ experienceEnabled: true, experienceModifier: 1, statisticsEnabled: false, leagueShard: 'EUW1' });
  const request = buildSettingsBody({
    section: 'experience',
    experienceEnabled: 'on',
    'orig:1': original,
    'xp:1': 'on',
    'mod:1': '1',
    'orig:2': original,
    'mod:2': '2.5',
  });
  assert.deepEqual(request.body, {
    general: { experienceEnabled: true },
    channels: { 2: { experienceEnabled: false, experienceModifier: 2.5, statisticsEnabled: false, leagueShard: 'EUW1' } },
  });
});

test('invalid input is rejected before contacting Beebot', () => {
  const invalid = [
    { section: 'unknown' },
    { section: 'welcome', sendType: 'EVERYONE' },
    { section: 'welcome', sendType: 'CHANNEL', channelId: '../servers' },
    { section: 'welcome', sendType: 'CHANNEL', message: 'x'.repeat(2001) },
    { section: 'twitch', sendType: 'CHANNEL' },
    { section: 'blacklist', threshold: '0' },
    { section: 'general', prefix: ' ' },
  ];
  for (const form of invalid) assert.throws(() => buildSettingsBody(form), SettingsInputError);
});

test('backend errors are collected from every changed section', () => {
  const result = readSettingsResult({
    leave: { status: 'error', errors: [{ field: 'channelId', code: 'invalid_channel', message: 'Canale testuale non presente nella guild' }], alert: {} },
    general: { status: 'ok', errors: [] },
  });
  assert.equal(result.failed, true);
  assert.deepEqual(result.errors, [{ field: 'channelId', code: 'invalid_channel', message: 'Canale testuale non presente nella guild' }]);
  assert.deepEqual(readSettingsResult({ welcome: { status: 'ok', errors: [] } }), { failed: false, errors: [] });
});

test('channel groups put uncategorized channels first and order by Discord position', () => {
  const { channelGroups } = guild.module;
  const groups = channelGroups({
    id: '1',
    channels: [
      { id: 'c2', name: 'Staff', type: 'CATEGORY', parentId: null, position: 2 },
      { id: 'c1', name: 'Info', type: 'CATEGORY', parentId: null, position: 1 },
      { id: 't3', name: 'logs', type: 'TEXT', parentId: 'c2', position: 0 },
      { id: 't2', name: 'rules', type: 'TEXT', parentId: 'c1', position: 1 },
      { id: 't1', name: 'welcome', type: 'TEXT', parentId: 'c1', position: 0 },
      { id: 't0', name: 'general', type: 'TEXT', parentId: null, position: 5 },
      { id: 'v1', name: 'Voice', type: 'VOICE', parentId: 'c1', position: 2 },
      { id: 'c3', name: 'Empty', type: 'CATEGORY', parentId: null, position: 3 },
    ],
  });
  assert.deepEqual(groups.map((group) => [group.name, group.channels.map((channel) => channel.id)]), [
    [null, ['t0']],
    ['Info', ['t1', 't2']],
    ['Staff', ['t3']],
  ]);
});

test('role lock explains why a role cannot be assigned', () => {
  const { roleLock } = guild.module;
  assert.equal(roleLock({ assignable: true, managed: false }, true), null);
  assert.equal(roleLock({ assignable: false, managed: true }, true), 'Managed');
  assert.equal(roleLock({ assignable: false, managed: false }, true), 'Above Beebot');
  assert.equal(roleLock({ assignable: false, managed: false }, false), 'Locked');
});
