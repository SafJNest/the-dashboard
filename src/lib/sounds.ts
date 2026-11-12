export const PERIODS = ['7d', '30d', '90d', 'all'] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = '30d';
export const PERIOD_COOKIE = 'beebot_period';
export const PERIOD_LABELS: Record<Period, string> = { '7d': '7d', '30d': '30d', '90d': '90d', all: 'All time' };

export const GLOBAL_GREET = '0';
export const MAX_TAGS = 5;
export const SOUND_ID = /^\d{1,20}$/;
export const GUILD_ID = /^\d{17,20}$/;

export type Vote = 'like' | 'dislike';
export type SoundSort = 'plays' | 'likes' | 'dislikes';

export interface SoundUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface SoundTag {
  id: string;
  name: string;
}

export interface TagCount extends SoundTag {
  soundCount: number;
}

export interface Sound {
  id: string;
  name: string;
  guildId: string | null;
  userId: string;
  uploader: SoundUser;
  public: boolean;
  createdAt: string;
  url: string | null;
  durationMs: number | null;
  tags: SoundTag[];
  plays: number;
  listeners: number;
  likes: number;
  dislikes: number;
  myPlays: number;
  likedByMe: boolean;
  dislikedByMe: boolean;
  ownedByMe: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface LibrarySummary {
  period: Period;
  plays: number;
  previousPlays: number | null;
  playsChangePercent: number | null;
  listeners: number;
  likes: number;
  myPlays: number;
}

export interface GuildSoundLibrary {
  guildId: string;
  counts: { all: number; mine: number; others: number };
  tags: TagCount[];
  summary: LibrarySummary;
  sounds: Sound[];
}

export interface SoundGroup {
  guildId: string;
  name: string | null;
  sounds: Sound[];
}

export interface MySoundLibrary {
  counts: { all: number };
  tags: TagCount[];
  summary: LibrarySummary;
  guilds: SoundGroup[];
}

export interface DayPlays {
  date: string;
  plays: number;
}

export interface HeatCell {
  weekday: number;
  hour: number;
  plays: number;
}

export interface SourcePlays {
  source: string;
  plays: number;
}

export interface ReplayBucket {
  min: number;
  max: number | null;
  users: number;
}

export interface PlayEvent {
  id: string;
  playedAt: string;
  guildId: string | null;
  source: string;
}

export interface MyPlays {
  plays: number;
  history: PlayEvent[];
  nextCursor: string | null;
}

export interface UserPlays {
  user: SoundUser;
  plays: number;
  soundCount: number | null;
}

export interface PlayAggregate {
  plays: number;
  listeners: number;
  averagePlaysPerListener: number | null;
  previousPlays: number | null;
  playsChangePercent: number | null;
  playsPerDay: DayPlays[];
  heatmap: HeatCell[];
  sources: SourcePlays[];
  replayDistribution: ReplayBucket[];
}

export interface GuildSoundStats extends PlayAggregate {
  soundId: string;
  likes: number;
  dislikes: number;
  my: MyPlays;
}

export interface GuildSoundAnalytics {
  guildId: string;
  period: Period;
  timezone: string;
  summary: {
    plays: number;
    listeners: number;
    averagePlaysPerListener: number | null;
    myPlays: number;
    likes: number;
    dislikes: number;
    soundCount: number;
  };
  playsPerDay: DayPlays[];
  topSounds: { soundId: string; value: number }[];
  mostLiked: { soundId: string; value: number }[];
  users: UserPlays[];
  sounds: GuildSoundStats[];
}

export interface GuildPlayGroup extends PlayAggregate {
  users: UserPlays[];
}

export interface SoundAnalytics {
  soundId: string;
  period: Period;
  timezone: string;
  totals: PlayAggregate & { likes: number; dislikes: number };
  guilds: Record<string, GuildPlayGroup>;
  otherGuilds: PlayAggregate | null;
  my: MyPlays;
}

export interface MySoundAnalytics {
  period: Period;
  timezone: string;
  summary: {
    plays: number;
    listeners: number;
    myPlays: number;
    likes: number;
    dislikes: number;
    soundCount: number;
  };
  sounds: SoundAnalytics[];
}

export interface VoteState {
  soundId: string;
  likes: number;
  dislikes: number;
  likedByMe: boolean;
  dislikedByMe: boolean;
}

export interface SoundPatch {
  name?: string;
  public?: boolean;
  tags?: string[];
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export type Greets = Record<string, Sound>;
export type GreetChanges = Record<string, string | null>;
export type GreetResults = Record<string, { ok: boolean; errors: FieldError[] }>;

type Json = Record<string, unknown>;

const object = (value: unknown): Json | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null);
const text = (value: unknown) => (typeof value === 'string' ? value : null);
const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const count = (value: unknown) => number(value) ?? 0;

function list<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const items: T[] = [];
  for (const item of value) {
    const parsed = parse(item);
    if (parsed === null) return null;
    items.push(parsed);
  }
  return items;
}

