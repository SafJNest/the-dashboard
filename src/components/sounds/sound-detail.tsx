import { $, component$, Pending } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { libraryHref, OTHER_GUILDS, readStats, UNKNOWN_GUILD, type LibraryEntry, type LibraryModel } from '../../lib/sound-library';
import {
  formatAdded,
  formatAverage,
  formatChange,
  formatCount,
  formatLength,
  formatPlayedAt,
  sourceLabel,
  sourceRows,
  topShare,
  WEEKDAYS,
} from '../../lib/sound-stats';
import { PERIOD_LABELS, type Sound, type VoteState } from '../../lib/sounds';
import { Icon } from '../dashboard/icons';
import { readSource, type LibrarySource } from './library-source';
import { LoadError, PanelSkeleton, Skeleton } from './library-states';
import { DayBars, HeatGrid, ReplaySplit, SourceSplit } from './sound-charts';
import { GreetPicker } from './greet-picker';
import type { Playback, PlayHandler } from './sound-library';
import { VoteButtons } from './vote-buttons';

const HISTORY_ROWS = 20;

function weekdayOf(iso: string, timeZone: string) {
  const day = new Date(iso).toLocaleDateString('en-US', { timeZone, weekday: 'long' });
  return WEEKDAYS.indexOf(day);
}

interface PanelProps {
  model: LibraryModel;
  source: LibrarySource;
  sound: Sound;
  guildName: string;
  votes: Record<string, VoteState>;
}

function PanelBar({ url, model, myPlays, scopeLabel }: { url: URL; model: LibraryModel; myPlays: number | null; scopeLabel: string }) {
  const tabHref = (tab: 'everyone' | 'mine') => libraryHref(url, { tab: tab === 'mine' ? 'mine' : null });
  return (
    <div class="sound-panel__bar">
      <nav class="sound-tabs" aria-label="Sound analytics">
        <Link href={tabHref('everyone')} scroll={false} class="sound-tabs__item" aria-current={model.tab === 'everyone' ? 'page' : undefined}>
          Everyone
        </Link>
        <Link href={tabHref('mine')} scroll={false} class="sound-tabs__item" aria-current={model.tab === 'mine' ? 'page' : undefined}>
          Your plays
          {myPlays === null ? <Skeleton width="2ch" height="0.75rem" /> : <span class="badge">{formatCount(myPlays)}</span>}
        </Link>
      </nav>
      <span class="caption">{scopeLabel}</span>
    </div>
  );
}

function scopeLabelOf(model: LibraryModel, guildName: string) {
  const scopeName = model.scope === 'me' && !model.guildId ? 'All servers' : `In ${model.guildId ? model.guildNames[model.guildId] : guildName}`;
  return `${scopeName} · ${model.period === 'all' ? 'all time' : `last ${PERIOD_LABELS[model.period]}`}`;
}

