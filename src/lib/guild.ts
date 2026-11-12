export type SendType = 'CHANNEL' | 'PRIVATE' | 'BOTH';

export interface GuildChannel {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  position: number | null;
}

export interface ChannelGroup {
  id: string | null;
  name: string | null;
  channels: GuildChannel[];
}

export interface GuildRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
  assignable: boolean;
}

export interface SettingsProblem {
  field: string;
  code: string;
  message: string;
}

export interface GuildAlert {
  id: number | null;
  exists: boolean;
  enabled: boolean;
  valid: boolean;
  message: string | null;
  privateMessage: string | null;
  channelId: string | null;
  sendType: SendType;
  roleIds: string[];
  streamerId: string | null;
  roleId: string | null;
  level: number | null;
  temporary: boolean | null;
  problems: SettingsProblem[];
}

export interface ChannelSettings {
  experienceEnabled: boolean;
  experienceModifier: number;
  statisticsEnabled: boolean;
  leagueShard: string | null;
}

export interface AutomatedAction {
  id: number;
  action: number;
  roleId: string | null;
  actionTime: number;
  infractions: number;
  infractionsTime: number;
  actionMessage: string;
}

export interface GuildSettings {
  general: {
    prefix: string;
    experienceEnabled: boolean;
    voice: string;
    language: string;
    leagueShard: string | null;
  };
  blacklist: {
    enabled: boolean;
    threshold: number;
    channelId: string | null;
  };
  channels: Record<string, ChannelSettings>;
  welcome?: GuildAlert | null;
  leave?: GuildAlert | null;
  boost?: GuildAlert | null;
  levelUp?: GuildAlert | null;
  twitch: Record<string, GuildAlert>;
  reward: Record<string, GuildAlert>;
  warning: {
    actions: AutomatedAction[];
  };
}

export interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  channels: GuildChannel[];
  roles: GuildRole[];
  settings: GuildSettings;
}

export interface SettingsResult {
  guildId: string;
  section: string;
  key: string | null;
  ok: boolean;
  errors: SettingsProblem[];
  message: string | null;
}

export const SEND_TYPES: SendType[] = ['CHANNEL', 'PRIVATE', 'BOTH'];

export const LEAGUE_SHARDS = [
  { value: 'EUW1', label: 'EUW' },
  { value: 'EUN1', label: 'EUNE' },
  { value: 'NA1', label: 'NA' },
  { value: 'KR', label: 'KR' },
  { value: 'JP1', label: 'JP' },
  { value: 'BR1', label: 'BR' },
  { value: 'LA1', label: 'LAN' },
  { value: 'LA2', label: 'LAS' },
  { value: 'OC1', label: 'OCE' },
  { value: 'TR1', label: 'TR' },
  { value: 'RU', label: 'RU' },
  { value: 'ME1', label: 'ME' },
  { value: 'SG2', label: 'SEA' },
  { value: 'TW2', label: 'TW' },
  { value: 'VN2', label: 'VN' },
];

export const DEFAULT_CHANNEL_SETTINGS: ChannelSettings = {
  experienceEnabled: true,
  experienceModifier: 1,
  statisticsEnabled: true,
  leagueShard: null,
};

const DEFAULT_ROLE_COLOR = 0x1fffffff;

export function emptyAlert(): GuildAlert {
  return {
    id: null,
    exists: false,
    enabled: false,
    valid: true,
    message: '',
    privateMessage: '',
    channelId: null,
    sendType: 'CHANNEL',
    roleIds: [],
    streamerId: null,
    roleId: null,
    level: null,
    temporary: false,
    problems: [],
  };
}

export function parseGuild(value: unknown, guildId: string): Guild | null {
  const guild = value as Guild | null;
  if (!guild || guild.id !== guildId || typeof guild.name !== 'string' || !Array.isArray(guild.channels) ||
      !Array.isArray(guild.roles) || !guild.settings || typeof guild.settings !== 'object') return null;
  const { settings } = guild;
  return {
    ...guild,
    iconUrl: guild.iconUrl || null,
    settings: {
      ...settings,
      channels: settings.channels || {},
      twitch: settings.twitch || {},
      reward: settings.reward || {},
      warning: { actions: settings.warning?.actions || [] },
    },
  };
}

export function textChannels(guild: Guild) {
  return guild.channels.filter((channel) => channel.type === 'TEXT');
}

function byPosition(a: GuildChannel, b: GuildChannel) {
  return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name);
}

export function channelGroups(guild: Guild): ChannelGroup[] {
  const categories = guild.channels.filter((channel) => channel.type === 'CATEGORY').sort(byPosition);
  const channels = textChannels(guild).sort(byPosition);
  const categoryIds = new Set(categories.map((category) => category.id));
  return [
    { id: null, name: null, channels: channels.filter((channel) => !channel.parentId || !categoryIds.has(channel.parentId)) },
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      channels: channels.filter((channel) => channel.parentId === category.id),
    })),
  ].filter((group) => group.channels.length);
}

export function guildRoles(guild: Guild) {
  return guild.roles.filter((role) => role.id !== guild.id).sort((a, b) => b.position - a.position);
}

export function roleLock(role: GuildRole, canManage: boolean) {
  if (role.assignable) return null;
  if (role.managed) return 'Managed';
  return canManage ? 'Above Beebot' : 'Locked';
}

export function roleColor(role: GuildRole | undefined) {
  if (!role || role.color === DEFAULT_ROLE_COLOR) return undefined;
  return `#${role.color.toString(16).padStart(6, '0')}`;
}

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : name.trim().slice(0, 2);
  return letters.toUpperCase() || '?';
}

export function alertBadge(alert: GuildAlert | null | undefined) {
  if (!alert?.exists) return { label: 'Off', tone: '' };
  if (!alert.valid) return { label: 'Fix', tone: 'warning' };
  return alert.enabled ? { label: 'On', tone: 'accent' } : { label: 'Off', tone: '' };
}

export function formatDuration(seconds: number) {
  if (!seconds) return null;
  const units: [number, string][] = [[86400, 'd'], [3600, 'h'], [60, 'm'], [1, 's']];
  let rest = seconds;
  return units
    .map(([size, unit]) => {
      const value = Math.floor(rest / size);
      rest -= value * size;
      return value ? `${value}${unit}` : '';
    })
    .join('');
}
