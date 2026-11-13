export interface CommandOption {
  name: string;
  description: string;
  required: boolean;
}

export interface CommandSourceChild {
  help: string;
  longhelp?: string;
  cooldown?: string;
  options?: CommandOption[];
}

export interface CommandSourceEntry {
  alias?: string[];
  help: string;
  longhelp?: string;
  category: string;
  arguments?: string;
  cooldown?: string;
  text: boolean;
  slash: boolean;
  options?: CommandOption[];
  children?: Record<string, CommandSourceChild>;
}

export type CommandSource = Record<string, CommandSourceEntry>;

export type CommandKind = 'slash' | 'prefix';

export interface CommandArgument {
  label: string;
  required: boolean;
  description: string;
}

export interface CommandLine {
  kind: CommandKind;
  parent: string;
  name: string;
  args: CommandArgument[];
}

export interface CommandUsage {
  key: string;
  lines: CommandLine[];
  help: string;
  details: string;
  aliases: string[];
  cooldown: number | null;
  search: string;
}

export interface CommandEntry {
  name: string;
  help: string;
  details: string;
  cooldown: number | null;
  slash: boolean;
  prefix: boolean;
  usages: CommandUsage[];
  search: string;
}

export interface CommandCategory {
  id: string;
  label: string;
  count: number;
  entries: CommandEntry[];
}

export interface CommandCatalog {
  total: number;
  categories: CommandCategory[];
}

export const DEFAULT_PREFIX = '!';

const HIDDEN_CATEGORIES = new Set(['Owner']);

const isPublic = (command: CommandSourceEntry | undefined): command is CommandSourceEntry =>
  !!command && !HIDDEN_CATEGORIES.has(command.category) && (command.text || command.slash);

const categoryId = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const cooldownOf = (value: string | undefined) => {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

const detailsOf = (help: string, longhelp: string | undefined) => {
  const text = (longhelp ?? '').replace(/\*\*/g, '').trim();
  return text && text !== help ? text : '';
};

const optionArgs = (options: CommandOption[] | undefined): CommandArgument[] =>
  (options ?? []).map((option) => ({ label: option.name, required: option.required, description: option.description }));

function textArgs(usage: string | undefined): CommandArgument[] {
  return [...(usage ?? '').matchAll(/\[([^[\]()]+)\]|\(([^[\]()]+)\)/g)]
    .map((match, index) => ({ label: (match[1] ?? match[2]).trim(), required: match[1] !== undefined, index }))
    .filter((arg) => arg.label !== 'CommandName' && !(arg.index === 0 && /^[a-z]+$/.test(arg.label)))
    .map(({ label, required }) => ({ label, required, description: '' }));
}

const slashLine = (parent: string, name: string, options: CommandOption[] | undefined): CommandLine => ({
  kind: 'slash',
  parent,
  name,
  args: optionArgs(options),
});

const prefixLine = (name: string, usage: string | undefined, options: CommandOption[] | undefined): CommandLine => ({
  kind: 'prefix',
  parent: '',
  name,
  args: options?.length ? optionArgs(options) : textArgs(usage),
});

const aliasesOf = (command: CommandSourceEntry, name: string) => (command.alias ?? []).filter((alias) => alias && alias !== name);

function usage(key: string, lines: CommandLine[], extra: Partial<Pick<CommandUsage, 'help' | 'details' | 'aliases' | 'cooldown'>> = {}): CommandUsage {
  const aliases = extra.aliases ?? [];
  const help = extra.help ?? '';
  return {
    key,
    lines,
    help,
    details: extra.details ?? '',
    aliases,
    cooldown: extra.cooldown ?? null,
    search: [...lines.map((line) => line.parent + line.name), ...aliases, help].join(' ').toLowerCase(),
  };
}

function entry(name: string, command: CommandSourceEntry, source: CommandSource): CommandEntry {
  const children = Object.entries(command.children ?? {});
  const usages: CommandUsage[] = [];

  if (children.length) {
    if (command.text) {
      usages.push(usage(name, [prefixLine(name, command.arguments, command.options)], { aliases: aliasesOf(command, name) }));
    }
    for (const [child, sub] of children) {
      const twin = prefixTwin(source, name, child);
      const lines = [slashLine(`${name} `, child, sub.options)];
      if (twin) lines.push(prefixLine(name + child, twin.arguments, sub.options));
      usages.push(
        usage(`${name} ${child}`, lines, {
          help: sub.help,
          details: detailsOf(sub.help, sub.longhelp),
          aliases: twin ? aliasesOf(twin, name + child) : [],
          cooldown: cooldownOf(sub.cooldown ?? twin?.cooldown),
        }),
      );
    }
  } else {
    const lines: CommandLine[] = [];
    if (command.slash) lines.push(slashLine('', name, command.options));
    if (command.text) lines.push(prefixLine(name, command.arguments, command.options));
    usages.push(usage(name, lines, { aliases: command.text ? aliasesOf(command, name) : [] }));
  }

  const kinds = new Set(usages.flatMap((item) => item.lines.map((line) => line.kind)));
  return {
    name,
    help: command.help,
    details: detailsOf(command.help, command.longhelp),
    cooldown: children.length ? null : cooldownOf(command.cooldown),
    slash: kinds.has('slash'),
    prefix: kinds.has('prefix'),
    usages,
    search: [name, command.help, command.longhelp ?? ''].join(' ').toLowerCase(),
  };
}

function prefixTwin(source: CommandSource, parent: string, child: string) {
  const twin = source[parent + child];
  return isPublic(twin) && twin.text && !twin.slash && !twin.children ? twin : null;
}

export function buildCommandCatalog(source: CommandSource): CommandCatalog {
  const twins = new Set<string>();
  for (const [name, command] of Object.entries(source)) {
    for (const child of Object.keys(command.children ?? {})) {
      if (prefixTwin(source, name, child)) twins.add(name + child);
    }
  }

  const categories: CommandCategory[] = [];
  for (const [name, command] of Object.entries(source)) {
    if (!isPublic(command) || twins.has(name)) continue;
    let category = categories.find((item) => item.label === command.category);
    if (!category) {
      category = { id: categoryId(command.category), label: command.category, count: 0, entries: [] };
      categories.push(category);
    }
    const item = entry(name, command, source);
    category.entries.push(item);
    category.count += item.usages.length;
  }

  return { total: categories.reduce((sum, category) => sum + category.count, 0), categories };
}
