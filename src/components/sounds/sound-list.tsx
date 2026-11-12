import { $, component$, Pending, useOnDocument, useSignal, type QRL } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { useAccount } from '../../routes/dashboard/layout';
import { libraryHref, mySoundsPath, readStats, sortEntries, soundHref, type LibraryEntry, type LibraryModel, type Owner, type SortOrder } from '../../lib/sound-library';
import { formatCompact, formatLength } from '../../lib/sound-stats';
import { GuildAvatar } from '../dashboard/guild-avatar';
import { Icon } from '../dashboard/icons';
import { readSource, type LibrarySource } from './library-source';
import { Skeleton } from './library-states';
import type { Playback, PlayHandler } from './sound-library';

const PAGE = 40;
const OWNERS: { value: Owner; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'others', label: 'Others' },
];
const SORTS: { value: SortOrder; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'plays', label: 'Plays' },
];

const GuildPicker = component$<{ model: LibraryModel }>(({ model }) => {
  const location = useLocation();
  const account = useAccount();
  const menu = useSignal<HTMLDetailsElement>();
  const current = model.guilds.find((guild) => guild.id === model.guildId);
  const iconOf = (guildId: string) => account.value.guilds.find((guild) => guild.id === guildId)?.iconUrl ?? null;

  useOnDocument('click', $((event) => {
    if (menu.value?.open && !menu.value.contains(event.target as Node)) menu.value.open = false;
  }));
  useOnDocument('keydown', $((event) => {
    if ((event as KeyboardEvent).key !== 'Escape' || !menu.value?.open) return;
    menu.value.open = false;
    menu.value.querySelector('summary')?.focus();
  }));

  const close = $(() => {
    if (menu.value) menu.value.open = false;
  });

  return (
    <details class="switcher sound-list__guilds" ref={menu}>
      <summary class="switcher__toggle" aria-label={`Server filter, current ${current?.name ?? 'All servers'}`}>
        {current ? <GuildAvatar name={current.name} iconUrl={iconOf(current.id)} size="sm" /> : <span class="avatar avatar--sm avatar--square sound-list__all" aria-hidden="true">∗</span>}
        <span>{current?.name ?? 'All servers'}</span>
        <Icon name="chevrons" />
      </summary>
      <ul class="listbox switcher__menu">
        <li>
          <Link href={libraryHref(location.url, {}, mySoundsPath(null))} scroll={false} class="option" aria-current={!current ? 'page' : undefined} onClick$={close}>
            <span class="avatar avatar--sm avatar--square sound-list__all" aria-hidden="true">∗</span>
            <span class="option__title">All servers</span>
            <span class="caption">{model.ownerCounts.all}</span>
          </Link>
        </li>
        {model.guilds.map((guild) => (
          <li key={guild.id}>
            <Link href={libraryHref(location.url, {}, mySoundsPath(guild.id))} scroll={false} class="option" aria-current={guild.id === model.guildId ? 'page' : undefined} onClick$={close}>
              <GuildAvatar name={guild.name} iconUrl={iconOf(guild.id)} size="sm" />
              <span class="option__title">{guild.name}</span>
              <span class="caption">{guild.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
});

interface SoundRowsProps {
  url: URL;
  model: LibraryModel;
  entries: LibraryEntry[];
  limit: number;
  plays: Record<string, number> | null;
  playback: Playback;
  onPlay$: PlayHandler;
}

function SoundRows({ url, model, entries, limit, plays, playback, onPlay$ }: SoundRowsProps) {
  const selectedId = model.selected?.sound.id;
  return (
    <>
      {entries.slice(0, limit).map(({ sound, guildName }) => {
        const active = playback.id === sound.id;
        return (
          <div key={sound.id} class={['sound-row', sound.id === selectedId && 'sound-row--selected']}>
            <button
              type="button"
              class="play sound-row__play"
              aria-label={`${active ? 'Pause' : 'Play'} ${sound.name}`}
              aria-busy={active && playback.loading}
              disabled={!sound.url}
              onClick$={() => onPlay$(sound.id, sound.url)}
            >
              <Icon name={active ? 'pause' : 'play'} />
            </button>
            <Link href={soundHref(model, url, sound.id)} scroll={false} class="sound-row__main" aria-current={sound.id === selectedId ? 'true' : undefined}>
              <span class="sound-row__name">{sound.name}</span>
              <span class="sound-row__meta">
                {model.scope === 'guild' && sound.ownedByMe && <span class="sound-row__mine">Yours</span>}
                <span>
                  {playback.failed === sound.id ? "Couldn't play" : `${model.scope === 'guild' ? (sound.ownedByMe ? 'You' : sound.uploader.name) : guildName} · ${formatLength(sound.durationMs)}`}
                </span>
              </span>
            </Link>
            {plays ? (
              <span class="sound-row__plays" aria-label={`${plays[sound.id] ?? 0} plays`}>
                <Icon name="play" />
                {formatCompact(plays[sound.id] ?? 0)}
              </span>
            ) : (
              <span class="sound-row__plays">
                <Skeleton width="3ch" height="0.625rem" />
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

interface StatRowsProps extends Omit<SoundRowsProps, 'plays' | 'url'> {
  source: LibrarySource;
}

const StatRows = component$<StatRowsProps>(({ source, model, entries, limit, playback, onPlay$ }) => {
  const location = useLocation();
  const stats = readStats(readSource(source, location.url, true), model, location.url);
  const plays = stats && !('failed' in stats) ? stats.plays : null;
  const sorted = sortEntries(entries, model.sort, plays);
  return (
    <>
      {model.sort === 'plays' && !plays && (
        <p class="caption sound-list__note" role="status">
          {stats ? 'Plays are unavailable right now, so sounds stay in name order.' : 'Sorting by plays…'}
        </p>
      )}
      <SoundRows url={location.url} model={model} entries={sorted} limit={limit} plays={plays} playback={playback} onPlay$={onPlay$} />
    </>
  );
});

interface SoundListProps {
  model: LibraryModel;
  source: LibrarySource;
  playback: Playback;
  onPlay$: QRL<(soundId: string, url: string | null) => void>;
}

export const SoundList = component$<SoundListProps>(({ model, source, playback, onPlay$ }) => {
  const location = useLocation();
  const query = useSignal('');
  const limit = useSignal(PAGE);
  const search = query.value.trim().toLowerCase();
  const entries = search
    ? model.entries.filter(({ sound }) => sound.name.toLowerCase().includes(search) || sound.tags.some((tag) => tag.name.toLowerCase().includes(search)))
    : model.entries;
  const shown = Math.min(entries.length, limit.value);

  return (
    <aside id="sound-list" class="card card--flush sound-list" aria-label="Sounds">
      <div class="sound-list__tools">
        <label class="sound-list__search">
          <Icon name="search" />
          <span class="visually-hidden">Search sounds</span>
          <input
            type="search"
            class="input input--sm"
            placeholder="Search sounds or tags"
            autocomplete="off"
            bind:value={query}
            onInput$={() => {
              limit.value = PAGE;
            }}
          />
        </label>
        <div class="sound-list__filters">
          {model.scope === 'guild' ? (
            <nav class="filter-tabs" aria-label="Uploaded by">
              {OWNERS.map((owner) => (
                <Link
                  key={owner.value}
                  href={libraryHref(location.url, { owner: owner.value === 'all' ? null : owner.value }, model.basePath)}
                  scroll={false}
                  class="filter-tabs__item"
                  aria-current={model.owner === owner.value ? 'page' : undefined}
                >
                  {owner.label}
                  <span class="filter-tabs__count">{model.ownerCounts[owner.value]}</span>
                </Link>
              ))}
            </nav>
          ) : (
            <GuildPicker model={model} />
          )}
          <nav class="filter-tabs sound-list__sort" aria-label="Sort by">
            <Icon name="sort" />
            {SORTS.map((sort) => (
              <Link
                key={sort.value}
                href={libraryHref(location.url, { sort: sort.value === 'name' ? null : sort.value })}
                scroll={false}
                class="filter-tabs__item"
                aria-current={model.sort === sort.value ? 'page' : undefined}
              >
                {sort.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div class="sound-list__body">
        <Pending fallback$={() => <SoundRows url={location.url} model={model} entries={entries} limit={limit.value} plays={null} playback={playback} onPlay$={onPlay$} />}>
          <StatRows source={source} model={model} entries={entries} limit={limit.value} playback={playback} onPlay$={onPlay$} />
        </Pending>
        {entries.length > shown && (
          <div class="sound-list__more">
            <button
              type="button"
              class="button button--secondary button--sm"
              onClick$={() => {
                limit.value += PAGE;
              }}
            >
              Load {Math.min(PAGE, entries.length - shown)} more
            </button>
          </div>
        )}
        {!entries.length && <p class="caption sound-list__empty">{search ? `No sounds match “${query.value.trim()}”.` : 'No sounds here yet.'}</p>}
      </div>
      <p class="caption sound-list__foot">
        Showing {shown} of {entries.length}
        {model.selected && <a href="#sound-detail" class="sound-list__jump">Show {model.selected.sound.name}</a>}
      </p>
    </aside>
  );
});
