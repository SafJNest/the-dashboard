import type { LoadFailure } from './beebot.server';
import { mergeDays, viewFromGuildStats, viewFromSoundAnalytics, type SoundView } from './sound-stats';
import { readPeriod, type DayPlays, type GuildSoundAnalytics, type GuildSoundLibrary, type LibrarySummary, type MySoundAnalytics, type MySoundLibrary, type Period, type Sound } from './sounds';

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

export interface LibraryStats {
  period: Period;
  timezone: string;
  plays: Record<string, number>;
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

export function readOwner(value: string | null): Owner {
  return value === 'mine' || value === 'others' ? value : 'all';
}

export function readTab(value: string | null): DetailTab {
  return value === 'mine' ? 'mine' : 'everyone';
}

export function readSort(value: string | null): SortOrder {
  return value === 'plays' ? 'plays' : 'name';
}

export function guildSoundsPath(guildId: string) {
  return `/dashboard/${guildId}/sounds/`;
}

export function mySoundsPath(guildId: string | null) {
  return guildId ? `${MY_SOUNDS_PATH}guild/${guildId}/` : MY_SOUNDS_PATH;
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

export function soundHref(model: Pick<LibraryModel, 'basePath'>, url: URL, soundId: string) {
  return libraryHref(url, {}, `${model.basePath}${soundId}/`);
}

function compareIds(a: string, b: string) {
  return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
}

function byName(a: LibraryEntry, b: LibraryEntry) {
  return a.sound.name.localeCompare(b.sound.name, 'en') || compareIds(a.sound.id, b.sound.id);
}

export function sortEntries(entries: LibraryEntry[], sort: SortOrder, plays: Record<string, number> | null) {
  if (sort !== 'plays' || !plays) return entries;
  return [...entries].sort((a, b) => (plays[b.sound.id] ?? 0) - (plays[a.sound.id] ?? 0) || byName(a, b));
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

export function guildLibraryModel(data: { period: Period; library: GuildSoundLibrary }, url: URL, soundId: string | undefined, guildName: string): LibraryModel {
  const { library } = data;
  const all = library.sounds.map((sound) => ({ sound, guildName })).sort(byName);
  const owner = readOwner(url.searchParams.get('owner'));
  const entries = owner === 'all' ? all : all.filter((entry) => entry.sound.ownedByMe === (owner === 'mine'));
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
    tab: readTab(url.searchParams.get('tab')),
    sort: readSort(url.searchParams.get('sort')),
  };
}

export function myLibraryModel(data: { period: Period; library: MySoundLibrary }, url: URL, soundId: string | undefined, guildId: string | undefined): LibraryModel {
  const { library } = data;
  const guildNames = Object.fromEntries(library.guilds.map((group) => [group.guildId, group.name ?? UNKNOWN_GUILD]));
  const all = library.guilds.flatMap((group) => group.sounds.map((sound) => ({ sound, guildName: guildNames[group.guildId] }))).sort(byName);
  const filter = guildId ?? null;
  const guildMissing = filter !== null && !(filter in guildNames);
  const scoped = new Set(library.guilds.find((group) => group.guildId === filter)?.sounds.map((sound) => sound.id));
  const entries = filter ? all.filter((entry) => scoped.has(entry.sound.id)) : all;
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
    tab: readTab(url.searchParams.get('tab')),
    sort: readSort(url.searchParams.get('sort')),
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
    plays: Object.fromEntries(analytics.sounds.map((entry) => [entry.soundId, entry.plays])),
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
    plays: Object.fromEntries(views.map(({ entry, view }) => [entry.sound.id, view.plays])),
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

export function readLibrary(load: LibraryLoad, url: URL, params: Record<string, string | undefined>): LibraryState {
  const data = load.library;
  if (data.guildId !== expectedGuild(load)) return { status: 'stale' };
  if (data.failed) return { status: 'failed', failure: data };
  const model = load.scope === 'guild'
    ? guildLibraryModel(data as Loaded<'library', GuildSoundLibrary>, url, params.soundId, load.guildName)
    : myLibraryModel(data as Loaded<'library', MySoundLibrary>, url, params.soundId, params.guildId);
  return { status: 'ready', model, updating: data.period !== readPeriod(url.searchParams.get('period')) };
}

export function readStats(load: LibraryLoad, model: LibraryModel, url: URL): LibraryStats | LoadFailure | null {
  const data = load.analytics;
  if (!data || data.guildId !== expectedGuild(load) || data.period !== readPeriod(url.searchParams.get('period'))) return null;
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
