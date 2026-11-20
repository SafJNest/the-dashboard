import { $, component$, sync$, useContext, useSignal } from '@qwik.dev/core';
import { useLocation } from '@qwik.dev/router';
import { useGuildSoundLibrary } from '../../routes/dashboard/[guildId]/soundboards/layout';
import { LOAD_ERROR } from '../../lib/sound-library';
import { formatLength } from '../../lib/sound-stats';
import { Soundboards } from '../../lib/soundboards';
import { Icon } from '../dashboard/icons';
import { LoadError, RowsSkeleton, Skeleton } from '../sounds/library-states';
import { SoundPlayerContext } from '../sounds/sound-player';
import { SoundboardDraftContext } from './draft';

const PAGE = 40;

type BoardLibraryProps = { mode: 'select' } | { mode: 'add'; onBoard: string[]; running: boolean };

export function LibrarySkeleton() {
  return (
    <div class="board-library__body" aria-busy="true">
      <span class="visually-hidden" role="status">Loading sounds</span>
      <Skeleton width="100%" height="var(--bb-control-sm)" />
      <RowsSkeleton />
    </div>
  );
}

export const BoardLibrary = component$<BoardLibraryProps>((props) => {
  const location = useLocation();
  const library = useGuildSoundLibrary();
  const draft = useContext(SoundboardDraftContext);
  const player = useContext(SoundPlayerContext);
  const query = useSignal('');
  const limit = useSignal(PAGE);
  const data = library.error ? null : library.value;
  const retry = $(() => library.invalidate());

  const toggle = $((soundId: string) => {
    const isChosen = draft.soundIds.includes(soundId);
    draft.soundIds = isChosen ? draft.soundIds.filter((id) => id !== soundId) : [...draft.soundIds, soundId];
  });

  if ( !data ) { return <LoadError message={LOAD_ERROR} retrying={library.pending} onRetry$={retry} />; }
  if ( data.guildId !== location.params.guildId ) { return <LibrarySkeleton />; }
  if ( data.failed ) { return <LoadError message={`Sounds are unavailable. ${data.message}`} retrying={library.pending} onRetry$={retry} />; }

  const chosen = new Set(props.mode === 'select' ? draft.soundIds : props.onBoard);
  const isFull = chosen.size >= Soundboards.MAX_SOUNDS;
  const search = query.value.trim().toLowerCase();
  const sorted = [...data.library.sounds].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const matches = search ? sorted.filter((sound) => sound.name.toLowerCase().includes(search) || sound.tags.some((tag) => tag.name.toLowerCase().includes(search))) : sorted;
  const shown = matches.slice(0, limit.value);

  return (
    <div class="board-library__body">
      <label class="sound-list__search">
        <Icon name="search" />
        <span class="visually-hidden">Search sounds</span>
        <input
          type="search"
          class="input input--sm"
          placeholder="Search sounds or tags"
          autocomplete="off"
          bind:value={query}
          onInput$={() => (limit.value = PAGE)}
          onKeyDown$={sync$((event: KeyboardEvent) => event.key === 'Enter' && event.preventDefault())}
        />
      </label>
      <ul class="board-library__list">
        {shown.map((sound) => {
          const isChosen = chosen.has(sound.id);
          const detail = `${sound.ownedByMe ? 'You' : sound.uploader.name} · ${formatLength(sound.durationMs)}`;
          const isCurrent = player.state.soundId === sound.id;
          const isPlaying = isCurrent && player.state.playing;
          const play = (
            <button
              type="button"
              class="play sound-row__play"
              aria-label={`${isPlaying ? 'Pause' : 'Play'} ${sound.name}`}
              aria-busy={isCurrent && player.state.loading}
              disabled={!sound.url}
              onClick$={() => player.toggle$(sound.id, sound.url)}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} />
            </button>
          );
          if (props.mode === 'select') {
            return (
              <li key={sound.id} class="board-library__pick">
                {play}
                <label class="board-library__row">
                  <input type="checkbox" class="board-library__check" checked={isChosen} disabled={!isChosen && isFull} onChange$={() => toggle(sound.id)} />
                  <span class="board-library__main">
                    <span class="board-library__name">{sound.name}</span>
                    <span class="caption">{detail}</span>
                  </span>
                </label>
              </li>
            );
          }
          return (
            <li key={sound.id} class="board-library__row">
              {play}
              <span class="board-library__main">
                <span class="board-library__name">{sound.name}</span>
                <span class="caption">{detail}</span>
              </span>
              {isChosen ? (
                <span class="badge">On board</span>
              ) : (
                <button type="submit" name="soundId" value={sound.id} class="button button--secondary button--sm" disabled={isFull || props.running} aria-label={`Add ${sound.name}`}>
                  {isFull ? 'Full' : 'Add'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {matches.length > shown.length && (
        <button type="button" class="button button--secondary button--sm" onClick$={() => (limit.value += PAGE)}>
          Load {Math.min(PAGE, matches.length - shown.length)} more
        </button>
      )}
      {!matches.length && <p class="caption">{search ? `No sounds match “${query.value.trim()}”.` : 'Nobody has uploaded a sound to this server yet.'}</p>}
    </div>
  );
});
