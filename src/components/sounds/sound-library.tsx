import { $, component$, useSignal, useStore, useStyles$ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { libraryHref, soundHref, type LibraryModel } from '../../lib/sound-library';
import { formatChange, formatCount } from '../../lib/sound-stats';
import { PERIOD_LABELS, PERIODS, type VoteState } from '../../lib/sounds';
import { LineChart, RankList } from './sound-charts';
import { SoundDetail } from './sound-detail';
import { SoundList } from './sound-list';
import styles from './sounds.css?inline';

export const SoundLibrary = component$<{ model: LibraryModel }>(({ model }) => {
  useStyles$(styles);
  const location = useLocation();
  const votes = useStore<Record<string, VoteState>>({});
  const audio = useSignal<HTMLAudioElement>();
  const playing = useSignal<string | null>(null);
  const { summary } = model;
  const change = formatChange(summary.playsChangePercent);
  const periodLabel = model.period === 'all' ? 'all time' : PERIOD_LABELS[model.period];
  const guildName = model.guildId ? model.guildNames[model.guildId] : null;
  const overviewTitle = model.scope === 'guild' ? `${guildName} overview` : guildName ? `Your sounds in ${guildName}` : 'Your library overview';
  const overviewText = model.scope === 'guild' ? 'Every sound uploaded to this server, played here.' : guildName ? 'Plays in this server only.' : 'Across every server.';

  const togglePlay = $(async (soundId: string, url: string | null) => {
    const element = audio.value;
    if (!element || !url) return;
    if (playing.value === soundId) {
      element.pause();
      playing.value = null;
      return;
    }
    element.src = url;
    playing.value = soundId;
    try {
      await element.play();
    } catch {
      playing.value = null;
    }
  });

  return (
    <div class="container sounds">
      <div class="sounds__summary">
        <div class="sounds__strip">
          <div class="stat-tile">
            <span class="overline">Plays · {periodLabel}</span>
            <strong>{formatCount(summary.plays)}</strong>
            {change ? <span class={['caption', change.up ? 'delta--up' : 'delta--down']}>{change.text} vs previous period</span> : <span class="caption">No comparison</span>}
          </div>
          <div class="stat-tile">
            <span class="overline">Listeners</span>
            <strong>{formatCount(summary.listeners)}</strong>
            <span class="caption">unique people</span>
          </div>
          <div class="stat-tile">
            <span class="overline">Likes</span>
            <strong>{formatCount(summary.likes)}</strong>
            <span class="caption">on {formatCount(model.ownerCounts.all)} sounds</span>
          </div>
          <div class="stat-tile">
            <span class="overline">Your plays</span>
            <strong>{formatCount(summary.myPlays)}</strong>
            <span class="caption">only you see this</span>
          </div>
        </div>
        <nav class="filter-tabs sounds__period" aria-label="Period">
          {PERIODS.map((period) => (
            <Link
              key={period}
              href={libraryHref(location.url, { period: period === '30d' ? null : period })}
              scroll={false}
              class="filter-tabs__item"
              aria-current={model.period === period ? 'page' : undefined}
            >
              {PERIOD_LABELS[period]}
            </Link>
          ))}
        </nav>
      </div>

      <div class="sounds__work">
        <SoundList model={model} playing={playing.value} onPlay$={togglePlay} />
        {model.selected && model.view ? (
          <SoundDetail
            model={model}
            sound={model.selected.sound}
            guildName={model.selected.guildName}
            view={model.view}
            votes={votes}
            playing={playing.value}
            onPlay$={togglePlay}
          />
        ) : (
          <div class="card sounds__empty">
            <p class="heading heading--sm">No sounds yet</p>
            <p class="text-muted">{model.scope === 'guild' ? 'Nobody has uploaded a sound to this server yet.' : "You haven't uploaded any sound yet."}</p>
          </div>
        )}
      </div>

      <section class="sounds__overview" aria-labelledby="sounds-overview">
        <div class="sounds__overview-head">
          <h2 id="sounds-overview" class="heading">{overviewTitle}</h2>
          <span class="caption">{overviewText}</span>
        </div>
        <div class="card chart-block">
          <div class="chart-block__head">
            <h3 class="chart-block__title">Plays over time</h3>
            <span class="caption">Daily · {periodLabel}</span>
          </div>
          <LineChart days={model.overview.days} label={`Daily plays, ${overviewTitle}`} />
        </div>
        <div class="chart-pair">
          <div class="card chart-block">
            <div class="chart-block__head">
              <h3 class="chart-block__title">Top sounds</h3>
              <span class="caption">plays</span>
            </div>
            <RankList items={model.overview.top} unit="plays" hrefFor={(id) => soundHref(model, location.url, id)} />
          </div>
          <div class="card chart-block">
            <div class="chart-block__head">
              <h3 class="chart-block__title">Most liked</h3>
              <span class="caption">likes</span>
            </div>
            <RankList items={model.overview.liked} unit="likes" hrefFor={(id) => soundHref(model, location.url, id)} />
          </div>
        </div>
      </section>

      <audio
        ref={audio}
        preload="none"
        onEnded$={() => {
          playing.value = null;
        }}
      />
    </div>
  );
});