export function readPeriod(value: string | null | undefined): Period {
  return (PERIODS as readonly string[]).includes(value ?? '') ? (value as Period) : DEFAULT_PERIOD;
}

function parsePeriod(value: unknown): Period {
  return readPeriod(text(value));
}

function parseUser(value: unknown): SoundUser | null {
  const user = object(value);
  const id = text(user?.id);
  if (!user || !id) return null;
  return { id, name: text(user.name) ?? 'Unknown user', avatarUrl: text(user.avatarUrl) };
}

function parseTag(value: unknown): SoundTag | null {
  const tag = object(value);
  const id = text(tag?.id);
  const name = text(tag?.name);
  return id && name ? { id, name } : null;
}

function parseTagCount(value: unknown): TagCount | null {
  const tag = parseTag(value);
  return tag ? { ...tag, soundCount: count(object(value)?.soundCount) } : null;
}

export function parseSound(value: unknown): Sound | null {
  const sound = object(value);
  const id = text(sound?.id);
  const name = text(sound?.name);
  const uploader = parseUser(sound?.uploader);
  const tags = list(sound?.tags, parseTag);
  if (!sound || !id || !name || !uploader || !tags) return null;
  return {
    id,
    name,
    guildId: text(sound.guildId),
    userId: text(sound.userId) ?? uploader.id,
    uploader,
    public: sound.public === true,
    createdAt: text(sound.createdAt) ?? '',
    url: text(sound.url),
    durationMs: number(sound.durationMs),
    tags,
    plays: count(sound.plays),
    listeners: count(sound.listeners),
    likes: count(sound.likes),
    dislikes: count(sound.dislikes),
    myPlays: count(sound.myPlays),
    likedByMe: sound.likedByMe === true,
    dislikedByMe: sound.dislikedByMe === true,
    ownedByMe: sound.ownedByMe === true,
    canEdit: sound.canEdit === true,
    canDelete: sound.canDelete === true,
  };
}

function parseSummary(value: unknown): LibrarySummary | null {
  const summary = object(value);
  if (!summary) return null;
  return {
    period: parsePeriod(summary.period),
    plays: count(summary.plays),
    previousPlays: number(summary.previousPlays),
    playsChangePercent: number(summary.playsChangePercent),
    listeners: count(summary.listeners),
    likes: count(summary.likes),
    myPlays: count(summary.myPlays),
  };
}

export function parseGuildSoundLibrary(value: unknown, guildId: string): GuildSoundLibrary | null {
  const library = object(value);
  const counts = object(library?.counts);
  const tags = list(library?.tags, parseTagCount);
  const summary = parseSummary(library?.summary);
  const sounds = list(library?.sounds, parseSound);
  if (!library || text(library.guildId) !== guildId || !counts || !tags || !summary || !sounds) return null;
  return { guildId, counts: { all: count(counts.all), mine: count(counts.mine), others: count(counts.others) }, tags, summary, sounds };
}

export function parseMySoundLibrary(value: unknown): MySoundLibrary | null {
  const library = object(value);
  const tags = list(library?.tags, parseTagCount);
  const summary = parseSummary(library?.summary);
  const guilds = object(library?.guilds);
  if (!library || !tags || !summary || !guilds) return null;
  const groups: SoundGroup[] = [];
  for (const [guildId, entry] of Object.entries(guilds)) {
    const group = object(entry);
    const sounds = list(group?.sounds, parseSound);
    if (!group || !sounds) return null;
    groups.push({ guildId, name: text(group.name), sounds });
  }
  return { counts: { all: count(object(library.counts)?.all) }, tags, summary, guilds: groups };
}

