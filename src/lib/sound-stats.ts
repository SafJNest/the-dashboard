import type { DayPlays } from './sounds';

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

export function formatLength(durationMs: number | null) {
  if (durationMs === null) return '—';
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
}
