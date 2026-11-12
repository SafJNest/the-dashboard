import { Link } from '@qwik.dev/router';
import { dayBars, formatCompact, formatCount, formatDay, heatRows, linePath, replayRows, sourceRows } from '../../lib/sound-stats';
import { soundHref, type RankedSound } from '../../lib/sound-library';
import type { DayPlays, HeatCell, ReplayBucket, SourcePlays } from '../../lib/sounds';

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

export function HeatGrid({ cells, label }: { cells: HeatCell[]; label: string }) {
  const { rows, peak, peakDayShare } = heatRows(cells);
  return (
    <div class="chart-block">
      <div class="chart-block__head">
        <h3 class="chart-block__title">When it gets played</h3>
        <span class="caption">Hour of day × weekday</span>
      </div>
      {peak ? (
        <p class="insight">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span>
            Usually played on <strong>{rows[peak.weekday - 1].day}s</strong> around <strong>{String(peak.hour).padStart(2, '0')}:00</strong>
            {peakDayShare !== null && <> · {peakDayShare}% of plays happen on {rows[peak.weekday - 1].day}s</>}.
          </span>
        </p>
      ) : (
        <p class="caption">No plays in this period.</p>
      )}
      <div class="table-wrap">
        <div class="heat" role="img" aria-label={peak ? `${label}; busiest ${rows[peak.weekday - 1].day} around ${peak.hour}:00.` : label}>
          {rows.map((row) => (
            <div class="heat__row" key={row.day}>
              <span class="caption">{row.day.slice(0, 3)}</span>
              {row.cells.map((cell) => (
                <span key={cell.hour} class={['heat__cell', `heat__cell--${cell.level}`, cell.peak && 'heat__cell--peak']} />
              ))}
            </div>
          ))}
          <div class="heat__row" aria-hidden="true">
            <span />
            {['00', '06', '12', '18'].map((hour) => (
              <span key={hour} class="caption heat__hour">{hour}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SourceSplit({ sources, title }: { sources: SourcePlays[]; title: string }) {
  const rows = sourceRows(sources);
  return (
    <div class="chart-block">
      <h3 class="chart-block__title">{title}</h3>
      {rows.length ? (
        <>
          <div class="stack" role="img" aria-label={rows.map((row) => `${row.label} ${row.percent}%`).join(', ')}>
            {rows.map((row, index) => (
              <span key={row.source} class={['stack__part', `tone-${index % 4}`]} style={{ '--part': `${row.percent}%` }} />
            ))}
          </div>
          <ul class="legend">
            {rows.map((row, index) => (
              <li key={row.source}>
                <span class={['legend__swatch', `tone-${index % 4}`]} />
                <span>{row.label}</span>
                <span class="text-muted">{formatCount(row.plays)}</span>
                <span class="legend__percent">{row.percent}%</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p class="caption">No plays in this period.</p>
      )}
    </div>
  );
}

export function ReplaySplit({ buckets, myPlays }: { buckets: ReplayBucket[]; myPlays: number }) {
  const rows = replayRows(buckets, myPlays);
  const mine = rows.find((row) => row.mine);
  return (
    <div class="chart-block">
      <h3 class="chart-block__title">How often people replay it</h3>
      {rows.some((row) => row.users) ? (
        <>
          <ul class="dist">
            {rows.map((row) => (
              <li key={row.label} class={row.mine ? 'dist--mine' : undefined}>
                <span>{row.label}</span>
                <span class="dist__bar">
                  <span style={{ '--part': `${row.width}%` }} />
                </span>
                <span class="text-muted">{formatCount(row.users)} {row.users === 1 ? 'person' : 'people'}</span>
              </li>
            ))}
          </ul>
          <p class="caption">{mine ? `You are in the highlighted group (${mine.label}${mine.label === '1 play' ? '' : ' plays'}).` : "You haven't played it in this period."}</p>
        </>
      ) : (
        <p class="caption">Not available for this view.</p>
      )}
    </div>
  );
}

export function LineChart({ days, label }: { days: DayPlays[]; label: string }) {
  const { line, area, ticks } = linePath(days.map((day) => day.plays), 800, 200);
  if (!days.length) return <p class="caption">No plays in this period.</p>;
  return (
    <div class="line-chart">
      <div class="line-chart__ticks" aria-hidden="true">
        {ticks.map((tick, index) => (
          <span key={index} class="caption">{formatCompact(tick)}</span>
        ))}
      </div>
      <div class="line-chart__plot">
        <svg viewBox="0 0 800 200" preserveAspectRatio="none" role="img" aria-label={label}>
          {[0.5, 50, 100, 150, 199.5].map((y) => (
            <line key={y} x1="0" x2="800" y1={y} y2={y} class="line-chart__grid" vector-effect="non-scaling-stroke" />
          ))}
          <path d={area} class="line-chart__area" />
          <path d={line} class="line-chart__line" vector-effect="non-scaling-stroke" />
        </svg>
      </div>
      <div class="line-chart__axis" aria-hidden="true">
        <span class="caption">{formatDay(days[0].date)}</span>
        <span class="caption">{formatDay(days[days.length - 1].date)}</span>
      </div>
    </div>
  );
}

export function RankList({ items, unit, basePath }: { items: RankedSound[]; unit: string; basePath: string }) {
  if (!items.length) return <p class="caption">Nothing to rank yet.</p>;
  const max = items[0].value;
  return (
    <ol class="rank">
      {items.map((item, index) => (
        <li key={item.id}>
          <span class="mono text-subtle">{index + 1}</span>
          <Link href={soundHref({ basePath }, item.id)} scroll={false} class="rank__name">
            <span>{item.name}</span>
            <span class="caption">{item.detail}</span>
          </Link>
          <progress class="rank__bar" value={item.value} max={max} aria-label={`${item.name}, ${formatCount(item.value)} ${unit}`} />
          <span class="text-muted rank__value">{formatCount(item.value)}</span>
        </li>
      ))}
    </ol>
  );
}