function parseDay(value: unknown): DayPlays | null {
  const day = object(value);
  const date = text(day?.date);
  return day && date ? { date, plays: count(day.plays) } : null;
}

function parseHeatCell(value: unknown): HeatCell | null {
  const cell = object(value);
  const weekday = number(cell?.weekday);
  const hour = number(cell?.hour);
  if (!cell || weekday === null || hour === null || weekday < 1 || weekday > 7 || hour < 0 || hour > 23) return null;
  return { weekday, hour, plays: count(cell.plays) };
}

function parseSource(value: unknown): SourcePlays | null {
  const source = object(value);
  const name = text(source?.source);
  return source && name ? { source: name, plays: count(source.plays) } : null;
}

function parseBucket(value: unknown): ReplayBucket | null {
  const bucket = object(value);
  const min = number(bucket?.min);
  if (!bucket || min === null) return null;
  return { min, max: number(bucket.max), users: count(bucket.users) };
}

function parseEvent(value: unknown): PlayEvent | null {
  const event = object(value);
  const id = text(event?.id);
  const playedAt = text(event?.playedAt);
  if (!event || !id || !playedAt) return null;
  return { id, playedAt, guildId: text(event.guildId), source: text(event.source) ?? 'UNKNOWN' };
}

function parseMyPlays(value: unknown): MyPlays | null {
  const my = object(value);
  if (value === undefined || value === null) return { plays: 0, history: [], nextCursor: null };
  const history = list(my?.history, parseEvent);
  if (!my || !history) return null;
  return { plays: count(my.plays), history, nextCursor: text(my.nextCursor) };
}

function parseUserPlays(value: unknown): UserPlays | null {
  const entry = object(value);
  const user = parseUser(entry?.user);
  if (!entry || !user) return null;
  return { user, plays: count(entry.plays), soundCount: number(entry.soundCount) };
}

function parseAggregate(value: unknown): PlayAggregate | null {
  const aggregate = object(value);
  const playsPerDay = list(aggregate?.playsPerDay, parseDay);
  const heatmap = list(aggregate?.heatmap, parseHeatCell);
  const sources = list(aggregate?.sources, parseSource);
  const replayDistribution = list(aggregate?.replayDistribution, parseBucket);
  if (!aggregate || !playsPerDay || !heatmap || !sources || !replayDistribution) return null;
  return {
    plays: count(aggregate.plays),
    listeners: count(aggregate.listeners),
    averagePlaysPerListener: number(aggregate.averagePlaysPerListener),
    previousPlays: number(aggregate.previousPlays),
    playsChangePercent: number(aggregate.playsChangePercent),
    playsPerDay,
    heatmap,
    sources,
    replayDistribution,
  };
}

function parseRanking(value: unknown, key: 'plays' | 'likes') {
  return list(value, (item) => {
    const entry = object(item);
    const soundId = text(entry?.soundId);
    return entry && soundId ? { soundId, value: count(entry[key]) } : null;
  });
}

export function parseGuildSoundAnalytics(value: unknown, guildId: string): GuildSoundAnalytics | null {
  const analytics = object(value);
  const summary = object(analytics?.summary);
  const playsPerDay = list(analytics?.playsPerDay, parseDay);
  const topSounds = parseRanking(analytics?.topSounds, 'plays');
  const mostLiked = parseRanking(analytics?.mostLiked, 'likes');
  const users = list(analytics?.users, parseUserPlays);
  const sounds = list(analytics?.sounds, (item) => {
    const entry = object(item);
    const soundId = text(entry?.soundId);
    const aggregate = parseAggregate(item);
    const my = parseMyPlays(entry?.my);
    if (!entry || !soundId || !aggregate || !my) return null;
    return { ...aggregate, soundId, likes: count(entry.likes), dislikes: count(entry.dislikes), my };
  });
  if (!analytics || text(analytics.guildId) !== guildId || !summary || !playsPerDay || !topSounds || !mostLiked || !users || !sounds) return null;
  return {
    guildId,
    period: parsePeriod(analytics.period),
    timezone: text(analytics.timezone) ?? 'Europe/Rome',
    summary: {
      plays: count(summary.plays),
      listeners: count(summary.listeners),
      averagePlaysPerListener: number(summary.averagePlaysPerListener),
      myPlays: count(summary.myPlays),
      likes: count(summary.likes),
      dislikes: count(summary.dislikes),
      soundCount: count(summary.soundCount),
    },
    playsPerDay,
    topSounds,
    mostLiked,
    users,
    sounds,
  };
}

