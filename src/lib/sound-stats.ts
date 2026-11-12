import type { DayPlays, GuildSoundStats, HeatCell, PlayAggregate, PlayEvent, ReplayBucket, SoundAnalytics, SourcePlays } from './sounds';

export interface SoundView {
  plays: number;
  listeners: number;
  average: number | null;
  change: number | null;
  playsPerDay: DayPlays[];
  heatmap: HeatCell[];
  sources: SourcePlays[];
  replay: ReplayBucket[];
  myPlays: number;
  history: PlayEvent[];
  where: { guildId: string | null; plays: number }[];
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SOURCE_LABELS: Record<string, string> = {
  SOUNDBOARD: 'Soundboard',
  AUDIO: 'Audio',
  GREET: 'Greet',
};

const EMPTY_VIEW: SoundView = {
  plays: 0,
  listeners: 0,
  average: null,
  change: null,
  playsPerDay: [],
  heatmap: [],
  sources: [],
  replay: [],
  myPlays: 0,
  history: [],
  where: [],
};

export function sourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source.charAt(0) + source.slice(1).toLowerCase().replaceAll('_', ' ');
}

export function viewFromGuildStats(stats: GuildSoundStats | undefined): SoundView {
  if (!stats) return EMPTY_VIEW;
  return {
    plays: stats.plays,
    listeners: stats.listeners,
    average: stats.averagePlaysPerListener,
    change: stats.playsChangePercent,
    playsPerDay: stats.playsPerDay,
    heatmap: stats.heatmap,
    sources: stats.sources,
    replay: stats.replayDistribution,
    myPlays: stats.my.plays,
    history: stats.my.history,
    where: [],
  };
}

function mergeBy<T, K extends keyof T>(lists: T[][], key: K, plays: (item: T) => number, make: (key: T[K], plays: number) => T) {
  const totals = new Map<T[K], number>();
  for (const item of lists.flat()) totals.set(item[key], (totals.get(item[key]) ?? 0) + plays(item));
  return [...totals].map(([value, total]) => make(value, total));
}

export function mergeDays(lists: DayPlays[][]) {
  return mergeBy(lists, 'date', (day) => day.plays, (date, plays) => ({ date, plays })).sort((a, b) => a.date.localeCompare(b.date));
}

function mergeHeat(lists: HeatCell[][]) {
  const cells = mergeBy(lists.map((cells) => cells.map((cell) => ({ key: cell.weekday * 100 + cell.hour, plays: cell.plays }))), 'key', (cell) => cell.plays, (key, plays) => ({ key, plays }));
  return cells.map(({ key, plays }) => ({ weekday: Math.floor(key / 100), hour: key % 100, plays }));
}

function mergeSources(lists: SourcePlays[][]) {
  return mergeBy(lists, 'source', (item) => item.plays, (source, plays) => ({ source, plays }));
}

export function viewFromSoundAnalytics(analytics: SoundAnalytics | undefined, guildId: string | null): SoundView {
  if (!analytics) return EMPTY_VIEW;
  const where = [
    ...Object.entries(analytics.guilds).map(([id, group]) => ({ guildId: id as string | null, plays: group.plays })),
    ...(analytics.otherGuilds ? [{ guildId: null, plays: analytics.otherGuilds.plays }] : []),
  ].sort((a, b) => b.plays - a.plays);
  if (guildId) {
    const group = analytics.guilds[guildId];
    const history = analytics.my.history.filter((event) => event.guildId === guildId);
    if (!group) return { ...EMPTY_VIEW, myPlays: history.length, history };
    return {
      plays: group.plays,
      listeners: group.listeners,
      average: group.averagePlaysPerListener,
      change: group.playsChangePercent,
      playsPerDay: group.playsPerDay,
      heatmap: group.heatmap,
      sources: group.sources,
      replay: group.replayDistribution,
      myPlays: history.length,
      history,
      where: [],
    };
  }
  const { totals } = analytics;
  const groups: PlayAggregate[] = [...Object.values(analytics.guilds), ...(analytics.otherGuilds ? [analytics.otherGuilds] : [])];
  return {
    plays: totals.plays,
    listeners: totals.listeners,
    average: totals.averagePlaysPerListener,
    change: totals.playsChangePercent,
    playsPerDay: totals.playsPerDay.length ? totals.playsPerDay : mergeDays(groups.map((group) => group.playsPerDay)),
    heatmap: totals.heatmap.length ? totals.heatmap : mergeHeat(groups.map((group) => group.heatmap)),
    sources: totals.sources.length ? totals.sources : mergeSources(groups.map((group) => group.sources)),
    replay: totals.replayDistribution,
    myPlays: analytics.my.plays,
    history: analytics.my.history,
    where,
  };
}