const SoundPanel = component$<PanelProps>(({ model, source, sound, guildName, votes }) => {
  const location = useLocation();
  const scopeLabel = scopeLabelOf(model, guildName);
  const stats = readStats(readSource(source, location.url, true), model, location.url);
  if (!stats || 'failed' in stats || !stats.view) {
    return (
      <>
        <PanelBar url={location.url} model={model} myPlays={null} scopeLabel={scopeLabel} />
        {stats && 'failed' in stats ? (
          <LoadError message={`Statistics are unavailable. ${stats.message}`} retrying={source.analytics.pending} onRetry$={$(() => source.analytics.invalidate())} />
        ) : (
          <PanelSkeleton />
        )}
      </>
    );
  }
  const { view, timezone } = stats;
  const change = formatChange(view.change);
  const history = view.history;
  const lastPlay = history[0] ? formatPlayedAt(history[0].playedAt, timezone) : null;
  const mySources = sourceRows(Object.entries(history.reduce<Record<string, number>>((counts, event) => ({ ...counts, [event.source]: (counts[event.source] ?? 0) + 1 }), {})).map(([source, plays]) => ({ source, plays })));
  const weekdayCounts = WEEKDAYS.map((_, index) => history.filter((event) => weekdayOf(event.playedAt, timezone) === index).length);
  const weekdayMax = Math.max(1, ...weekdayCounts);
  const share = topShare(view.replay, view.myPlays);
  const guildLabel = (guildId: string | null) => (guildId === null ? OTHER_GUILDS : model.guildNames[guildId] ?? UNKNOWN_GUILD);

  return (
    <>
      <PanelBar url={location.url} model={model} myPlays={view.myPlays} scopeLabel={scopeLabel} />
        {model.tab === 'everyone' ? (
          <div class="sound-panel__body">
            <div class="stat-tiles">
              <div class="stat-tile">
                <span class="overline">Plays</span>
                <strong>{formatCount(view.plays)}</strong>
                {change ? <span class={['caption', change.up ? 'delta--up' : 'delta--down']}>{change.text} vs previous period</span> : <span class="caption">No comparison</span>}
              </div>
              <div class="stat-tile">
                <span class="overline">Listeners</span>
                <strong>{formatCount(view.listeners)}</strong>
                <span class="caption">people who played it</span>
              </div>
              <div class="stat-tile">
                <span class="overline">Avg per listener</span>
                <strong>{formatAverage(view.average)}</strong>
                <span class="caption">plays each</span>
              </div>
              <div class="stat-tile">
                <span class="overline">Likes</span>
                <strong>{formatCount(votes[sound.id]?.likes ?? sound.likes)}</strong>
                <span class="caption">all time</span>
              </div>
              <div class="stat-tile">
                <span class="overline">Dislikes</span>
                <strong>{formatCount(votes[sound.id]?.dislikes ?? sound.dislikes)}</strong>
                <span class="caption">all time</span>
              </div>
            </div>
            <DayBars days={view.playsPerDay} label={`Plays of ${sound.name}`} />
            <HeatGrid cells={view.heatmap} label={`Plays of ${sound.name} by hour and weekday`} />
            <div class="chart-pair">
              <SourceSplit sources={view.sources} title="How it gets played" />
              <ReplaySplit buckets={view.replay} myPlays={view.myPlays} />
            </div>
            {view.where.length > 1 && (
              <div class="chart-block">
                <h3 class="chart-block__title">Where it gets played</h3>
                <ul class="where">
                  {view.where.map((row) => (
                    <li key={row.guildId ?? 'other'}>
                      <span>{guildLabel(row.guildId)}</span>
                      <progress class="rank__bar" value={row.plays} max={view.where[0].plays || 1} aria-label={`${guildLabel(row.guildId)}, ${formatCount(row.plays)} plays`} />
                      <span class="text-muted">{formatCount(row.plays)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p class="privacy-note">
              <Icon name="lock" />
              Totals only: Beebot never shows when other people played a sound, and the uploader sees the same numbers. Your own plays are in “Your plays”.
            </p>
          </div>
        ) : (
          <div class="sound-panel__body">
            {view.myPlays > 0 || history.length > 0 ? (
              <>
                <div class="stat-tiles">
                  <div class="stat-tile">
                    <span class="overline">Your plays</span>
                    <strong>{formatCount(view.myPlays)}</strong>
                    <span class="caption">{view.plays ? `${((view.myPlays / view.plays) * 100).toFixed(1)}% of all plays` : 'in this period'}</span>
                  </div>
                  <div class="stat-tile">
                    <span class="overline">Compared to others</span>
                    <strong>{share === null ? '—' : `Top ${share}%`}</strong>
                    <span class="caption">of listeners</span>
                  </div>
                  <div class="stat-tile">
                    <span class="overline">Last played</span>
                    <strong class="stat-tile__text">{lastPlay ? `${lastPlay.date} · ${lastPlay.time}` : '—'}</strong>
                    <span class="caption">{history[0] ? `${guildLabel(history[0].guildId)} · ${sourceLabel(history[0].source)}` : ''}</span>
                  </div>
                  <div class="stat-tile">
                    <span class="overline">Most used mode</span>
                    <strong class="stat-tile__text">{mySources[0]?.label ?? '—'}</strong>
                    <span class="caption">{mySources[0] ? `${mySources[0].percent}% of your recent plays` : ''}</span>
                  </div>
                </div>
                <div class="chart-pair">
                  <SourceSplit sources={mySources.map((row) => ({ source: row.source, plays: row.plays }))} title="How you play it" />
                  <div class="chart-block">
                    <h3 class="chart-block__title">When you play it</h3>
                    <ul class="dist">
                      {WEEKDAYS.map((day, index) => (
                        <li key={day}>
                          <span>{day.slice(0, 3)}</span>
                          <span class="dist__bar">
                            <span style={{ '--part': `${Math.round((weekdayCounts[index] / weekdayMax) * 100)}%` }} />
                          </span>
                          <span class="text-muted">{weekdayCounts[index]} {weekdayCounts[index] === 1 ? 'play' : 'plays'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div class="chart-block">
                  <div class="chart-block__head">
                    <h3 class="chart-block__title">Your recent plays</h3>
                    <span class="caption">Showing {Math.min(HISTORY_ROWS, history.length)} of {history.length} recent plays</span>
                  </div>
                  <div class="table-wrap">
                    <table class="table">
                      <thead>
                        <tr>
                          <th scope="col">When</th>
                          <th scope="col">Server</th>
                          <th scope="col">How</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, HISTORY_ROWS).map((event) => {
                          const when = formatPlayedAt(event.playedAt, timezone);
                          return (
                            <tr key={event.id}>
                              <td>
                                <span class="history__when">
                                  <span>{when.date}</span>
                                  <span class="caption mono">{when.time}</span>
                                </span>
                              </td>
                              <td>{guildLabel(event.guildId)}</td>
                              <td>{sourceLabel(event.source)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div class="sound-panel__empty">
                <span class="play play--ghost" aria-hidden="true">
                  <Icon name="play" />
                </span>
                <p class="heading heading--sm">You haven't played {sound.name} in this period</p>
                <p class="text-muted">Play it in a voice channel and your plays will show up here.</p>
              </div>
            )}
            <p class="privacy-note">
              <Icon name="lock" />
              Only you can see this tab.
            </p>
          </div>
        )}
    </>
  );
});

interface SoundDetailProps {
  model: LibraryModel;
  source: LibrarySource;
  entry: LibraryEntry;
  votes: Record<string, VoteState>;
  playback: Playback;
  onPlay$: PlayHandler;
}

export const SoundDetail = component$<SoundDetailProps>(({ model, source, entry, votes, playback, onPlay$ }) => {
  const location = useLocation();
  const { sound, guildName } = entry;
  const active = playback.id === sound.id;
  const scopeLabel = scopeLabelOf(model, guildName);

  return (
    <section id="sound-detail" class="sound-detail" aria-labelledby="sound-title">
      <a href="#sound-list" class="sound-detail__back">Back to the list</a>
      <div class={['card card--raised sound-head', sound.ownedByMe && 'sound-head--mine']}>
        <div class="sound-head__top">
          <button
            type="button"
            class="play sound-head__play"
            aria-label={`${active ? 'Pause' : 'Play'} ${sound.name}`}
            aria-busy={active && playback.loading}
            disabled={!sound.url}
            onClick$={() => onPlay$(sound.id, sound.url)}
          >
            <Icon name={active ? 'pause' : 'play'} />
          </button>
          <h2 id="sound-title" class="sound-head__title">{sound.name}</h2>
        </div>
        <dl class="sound-facts">
          <div>
            <dt>Uploaded by</dt>
            <dd>
              {sound.uploader.avatarUrl ? (
                <img class="avatar avatar--sm" src={sound.uploader.avatarUrl} alt="" width="20" height="20" />
              ) : (
                <span class="avatar avatar--sm" aria-hidden="true">{sound.uploader.name.slice(0, 1).toUpperCase()}</span>
              )}
              {sound.ownedByMe ? 'You' : sound.uploader.name}
            </dd>
          </div>
          <div>
            <dt>Server</dt>
            <dd>{guildName}</dd>
          </div>
          <div>
            <dt>Length</dt>
            <dd class="mono">{formatLength(sound.durationMs)}</dd>
          </div>
          <div>
            <dt>Added</dt>
            <dd>{formatAdded(sound.createdAt)}</dd>
          </div>
          <div>
            <dt>Visibility</dt>
            <dd>{sound.public ? 'Public' : 'Private'}</dd>
          </div>
          {sound.tags.length > 0 && (
            <div>
              <dt>Tags</dt>
              <dd>
                {sound.tags.map((tag) => (
                  <span class="badge" key={tag.id}>{tag.name}</span>
                ))}
              </dd>
            </div>
          )}
        </dl>
        <div class="sound-actions">
          <VoteButtons key={sound.id} sound={sound} votes={votes} />
          <GreetPicker key={sound.id} soundId={sound.id} soundName={sound.name} variant="button" />
          <div class="sound-actions__end">
            {sound.url && (
              <a href={sound.url} class="button button--secondary" download>
                <Icon name="download" />
                <span>Download</span>
              </a>
            )}
            {sound.canEdit && (
              <Link href={`/dashboard/me/sounds/${sound.id}/edit/`} class="button button--secondary button--icon" aria-label={`Edit ${sound.name}`} title="Edit">
                <Icon name="edit" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div class="card sound-panel">
        <Pending
          fallback$={() => (
            <>
              <PanelBar url={location.url} model={model} myPlays={null} scopeLabel={scopeLabel} />
              <PanelSkeleton />
            </>
          )}
        >
          <SoundPanel model={model} source={source} sound={sound} guildName={guildName} votes={votes} />
        </Pending>
      </div>
    </section>
  );
});
