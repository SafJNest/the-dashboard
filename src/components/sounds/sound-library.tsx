import { $, component$, Pending, useComputed$, useSignal, useStore, useStyles$, useTask$, type QRL } from '@qwik.dev/core';
import { isBrowser } from '@qwik.dev/core/build';
import { Link, useLocation } from '@qwik.dev/router';
import { libraryHref, readLibrary, readStats } from '../../lib/sound-library';
import { formatChange, formatCount } from '../../lib/sound-stats';
import { PERIOD_LABELS, PERIODS, readPeriod, type VoteState } from '../../lib/sounds';
import { readSource, type LibrarySource } from './library-source';
import { ChartsSkeleton, LoadError, Skeleton, SummarySkeleton, WorkSkeleton } from './library-states';
import { LineChart, RankList } from './sound-charts';
import { SoundDetail } from './sound-detail';
import { SoundList } from './sound-list';
import styles from './sounds.css?inline';

export interface Playback {
  id: string | null;
  loading: boolean;
  failed: string | null;
}

export type PlayHandler = QRL<(soundId: string, url: string | null) => void>;

const SummaryStrip = component$<{ source: LibrarySource }>(({ source }) => {
  const location = useLocation();
  const state = readLibrary(readSource(source, location.url, false), location.url, location.params);
  if (state.status === 'stale') return <SummarySkeleton />;
  if (state.status === 'failed') return null;
  const { model, updating } = state;
  const { summary } = model;
  const change = formatChange(summary.playsChangePercent);
  const periodLabel = model.period === 'all' ? 'all time' : PERIOD_LABELS[model.period];
  const value = (count: number) => (updating ? <Skeleton width="5ch" height="2.2rem" /> : <strong>{formatCount(count)}</strong>);
  return (
    <div class="sounds__strip" aria-busy={updating}>
      <div class="stat-tile">
        <span class="overline">Plays · {updating ? 'updating' : periodLabel}</span>
        {value(summary.plays)}
        {updating ? <Skeleton width="60%" /> : change ? <span class={['caption', change.up ? 'delta--up' : 'delta--down']}>{change.text} vs previous period</span> : <span class="caption">No comparison</span>}
      </div>
      <div class="stat-tile">
        <span class="overline">Listeners</span>
        {value(summary.listeners)}
        <span class="caption">unique people</span>
      </div>
      <div class="stat-tile">
        <span class="overline">Likes</span>
        {value(summary.likes)}
        <span class="caption">on {formatCount(model.ownerCounts.all)} sounds</span>
      </div>
      <div class="stat-tile">
        <span class="overline">Your plays</span>
        {value(summary.myPlays)}
        <span class="caption">only you see this</span>
      </div>
    </div>
  );
});

interface LibraryWorkProps {
  source: LibrarySource;
  playback: Playback;
  votes: Record<string, VoteState>;
  onPlay$: PlayHandler;
}

const LibraryWork = component$<LibraryWorkProps>(({ source, playback, votes, onPlay$ }) => {
  const location = useLocation();
  const state = readLibrary(readSource(source, location.url, false), location.url, location.params);
  if (state.status === 'stale') return <WorkSkeleton />;
  if (state.status === 'failed') {
    return <LoadError message={state.failure.message} retrying={source.library.pending} onRetry$={$(() => source.library.invalidate())} />;
  }
  const { model } = state;
  if (model.guildMissing) {
    return (
      <div class="card sounds__empty" role="alert">
        <p class="heading heading--sm">This server isn't in your library</p>
        <p class="text-muted">You haven't uploaded sounds there, or the server is no longer available.</p>
        <Link href={libraryHref(location.url, {}, model.rootPath)} class="button button--secondary">All servers</Link>
      </div>
    );
  }
  return (
    <div class="sounds__work">
      <SoundList model={model} source={source} playback={playback} onPlay$={onPlay$} />
      {model.missing ? (
        <div class="card sounds__empty" role="alert">
          <p class="heading heading--sm">Sound not found</p>
          <p class="text-muted">This sound doesn't exist in this library, or you can't see it anymore.</p>
          <Link href={libraryHref(location.url, {}, model.basePath)} scroll={false} class="button button--secondary">Back to the library</Link>
        </div>
      ) : model.selected ? (
        <SoundDetail model={model} source={source} entry={model.selected} votes={votes} playback={playback} onPlay$={onPlay$} />
      ) : (
        <div class="card sounds__empty">
          <p class="heading heading--sm">No sounds yet</p>
          <p class="text-muted">{model.scope === 'guild' ? 'Nobody has uploaded a sound to this server yet.' : "You haven't uploaded any sound yet."}</p>
        </div>
      )}
    </div>
  );
});

