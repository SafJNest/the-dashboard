import { dayBars, formatCount, formatDay } from '../../lib/sound-stats';
import type { DayPlays } from '../../lib/sounds';

export function DayBars({ days, label }: { days: DayPlays[]; label: string }) {
  const { bars, weekly } = dayBars(days);
  if (!bars.length) return <p class="caption">No plays in this period.</p>;
  const peak = bars.find((bar) => bar.peak);
  return (
    <div class="chart-block">
      <div class="chart-block__head">
        <h3 class="chart-block__title">{weekly ? 'Plays per week' : 'Plays per day'}</h3>
        {peak && <span class="caption">Best {weekly ? 'week' : 'day'}: {formatDay(peak.date)} · {formatCount(peak.plays)} plays</span>}
      </div>
      <div class="bars" role="img" aria-label={`${label}${peak ? `, highest on ${formatDay(peak.date)} with ${formatCount(peak.plays)} plays` : ''}.`}>
        {bars.map((bar) => (
          <span key={bar.date} class={['bars__bar', bar.peak && 'bars__bar--peak']} style={{ '--bar-height': `${bar.height}%` }} />
        ))}
      </div>
      <div class="bars__axis" aria-hidden="true">
        <span class="caption">{formatDay(bars[0].date)}</span>
        <span class="caption">{formatDay(bars[bars.length - 1].date)}</span>
      </div>
    </div>
  );
}
