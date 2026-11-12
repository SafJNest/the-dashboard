import { DEFAULT_CHANNEL_SETTINGS, LEAGUE_SHARDS, SEND_TYPES, type ChannelSettings, type SendType, type SettingsProblem } from './guild';

type FormValues = Record<string, unknown>;

interface AlertSpec {
  channel?: boolean;
  roles?: 'multi' | 'single';
  temporary?: boolean;
  keyed?: boolean;
}

const ALERTS: Record<string, AlertSpec> = {
  welcome: { channel: true, roles: 'multi' },
  leave: { channel: true },
  boost: { channel: true, roles: 'multi' },
  levelUp: {},
  reward: { roles: 'multi', temporary: true, keyed: true },
  twitch: { channel: true, roles: 'single', keyed: true },
};

const ID = /^\d{1,20}$/;
const MESSAGE_LIMIT = 2000;

export class SettingsInputError extends Error {}

function text(form: FormValues, name: string) {
  const value = form[name];
  return typeof value === 'string' ? value : '';
}

function flag(form: FormValues, name: string) {
  return form[name] === 'on';
}

function optionalId(form: FormValues, name: string) {
  const value = text(form, name);
  if (!value) return null;
  if (!ID.test(value)) throw new SettingsInputError(name);
  return value;
}

function ids(form: FormValues, name: string) {
  const value = form[name];
  const list = Array.isArray(value) ? value : value === undefined ? [] : [value];
  if (!list.every((item): item is string => typeof item === 'string' && ID.test(item))) throw new SettingsInputError(name);
  return [...new Set(list)];
}

function message(form: FormValues, name: string) {
  const value = text(form, name);
  if (value.length > MESSAGE_LIMIT) throw new SettingsInputError(name);
  return value;
}

function alertBody(form: FormValues, spec: AlertSpec) {
  const sendType = text(form, 'sendType') as SendType;
  if (!SEND_TYPES.includes(sendType)) throw new SettingsInputError('sendType');
  const alert: Record<string, unknown> = {
    enabled: flag(form, 'enabled'),
    message: message(form, 'message'),
    privateMessage: message(form, 'privateMessage'),
    sendType,
  };
  if (spec.channel) alert.channelId = optionalId(form, 'channelId');
  if (spec.roles === 'multi') alert.roleIds = ids(form, 'roleIds');
  if (spec.roles === 'single') alert.roleId = optionalId(form, 'roleId');
  if (spec.temporary) alert.temporary = flag(form, 'temporary');
  return alert;
}

function experienceChannels(form: FormValues) {
  const channels: Record<string, ChannelSettings> = {};
  for (const name of Object.keys(form)) {
    if (!name.startsWith('orig:')) continue;
    const id = name.slice(5);
    if (!ID.test(id)) throw new SettingsInputError(name);
    let original: ChannelSettings;
    try {
      original = { ...DEFAULT_CHANNEL_SETTINGS, ...JSON.parse(text(form, name)) };
    } catch {
      throw new SettingsInputError(name);
    }
    const experienceEnabled = flag(form, `xp:${id}`);
    const experienceModifier = Number(text(form, `mod:${id}`));
    if (!Number.isFinite(experienceModifier) || experienceModifier < 0) throw new SettingsInputError(`mod:${id}`);
    if (experienceEnabled === original.experienceEnabled && experienceModifier === original.experienceModifier) continue;
    channels[id] = {
      experienceEnabled,
      experienceModifier,
      statisticsEnabled: original.statisticsEnabled,
      leagueShard: original.leagueShard,
    };
  }
  return channels;
}

export function buildSettingsBody(form: FormValues) {
  const section = text(form, 'section');
  const key = text(form, 'key') || null;
  const spec = ALERTS[section];
  if (spec) {
    if (spec.keyed && (!key || !ID.test(key))) throw new SettingsInputError('key');
    const alert = alertBody(form, spec);
    return { section, key, body: { [section]: spec.keyed ? { [key as string]: alert } : alert } };
  }
  if (section === 'general') {
    const prefix = text(form, 'prefix').trim();
    const leagueShard = text(form, 'leagueShard') || null;
    if (!prefix) throw new SettingsInputError('prefix');
    if (leagueShard && !LEAGUE_SHARDS.some((shard) => shard.value === leagueShard)) throw new SettingsInputError('leagueShard');
    return {
      section,
      key,
      body: { general: { prefix, language: text(form, 'language').trim(), voice: text(form, 'voice').trim(), leagueShard } },
    };
  }
  if (section === 'blacklist') {
    const threshold = Number(text(form, 'threshold'));
    if (!Number.isInteger(threshold) || threshold < 1) throw new SettingsInputError('threshold');
    return {
      section,
      key,
      body: { blacklist: { enabled: flag(form, 'enabled'), threshold, channelId: optionalId(form, 'channelId') } },
    };
  }
  if (section === 'experience') {
    const channels = experienceChannels(form);
    const body: Record<string, unknown> = { general: { experienceEnabled: flag(form, 'experienceEnabled') } };
    if (Object.keys(channels).length) body.channels = channels;
    return { section, key, body };
  }
  throw new SettingsInputError('section');
}

export function readSettingsResult(value: unknown) {
  const errors: SettingsProblem[] = [];
  let failed = false;
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== 'object' || depth > 3) return;
    const record = node as Record<string, unknown>;
    if (typeof record.status === 'string') {
      if (record.status === 'error') failed = true;
      if (Array.isArray(record.errors)) {
        for (const error of record.errors as Record<string, unknown>[]) {
          if (typeof error?.message !== 'string') continue;
          errors.push({
            field: typeof error.field === 'string' ? error.field : '',
            code: typeof error.code === 'string' ? error.code : '',
            message: error.message,
          });
        }
      }
      return;
    }
    for (const child of Object.values(record)) visit(child, depth + 1);
  };
  visit(value, 0);
  return { failed: failed || errors.length > 0, errors };
}