const OverviewCharts = component$<{ source: LibrarySource; title: string }>(({ source, title }) => {
  const location = useLocation();
  const load = readSource(source, location.url, true);
  const state = readLibrary(load, location.url, location.params);
  if (state.status !== 'ready') return <ChartsSkeleton />;
  const stats = readStats(load, state.model, location.url);
  if (!stats) return <ChartsSkeleton />;
  if ('failed' in stats) {
    return <LoadError message={`Statistics are unavailable. ${stats.message}`} retrying={source.analytics.pending} onRetry$={$(() => source.analytics.invalidate())} />;
  }
  const periodLabel = stats.period === 'all' ? 'all time' : PERIOD_LABELS[stats.period];
  return (
    <div class="sounds__charts">
      <div class="card chart-block">
        <div class="chart-block__head">
          <h3 class="chart-block__title">Plays over time</h3>
          <span class="caption">Daily · {periodLabel}</span>
        </div>
        <LineChart days={stats.overview.days} label={`Daily plays, ${title}`} />
      </div>
      <div class="chart-pair">
        <div class="card chart-block">
          <div class="chart-block__head">
            <h3 class="chart-block__title">Top sounds</h3>
            <span class="caption">plays</span>
          </div>
          <RankList items={stats.overview.top} unit="plays" url={location.url} basePath={state.model.basePath} />
        </div>
        <div class="card chart-block">
          <div class="chart-block__head">
            <h3 class="chart-block__title">Most liked</h3>
            <span class="caption">likes</span>
          </div>
          <RankList items={stats.overview.liked} unit="likes" url={location.url} basePath={state.model.basePath} />
        </div>
      </div>
    </div>
  );
});

const LibraryOverview = component$<{ source: LibrarySource }>(({ source }) => {
  const location = useLocation();
  const state = readLibrary(readSource(source, location.url, false), location.url, location.params);
  if (state.status === 'failed') return null;
  if (state.status === 'stale') return <ChartsSkeleton />;
  const { model } = state;
  const guildName = model.guildId ? model.guildNames[model.guildId] : null;
  const title = model.scope === 'guild' ? `${guildName} overview` : guildName ? `Your sounds in ${guildName}` : 'Your library overview';
  const text = model.scope === 'guild' ? 'Every sound uploaded to this server, played here.' : guildName ? 'Plays in this server only.' : 'Across every server.';
  return (
    <section class="sounds__overview" aria-labelledby="sounds-overview">
      <div class="sounds__overview-head">
        <h2 id="sounds-overview" class="heading">{title}</h2>
        <span class="caption">{text}</span>
      </div>
      <Pending fallback$={() => <ChartsSkeleton />}>
        <OverviewCharts source={source} title={title} />
      </Pending>
    </section>
  );
});

export const SoundLibrary = component$<{ source: LibrarySource }>(({ source }) => {
  useStyles$(styles);
  const location = useLocation();
  const votes = useStore<Record<string, VoteState>>({});
  const audio = useSignal<HTMLAudioElement>();
  const playback = useStore<Playback>({ id: null, loading: false, failed: null });
  const attempt = useSignal(0);
  const period = readPeriod(location.url.searchParams.get('period'));

  const stop = $(() => {
    const element = audio.value;
    attempt.value++;
    if (element) {
      element.pause();
      element.removeAttribute('src');
      element.load();
    }
    playback.id = null;
    playback.loading = false;
  });

  const scope = useComputed$(() => (source.scope === 'guild' ? source.guildId : 'me'));

  useTask$(({ track, cleanup }) => {
    track(scope);
    if (!isBrowser) return;
    stop();
    cleanup(() => stop());
  });

  const togglePlay = $(async (soundId: string, url: string | null) => {
    const element = audio.value;
    if (!element || !url) return;
    if (playback.id === soundId) {
      attempt.value++;
      element.pause();
      playback.id = null;
      playback.loading = false;
      return;
    }
    const current = ++attempt.value;
    element.src = url;
    playback.id = soundId;
    playback.loading = true;
    playback.failed = null;
    try {
      await element.play();
    } catch {
      if (attempt.value !== current) return;
      playback.id = null;
      playback.loading = false;
      playback.failed = soundId;
    }
  });

  return (
    <div class="container sounds">
      <h1 class="visually-hidden">{source.scope === 'guild' ? `${source.guildName} sounds` : 'My sounds'}</h1>
      <div class="sounds__summary">
        <Pending fallback$={() => <SummarySkeleton />}>
          <SummaryStrip source={source} />
        </Pending>
        <nav class="filter-tabs sounds__period" aria-label="Period">
          {PERIODS.map((item) => (
            <Link
              key={item}
              href={libraryHref(location.url, { period: item === '30d' ? null : item })}
              scroll={false}
              class="filter-tabs__item"
              aria-current={period === item ? 'page' : undefined}
            >
              {PERIOD_LABELS[item]}
            </Link>
          ))}
        </nav>
      </div>

      <Pending fallback$={() => <WorkSkeleton />}>
        <LibraryWork source={source} playback={playback} votes={votes} onPlay$={togglePlay} />
      </Pending>

      <Pending fallback$={() => <ChartsSkeleton />}>
        <LibraryOverview source={source} />
      </Pending>

      <audio
        ref={audio}
        preload="none"
        onPlaying$={() => {
          playback.loading = false;
        }}
        onWaiting$={() => {
          if (playback.id) playback.loading = true;
        }}
        onEnded$={() => {
          playback.id = null;
          playback.loading = false;
        }}
        onError$={() => {
          if (!playback.id) return;
          playback.failed = playback.id;
          playback.id = null;
          playback.loading = false;
        }}
      />
    </div>
  );
});
