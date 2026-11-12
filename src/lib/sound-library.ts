import { mergeDays, viewFromGuildStats, viewFromSoundAnalytics, type SoundView } from './sound-stats';
import type { DayPlays, GuildSoundAnalytics, GuildSoundLibrary, LibrarySummary, MySoundAnalytics, MySoundLibrary, Period, Sound } from './sounds';

export type Owner = 'all' | 'mine' | 'others';
export type DetailTab = 'everyone' | 'mine';

export interface LibraryEntry {
  sound: Sound;
  guildName: string;
  plays: number;
}

export interface RankedSound {
  id: string;
  name: string;
  detail: string;
  value: number;
}

export interface LibraryModel {
  scope: 'guild' | 'me';
  basePath: string;
  period: Period;
  timezone: string;
  summary: LibrarySummary;
  entries: LibraryEntry[];
  owner: Owner;
  ownerCounts: Record<Owner, number>;
  guildId: string | null;
  guilds: { id: string; name: string; count: number }[];
  guildNames: Record<string, string>;
  selected: LibraryEntry | null;
  view: SoundView | null;
  tab: DetailTab;
  overview: { days: DayPlays[]; top: RankedSound[]; liked: RankedSound[] };
}

export const UNKNOWN_GUILD = 'Unavailable server';
export const OTHER_GUILDS = 'Other servers';

export function readOwner(value: string | null): Owner {
  return value === 'mine' || value === 'others' ? value : 'all';
}

export function readTab(value: string | null): DetailTab {
  return value === 'mine' ? 'mine' : 'everyone';
}

export function libraryHref(url: URL, changes: Record<string, string | null>, path = url.pathname) {
  const params = new URLSearchParams(url.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  const search = params.toString();
  return `${path}${search ? `?${search}` : ''}`;
}

export function soundHref(model: LibraryModel, url: URL, soundId: string) {
  return libraryHref(url, {}, `${model.basePath}${soundId}/`);
}

function pick(entries: LibraryEntry[], soundId: string | undefined) {
  return entries.find((entry) => entry.sound.id === soundId) ?? entries[0] ?? null;
}

function rank(entries: { sound: Sound; detail: string; value: number }[]): RankedSound[] {
  return entries
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(({ sound, detail, value }) => ({ id: sound.id, name: sound.name, detail, value }));
}

export function guildLibraryModel(data: { period: Period; library: GuildSoundLibrary; analytics: GuildSoundAnalytics }, url: URL, soundId: string | undefined, guildName: string): LibraryModel {
  const { library, analytics } = data;
  const stats = new Map(analytics.sounds.map((entry) => [entry.soundId, entry]));
  const all = library.sounds.map((sound) => ({ sound, guildName, plays: stats.get(sound.id)?.plays ?? 0 }));
  const owner = readOwner(url.searchParams.get('owner'));
  const entries = owner === 'all' ? all : all.filter((entry) => entry.sound.ownedByMe === (owner === 'mine'));
  const selected = pick(entries, soundId);
  const byId = new Map(library.sounds.map((sound) => [sound.id, sound]));
  const ranked = (items: { soundId: string; value: number }[]) =>
    rank(items.flatMap((item) => {
      const sound = byId.get(item.soundId);
      return sound ? [{ sound, detail: sound.ownedByMe ? 'you' : sound.uploader.name, value: item.value }] : [];
    }));
  return {
    scope: 'guild',
    basePath: `/dashboard/${library.guildId}/sounds/`,
    period: data.period,
    timezone: analytics.timezone,
    summary: library.summary,
    entries,
    owner,
    ownerCounts: { all: all.length, mine: all.filter((entry) => entry.sound.ownedByMe).length, others: all.filter((entry) => !entry.sound.ownedByMe).length },
    guildId: library.guildId,
    guilds: [],
    guildNames: { [library.guildId]: guildName },
    selected,
    view: selected ? viewFromGuildStats(stats.get(selected.sound.id)) : null,
    tab: readTab(url.searchParams.get('tab')),
    overview: { days: analytics.playsPerDay, top: ranked(analytics.topSounds), liked: ranked(analytics.mostLiked) },
  };
}

export function myLibraryModel(data: { period: Period; library: MySoundLibrary; analytics: MySoundAnalytics }, url: URL, soundId: string | undefined): LibraryModel {
  const { library, analytics } = data;
  const guildNames = Object.fromEntries(library.guilds.map((group) => [group.guildId, group.name ?? UNKNOWN_GUILD]));
  const stats = new Map(analytics.sounds.map((entry) => [entry.soundId, entry]));
  const requested = url.searchParams.get('guild');
  const guildId = requested && guildNames[requested] ? requested : null;
  const views = new Map<string, SoundView>();
  const viewOf = (sound: Sound) => {
    let view = views.get(sound.id);
    if (!view) {
      view = viewFromSoundAnalytics(stats.get(sound.id), guildId);
      views.set(sound.id, view);
    }
    return view;
  };
  const scoped = library.guilds.filter((group) => !guildId || group.guildId === guildId);
  const entries = scoped
    .flatMap((group) => group.sounds.map((sound) => ({ sound, guildName: guildNames[group.guildId], plays: viewOf(sound).plays })))
    .sort((a, b) => b.plays - a.plays || b.sound.plays - a.sound.plays);
  const selected = pick(entries, soundId);
  const count = library.guilds.reduce((total, group) => total + group.sounds.length, 0);
  return {
    scope: 'me',
    basePath: '/dashboard/me/sounds/',
    period: data.period,
    timezone: analytics.timezone,
    summary: library.summary,
    entries,
    owner: 'all',
    ownerCounts: { all: count, mine: count, others: 0 },
    guildId,
    guilds: library.guilds.map((group) => ({ id: group.guildId, name: guildNames[group.guildId], count: group.sounds.length })),
    guildNames,
    selected,
    view: selected ? viewOf(selected.sound) : null,
    tab: readTab(url.searchParams.get('tab')),
    overview: {
      days: mergeDays(entries.map((entry) => viewOf(entry.sound).playsPerDay)),
      top: rank(entries.map((entry) => ({ sound: entry.sound, detail: entry.guildName, value: entry.plays }))),
      liked: rank(entries.map((entry) => ({ sound: entry.sound, detail: entry.guildName, value: entry.sound.likes }))),
    },
  };
}
