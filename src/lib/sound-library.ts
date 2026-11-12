import type { LoadFailure } from './beebot.server';
import { mergeDays, viewFromGuildStats, viewFromSoundAnalytics, type SoundView } from './sound-stats';
import { type DayPlays, type GuildSoundAnalytics, type GuildSoundLibrary, type LibrarySummary, type MySoundAnalytics, type MySoundLibrary, type Period, type Sound } from './sounds';

export type Owner = 'all' | 'mine' | 'others';
export type DetailTab = 'everyone' | 'mine';
export type SortOrder = 'name' | 'plays';

export interface LibraryEntry {
  sound: Sound;
  guildName: string;
}

export interface RankedSound {
  id: string;
  name: string;
  detail: string;
  value: number;
}

export interface LibraryModel {
  scope: 'guild' | 'me';
  rootPath: string;
  basePath: string;
  period: Period;
  summary: LibrarySummary;
  all: LibraryEntry[];
  entries: LibraryEntry[];
  owner: Owner;
  ownerCounts: Record<Owner, number>;
  guildId: string | null;
  guildMissing: boolean;
  guilds: { id: string; name: string; count: number }[];
  guildNames: Record<string, string>;
  selected: LibraryEntry | null;
  missing: boolean;
  tab: DetailTab;
  sort: SortOrder;
}

export interface LibraryView {
  owner: Owner;
  sort: SortOrder;
  tab: DetailTab;
  period: Period | null;
}

export const DEFAULT_VIEW: LibraryView = { owner: 'all', sort: 'name', tab: 'everyone', period: null };

export interface LibraryStats {
  period: Period;
  timezone: string;
  view: SoundView | null;
  overview: { days: DayPlays[]; top: RankedSound[]; liked: RankedSound[] };
}

interface LoadKey {
  period: Period;
  guildId: string | null;
}

type Loaded<K extends string, T> = LoadKey & { failed?: undefined } & Record<K, T>;
type Failed = LoadKey & LoadFailure;

export type GuildLibraryLoad = Loaded<'library', GuildSoundLibrary> | Failed;
export type MyLibraryLoad = Loaded<'library', MySoundLibrary> | Failed;
export type GuildStatsLoad = Loaded<'analytics', GuildSoundAnalytics> | Failed;
export type MyStatsLoad = Loaded<'analytics', MySoundAnalytics> | Failed;

export type LibraryLoad =
  | { scope: 'guild'; guildId: string; guildName: string; library: GuildLibraryLoad; analytics?: GuildStatsLoad }
  | { scope: 'me'; library: MyLibraryLoad; analytics?: MyStatsLoad };

export type LibraryState =
  | { status: 'stale' }
  | { status: 'failed'; failure: LoadFailure }
  | { status: 'ready'; model: LibraryModel; updating: boolean };

export const UNKNOWN_GUILD = 'Unavailable server';
export const LOAD_ERROR = "Couldn't load this data. Check your connection and try again.";
export const OTHER_GUILDS = 'Other servers';
export const MY_SOUNDS_PATH = '/dashboard/me/sounds/';

export function guildSoundsPath(guildId: string) {
  return `/dashboard/${guildId}/sounds/`;
}

export function mySoundsPath(guildId: string | null) {
  return guildId ? `${MY_SOUNDS_PATH}guild/${guildId}/` : MY_SOUNDS_PATH;
}

export function soundHref(model: Pick<LibraryModel, 'basePath'>, soundId: string) {
  return `${model.basePath}${soundId}/`;
}

function compareIds(a: string, b: string) {
  return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
}

function byName(a: LibraryEntry, b: LibraryEntry) {
  return a.sound.name.localeCompare(b.sound.name, 'en') || compareIds(a.sound.id, b.sound.id);
}

function sortEntries(entries: LibraryEntry[], sort: SortOrder) {
  if (sort !== 'plays') return entries;
  return [...entries].sort((a, b) => b.sound.plays - a.sound.plays || byName(a, b));
}

function select(entries: LibraryEntry[], all: LibraryEntry[], soundId: string | undefined) {
  if (!soundId) return { selected: entries[0] ?? null, missing: false };
  const selected = all.find((entry) => entry.sound.id === soundId) ?? null;
  return { selected, missing: !selected };
}

function rank(entries: { sound: Sound; detail: string; value: number }[]): RankedSound[] {
  return entries
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(({ sound, detail, value }) => ({ id: sound.id, name: sound.name, detail, value }));
}

export function guildLibraryModel(data: { period: Period; library: GuildSoundLibrary }, soundId: string | undefined, guildName: string, view = DEFAULT_VIEW): LibraryModel {
  const { library } = data;
  const all = library.sounds.map((sound) => ({ sound, guildName })).sort(byName);
  const { owner } = view;
  const entries = sortEntries(owner === 'all' ? all : all.filter((entry) => entry.sound.ownedByMe === (owner === 'mine')), view.sort);
  const path = guildSoundsPath(library.guildId);
  return {
    scope: 'guild',
    rootPath: path,
    basePath: path,
    period: data.period,
    summary: library.summary,
    all,
    entries,
    owner,
    ownerCounts: { all: all.length, mine: all.filter((entry) => entry.sound.ownedByMe).length, others: all.filter((entry) => !entry.sound.ownedByMe).length },
    guildId: library.guildId,
    guildMissing: false,
    guilds: [],
    guildNames: { [library.guildId]: guildName },
    ...select(entries, all, soundId),
    tab: view.tab,
    sort: view.sort,
  };
}