export function heatRows(cells: HeatCell[]) {
  const plays = new Map(cells.map((cell) => [cell.weekday * 100 + cell.hour, cell.plays]));
  const max = Math.max(0, ...cells.map((cell) => cell.plays));
  const peak = max ? cells.find((cell) => cell.plays === max) ?? null : null;
  const total = cells.reduce((sum, cell) => sum + cell.plays, 0);
  const rows = WEEKDAYS.map((day, index) => ({
    day,
    cells: Array.from({ length: 24 }, (_, hour) => {
      const value = plays.get((index + 1) * 100 + hour) ?? 0;
      const ratio = max ? value / max : 0;
      return {
        hour,
        plays: value,
        level: !value ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4,
        peak: !!peak && peak.weekday === index + 1 && peak.hour === hour,
      };
    }),
  }));
  const peakDayPlays = peak ? cells.filter((cell) => cell.weekday === peak.weekday).reduce((sum, cell) => sum + cell.plays, 0) : 0;
  return { rows, peak, peakDayShare: peak && total ? Math.round((peakDayPlays / total) * 100) : null };
}

export function dayBars(days: DayPlays[]) {
  const buckets = days.length > 92
    ? Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => {
        const week = days.slice(index * 7, index * 7 + 7);
        return { date: week[0].date, plays: week.reduce((sum, day) => sum + day.plays, 0) };
      })
    : days;
  const max = Math.max(0, ...buckets.map((bucket) => bucket.plays));
  return {
    weekly: days.length > 92,
    bars: buckets.map((bucket) => ({
      date: bucket.date,
      plays: bucket.plays,
      height: max ? Math.max(2, Math.round((bucket.plays / max) * 100)) : 2,
      peak: !!max && bucket.plays === max,
    })),
  };
}

export function sourceRows(sources: SourcePlays[]) {
  const total = sources.reduce((sum, item) => sum + item.plays, 0);
  return [...sources]
    .sort((a, b) => b.plays - a.plays)
    .map((item) => ({ source: item.source, label: sourceLabel(item.source), plays: item.plays, percent: total ? Math.round((item.plays / total) * 100) : 0 }));
}

export function bucketLabel(bucket: ReplayBucket) {
  if (bucket.max === null) return `${bucket.min}+`;
  if (bucket.min === bucket.max) return bucket.min === 1 ? '1 play' : `${bucket.min}`;
  return `${bucket.min}–${bucket.max}`;
}

export function inBucket(bucket: ReplayBucket, plays: number) {
  return plays >= bucket.min && (bucket.max === null || plays <= bucket.max);
}

export function replayRows(buckets: ReplayBucket[], myPlays: number) {
  const max = Math.max(0, ...buckets.map((bucket) => bucket.users));
  return buckets.map((bucket) => ({
    label: bucketLabel(bucket),
    users: bucket.users,
    width: max ? Math.round((bucket.users / max) * 100) : 0,
    mine: myPlays > 0 && inBucket(bucket, myPlays),
  }));
}

export function topShare(buckets: ReplayBucket[], myPlays: number) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.users, 0);
  const index = buckets.findIndex((bucket) => inBucket(bucket, myPlays));
  if (!myPlays || !total || index < 0) return null;
  const above = buckets.slice(index + 1).reduce((sum, bucket) => sum + bucket.users, 0) + buckets[index].users / 2;
  return Math.max(1, Math.round((above / total) * 100));
}

export function linePath(values: number[], width: number, height: number) {
  const max = Math.max(0, ...values);
  const rough = max ? (max * 1.1) / 4 : 1;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const top = 4 * magnitude * ([1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= rough) ?? 10);
  const points = values.map((value, index) => [values.length > 1 ? (index / (values.length - 1)) * width : 0, height - (value / top) * height]);
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return { line, area: points.length ? `${line} L${width} ${height} L0 ${height} Z` : '', ticks: [1, 0.75, 0.5, 0.25, 0].map((ratio) => top * ratio) };
}

const integer = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function formatCount(value: number) {
  return integer.format(Math.round(value));
}

export function formatCompact(value: number) {
  return compact.format(value);
}

export function formatChange(percent: number | null) {
  if (percent === null) return null;
  const rounded = Math.abs(percent).toFixed(1);
  return { text: `${percent >= 0 ? '▲' : '▼'} ${rounded}%`, up: percent >= 0 };
}

export function formatAverage(value: number | null) {
  return value === null ? '—' : value.toFixed(1);
}

export function formatLength(durationMs: number | null) {
  if (durationMs === null) return '—';
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
}

export function formatPlayedAt(iso: string, timeZone: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' }),
  };
}

export function formatAdded(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}