export function parseSoundAnalytics(value: unknown): SoundAnalytics | null {
  const analytics = object(value);
  const soundId = text(analytics?.soundId);
  const totals = parseAggregate(analytics?.totals);
  const guildEntries = object(analytics?.guilds ?? {});
  const otherGuilds = analytics?.otherGuilds ? parseAggregate(analytics.otherGuilds) : null;
  const my = parseMyPlays(analytics?.my);
  if (!analytics || !soundId || !totals || !guildEntries || (analytics.otherGuilds && !otherGuilds) || !my) return null;
  const guilds: Record<string, GuildPlayGroup> = {};
  for (const [guildId, entry] of Object.entries(guildEntries)) {
    const aggregate = parseAggregate(entry);
    const users = list(object(entry)?.users, parseUserPlays);
    if (!aggregate || !users) return null;
    guilds[guildId] = { ...aggregate, users };
  }
  const rawTotals = object(analytics.totals);
  return {
    soundId,
    period: parsePeriod(analytics.period),
    timezone: text(analytics.timezone) ?? 'Europe/Rome',
    totals: { ...totals, likes: count(rawTotals?.likes), dislikes: count(rawTotals?.dislikes) },
    guilds,
    otherGuilds,
    my,
  };
}

export function parseMySoundAnalytics(value: unknown): MySoundAnalytics | null {
  const analytics = object(value);
  const summary = object(analytics?.summary);
  const sounds = list(analytics?.sounds, parseSoundAnalytics);
  if (!analytics || !summary || !sounds) return null;
  return {
    period: parsePeriod(analytics.period),
    timezone: text(analytics.timezone) ?? 'Europe/Rome',
    summary: {
      plays: count(summary.plays),
      listeners: count(summary.listeners),
      myPlays: count(summary.myPlays),
      likes: count(summary.likes),
      dislikes: count(summary.dislikes),
      soundCount: count(summary.soundCount),
    },
    sounds,
  };
}

export function parseSoundSearch(value: unknown): Sound[] | null {
  return list(object(value)?.sounds, parseSound);
}

export function parseTags(value: unknown): SoundTag[] | null {
  return list(object(value)?.tags, parseTag);
}

export function parseVoteState(value: unknown, soundId: string): VoteState | null {
  const vote = object(value);
  if (!vote || text(vote.soundId) !== soundId) return null;
  return {
    soundId,
    likes: count(vote.likes),
    dislikes: count(vote.dislikes),
    likedByMe: vote.likedByMe === true,
    dislikedByMe: vote.dislikedByMe === true,
  };
}

export function parseGreets(value: unknown): Greets | null {
  if (value === undefined || value === null) return {};
  const entries = object(value);
  if (!entries) return null;
  const greets: Greets = {};
  for (const [key, entry] of Object.entries(entries)) {
    if (entry === null) continue;
    const sound = parseSound(entry);
    if (!sound) return null;
    greets[key] = sound;
  }
  return greets;
}

function parseFieldError(value: unknown): FieldError | null {
  const error = object(value);
  const message = text(error?.message);
  return error && message ? { field: text(error.field) ?? '', code: text(error.code) ?? 'unknown', message } : null;
}

export function parseGreetResults(value: unknown): GreetResults | null {
  const entries = object(object(value)?.greets);
  if (!entries) return null;
  const results: GreetResults = {};
  for (const [key, entry] of Object.entries(entries)) {
    const result = object(entry);
    const errors = list(result?.errors, parseFieldError);
    if (!result || !errors) return null;
    results[key] = { ok: result.status === 'ok', errors };
  }
  return results;
}
