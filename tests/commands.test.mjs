import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/commands.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { buildCommandCatalog } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const commands = JSON.parse(await readFile(new URL('../src/data/commands.json', import.meta.url), 'utf8'));

const catalog = buildCommandCatalog(commands);
const entries = catalog.categories.flatMap((category) => category.entries);
const find = (name) => entries.find((entry) => entry.name === name);
const format = (line) => `${line.kind === 'slash' ? '/' : '!'}${line.parent}${line.name}`;

test('owner commands are not public', () => {
  assert.ok(!catalog.categories.some((category) => category.label === 'Owner'));
  assert.equal(find('shutdown'), undefined);
  assert.equal(find('test'), undefined);
});

test('a text command named after a subcommand becomes its prefix form', () => {
  assert.equal(find('playsound'), undefined);
  const sound = find('play').usages.find((usage) => usage.key === 'play sound');
  assert.deepEqual(sound.lines.map(format), ['/play sound', '!playsound']);
  assert.deepEqual(sound.aliases, ['p', 'ps']);
});

test('a group that is also a text command keeps its prefix form before the subcommands', () => {
  const list = find('list');
  assert.deepEqual(list.usages.map((usage) => usage.lines.map(format)), [['!list'], ['/list user', '!listuser'], ['/list guild']]);
  assert.ok(list.slash && list.prefix);
});

test('slash options describe arguments and aliases apply only to prefix commands', () => {
  const tts = find('tts');
  assert.deepEqual(tts.usages[0].lines.map((line) => line.args.map((arg) => [arg.label, arg.required])), [
    [['text', true], ['voice', false]],
    [['text', true], ['voice', false]],
  ]);
  assert.deepEqual(tts.usages[0].aliases, ['t']);
  assert.deepEqual(find('voice').usages[0].aliases, []);
});

test('category counts add up to the total', () => {
  assert.equal(catalog.total, catalog.categories.reduce((sum, category) => sum + category.count, 0));
  assert.equal(catalog.total, entries.reduce((sum, entry) => sum + entry.usages.length, 0));
});