export function myLibraryModel(data: { period: Period; library: MySoundLibrary }, soundId: string | undefined, guildId: string | undefined, view = DEFAULT_VIEW): LibraryModel {
  const { library } = data;
  const guildNames = Object.fromEntries(library.guilds.map((group) => [group.guildId, group.name ?? UNKNOWN_GUILD]));
  const all = library.guilds.flatMap((group) => group.sounds.map((sound) => ({ sound, guildName: guildNames[group.guildId] }))).sort(byName);
  const filter = guildId ?? null;
  const guildMissing = filter !== null && !(filter in guildNames);
  const scoped = new Set(library.guilds.find((group) => group.guildId === filter)?.sounds.map((sound) => sound.id));
  const entries = sortEntries(filter ? all.filter((entry) => scoped.has(entry.sound.id)) : all, view.sort);
  return {
    scope: 'me',
    rootPath: MY_SOUNDS_PATH,
    basePath: mySoundsPath(filter),
    period: data.period,
    summary: library.summary,
    all,
    entries,
    owner: 'all',
    ownerCounts: { all: all.length, mine: all.length, others: 0 },
    guildId: filter,
    guildMissing,
    guilds: library.guilds.map((group) => ({ id: group.guildId, name: guildNames[group.guildId], count: group.sounds.length })),
    guildNames,
    ...(guildMissing ? { selected: null, missing: false } : select(entries, all, soundId)),
    tab: view.tab,
    sort: view.sort,
  };
}

export function guildLibraryStats(model: LibraryModel, data: { period: Period; analytics: GuildSoundAnalytics }): LibraryStats {
  const { analytics } = data;
  const stats = new Map(analytics.sounds.map((entry) => [entry.soundId, entry]));
  const byId = new Map(model.all.map((entry) => [entry.sound.id, entry.sound]));
  const ranked = (items: { soundId: string; value: number }[]) =>
    rank(items.flatMap((item) => {
      const sound = byId.get(item.soundId);
      return sound ? [{ sound, detail: sound.ownedByMe ? 'you' : sound.uploader.name, value: item.value }] : [];
    }));
  return {
    period: data.period,
    timezone: analytics.timezone,
    view: model.selected ? viewFromGuildStats(stats.get(model.selected.sound.id)) : null,
    overview: { days: analytics.playsPerDay, top: ranked(analytics.topSounds), liked: ranked(analytics.mostLiked) },
  };
}

export function myLibraryStats(model: LibraryModel, data: { period: Period; analytics: MySoundAnalytics }): LibraryStats {
  const { analytics } = data;
  const stats = new Map(analytics.sounds.map((entry) => [entry.soundId, entry]));
  const viewOf = (sound: Sound) => viewFromSoundAnalytics(stats.get(sound.id), model.guildId);
  const views = model.entries.map((entry) => ({ entry, view: viewOf(entry.sound) }));
  return {
    period: data.period,
    timezone: analytics.timezone,
    view: model.selected ? viewOf(model.selected.sound) : null,
    overview: {
      days: mergeDays(views.map(({ view }) => view.playsPerDay)),
      top: rank(views.map(({ entry, view }) => ({ sound: entry.sound, detail: entry.guildName, value: view.plays }))),
      liked: rank(model.entries.map((entry) => ({ sound: entry.sound, detail: entry.guildName, value: entry.sound.likes }))),
    },
  };
}

function expectedGuild(load: LibraryLoad) {
  return load.scope === 'guild' ? load.guildId : null;
}

export function readLibrary(load: LibraryLoad, params: Record<string, string | undefined>, view = DEFAULT_VIEW): LibraryState {
  const data = load.library;
  if (data.guildId !== expectedGuild(load)) return { status: 'stale' };
  if (data.failed) return { status: 'failed', failure: data };
  const model = load.scope === 'guild'
    ? guildLibraryModel(data as Loaded<'library', GuildSoundLibrary>, params.soundId, load.guildName, view)
    : myLibraryModel(data as Loaded<'library', MySoundLibrary>, params.soundId, params.guildId, view);
  return { status: 'ready', model, updating: view.period !== null && data.period !== view.period };
}

export function readStats(load: LibraryLoad, model: LibraryModel, view = DEFAULT_VIEW): LibraryStats | LoadFailure | null {
  const data = load.analytics;
  if (!data || data.guildId !== expectedGuild(load) || data.period !== (view.period ?? model.period)) return null;
  if (data.failed) return data;
  return load.scope === 'guild'
    ? guildLibraryStats(model, data as Loaded<'analytics', GuildSoundAnalytics>)
    : myLibraryStats(model, data as Loaded<'analytics', MySoundAnalytics>);
}

export function mySoundTitle(data: MyLibraryLoad, params: Record<string, string | undefined>) {
  const groups = data.failed ? [] : data.library.guilds;
  const sound = params.soundId ? groups.flatMap((group) => group.sounds).find((item) => item.id === params.soundId) : undefined;
  const group = params.guildId ? groups.find((item) => item.guildId === params.guildId) : undefined;
  if (sound) return `${sound.name} · Beebot`;
  return group ? `My sounds in ${group.name ?? UNKNOWN_GUILD} · Beebot` : 'My sounds · Beebot';
}
