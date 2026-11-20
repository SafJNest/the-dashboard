import { $, component$, Pending, useComputed$, useContext, useSignal } from '@qwik.dev/core';
import { Form, Link, useLocation, useNavigate } from '@qwik.dev/router';
import { useAccount } from '../../routes/dashboard/layout';
import {
  useAddSoundboardSound,
  useDeleteSoundboard,
  useRemoveSoundboardSound,
  useRenameSoundboard,
  useSetSoundboardThumbnail,
  useSoundboard,
} from '../../routes/dashboard/[guildId]/soundboards/[boardId]/index';
import { IMAGE_TYPES, SOUNDS_PATH } from '../../lib/catalog';
import { LOAD_ERROR } from '../../lib/sound-library';
import { formatCompact, formatLength } from '../../lib/sound-stats';
import { Soundboards, type Soundboard } from '../../lib/soundboards';
import type { Sound } from '../../lib/sounds';
import { Icon } from '../dashboard/icons';
import { SaveDock } from '../dashboard/save-dock';
import { EmptyState } from '../empty-state/empty-state';
import { LoadError, Skeleton } from '../sounds/library-states';
import { SoundPlayerContext } from '../sounds/sound-player';
import { Toast } from '../toast/toast';
import { BoardLibrary, LibrarySkeleton } from './board-library';
import { BoardThumb } from './board-list';
import { openDraft, SoundboardDraftContext } from './draft';

const SLOTS = Array.from({ length: Soundboards.MAX_SOUNDS }, (_, index) => index);

function ActionError({ message }: { message: string | null | undefined }) {
  if ( !message ) { return null; }
  return (
    <div class="callout callout--danger" role="alert">
      <Icon name="warning" />
      <p>{message}</p>
    </div>
  );
}

function SlotName({ sound, guildId }: { sound: Sound; guildId: string }) {
  const guildHref = Soundboards.guildSoundPath(sound, guildId);
  if ( guildHref ) { return <Link href={guildHref} class="board-slot__name">{sound.name}</Link>; }
  if ( sound.public ) { return <a href={`${SOUNDS_PATH}/${sound.id}/`} class="board-slot__name">{sound.name}</a>; }
  return <span class="board-slot__name">{sound.name}</span>;
}

export function DetailSkeleton() {
  return (
    <section class="board-detail" aria-busy="true">
      <span class="visually-hidden" role="status">Loading soundboard</span>
      <div class="card card--raised board-head" aria-hidden="true">
        <Skeleton width="5.5rem" height="5.5rem" />
        <div class="board-head__identity">
          <Skeleton width="40%" height="1.75rem" />
          <Skeleton width="25%" />
        </div>
      </div>
      <div class="card board-grid-card" aria-hidden="true">
        <ol class="board-grid">
          {SLOTS.map((slot) => (
            <li key={slot} class="board-slot board-slot--empty" />
          ))}
        </ol>
      </div>
    </section>
  );
}

const BoardGrid = component$<{ board: Soundboard; sounds: Sound[] }>(({ board, sounds }) => {
  const player = useContext(SoundPlayerContext);
  const remove = useRemoveSoundboardSound();

  return (
    <section class="card board-grid-card" aria-labelledby="board-grid-title">
      <div class="chart-block__head">
        <h3 id="board-grid-title" class="chart-block__title">Sounds</h3>
        <span class="caption">{sounds.length} / {Soundboards.MAX_SOUNDS} slots · plays in total</span>
      </div>
      <ActionError message={remove.value?.message} />
      <Form action={remove} class="sound-editor__form">
        <ol class="board-grid">
          {SLOTS.map((slot) => {
            const sound = sounds.at(slot);
            if (!sound) {
              const isFirstEmpty = slot === sounds.length;
              return (
                <li key={`empty-${slot}`} class="board-slot board-slot--empty">
                  {board.canEdit && isFirstEmpty && (
                    <a href="#board-library" class="board-slot__add" aria-label="Add a sound from the library">
                      <Icon name="plus" />
                    </a>
                  )}
                </li>
              );
            }
            const isCurrent = player.state.soundId === sound.id;
            const isPlaying = isCurrent && player.state.playing;
            const meta = player.state.failed === sound.id ? "Couldn't play" : `${formatLength(sound.durationMs)} · ${formatCompact(sound.plays)} plays`;
            return (
              <li key={sound.id} class={['board-slot', isCurrent && 'board-slot--current']}>
                <span class="board-slot__index" aria-hidden="true">{slot + 1}</span>
                <button
                  type="button"
                  class="play board-slot__play"
                  aria-label={`${isPlaying ? 'Pause' : 'Play'} ${sound.name}`}
                  aria-busy={isCurrent && player.state.loading}
                  disabled={!sound.url}
                  onClick$={() => player.toggle$(sound.id, sound.url)}
                >
                  <Icon name={isPlaying ? 'pause' : 'play'} />
                </button>
                <SlotName sound={sound} guildId={board.guildId} />
                <span class="caption board-slot__meta">{meta}</span>
                {board.canEdit && (
                  <button type="submit" name="soundId" value={sound.id} class="board-slot__remove" aria-label={`Remove ${sound.name} from the board`} disabled={remove.isRunning}>
                    <Icon name="close" />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </Form>
    </section>
  );
});

const BoardRename = component$<{ board: Soundboard }>(({ board }) => {
  const rename = useRenameSoundboard();
  const name = useSignal(board.name);
  const dirty = useComputed$(() => name.value !== board.name);
  const reset = $(() => {
    name.value = board.name;
  });

  return (
    <Form action={rename} class="card settings-card sound-editor__form">
      <h3 class="chart-block__title">Name</h3>
      <ActionError message={rename.value?.message} />
      <div class="field">
        <label class="label" for="board-name">Board name</label>
        <input id="board-name" class="input" name="name" bind:value={name} maxLength={Soundboards.NAME_MAX} required autocomplete="off" />
        <p class="hint">Members choose the board by this name with /soundboard play.</p>
      </div>
      {rename.value?.ok && !dirty.value && <Toast class="settings-status" title="Name saved" />}
      <SaveDock dirty={dirty} action={rename} onReset$={reset} />
    </Form>
  );
});

const BoardThumbnail = component$<{ board: Soundboard }>(({ board }) => {
  const upload = useSetSoundboardThumbnail();

  return (
    <section class="card settings-card" aria-labelledby="board-thumbnail">
      <h3 id="board-thumbnail" class="chart-block__title">Thumbnail</h3>
      <div class="sound-image">
        <BoardThumb board={board} size="lg" />
        <div class="sound-image__body">
          <p class="hint">Image for this soundboard. PNG, JPEG or GIF, up to 1 MB. Square works best.</p>
          <Form action={upload} enctype="multipart/form-data" class="sound-image__actions">
            <label class="button button--secondary button--sm">
              <Icon name="plus" />
              <span>{upload.isRunning ? 'Uploading…' : board.thumbnailUrl ? 'Replace thumbnail' : 'Upload thumbnail'}</span>
              <input
                type="file"
                name="file"
                accept={IMAGE_TYPES.join(',')}
                class="visually-hidden"
                aria-label={`Thumbnail for ${board.name}`}
                disabled={upload.isRunning}
                onChange$={(_, input) => input.form?.requestSubmit()}
              />
            </label>
          </Form>
          <ActionError message={upload.value?.message} />
        </div>
      </div>
    </section>
  );
});

const BoardAdd = component$<{ sounds: Sound[] }>(({ sounds }) => {
  const add = useAddSoundboardSound();
  const onBoard = sounds.map((sound) => sound.id);

  return (
    <section id="board-library" class="card card--flush board-library" aria-labelledby="board-library-title">
      <div class="board-library__head">
        <h3 id="board-library-title" class="chart-block__title">Add from library</h3>
        <span class="caption">Sounds uploaded to this server</span>
      </div>
      <ActionError message={add.value?.message} />
      <Form action={add} class="sound-editor__form">
        <Pending fallback$={() => <LibrarySkeleton />}>
          <BoardLibrary mode="add" onBoard={onBoard} running={add.isRunning} />
        </Pending>
      </Form>
    </section>
  );
});

const BoardDelete = component$<{ board: Soundboard }>(({ board }) => {
  const navigate = useNavigate();
  const remove = useDeleteSoundboard();
  const dialog = useSignal<HTMLDialogElement>();

  return (
    <section class="card settings-card" aria-labelledby="board-delete">
      <h3 id="board-delete" class="chart-block__title">Delete soundboard</h3>
      <p class="hint">The sounds stay in the server library. This can't be undone.</p>
      <div>
        <button type="button" class="button button--danger button--sm" onClick$={() => dialog.value?.showModal()}>
          <Icon name="trash" />
          <span>Delete soundboard</span>
        </button>
      </div>
      <dialog ref={dialog} class="card card--raised confirm" aria-labelledby="board-delete-title">
        <Form
          action={remove}
          class="confirm__body"
          onSubmitCompleted$={async (event) => {
            if ( !event.detail.value?.ok ) { return; }
            dialog.value?.close();
            await navigate(Soundboards.path(board.guildId));
          }}
        >
          <h2 id="board-delete-title" class="chart-block__title">Delete “{board.name}”?</h2>
          <p class="text-muted">The board is removed for everyone in this server. Its sounds stay in the library. This can't be undone.</p>
          <ActionError message={remove.value?.message} />
          <div class="confirm__actions">
            <button type="button" class="button button--ghost button--sm" disabled={remove.isRunning} onClick$={() => dialog.value?.close()}>
              Cancel
            </button>
            <button type="submit" class="button button--danger button--sm" disabled={remove.isRunning || remove.value?.ok}>
              {remove.isRunning ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Form>
      </dialog>
    </section>
  );
});

export const BoardDetail = component$(() => {
  const location = useLocation();
  const account = useAccount();
  const soundboard = useSoundboard();
  const draft = useContext(SoundboardDraftContext);
  const data = soundboard.error ? null : soundboard.value;
  const retry = $(() => soundboard.invalidate());

  if ( !data ) { return <LoadError message={LOAD_ERROR} retrying={soundboard.pending} onRetry$={retry} />; }
  if ( data.boardId !== location.params.boardId ) { return <DetailSkeleton />; }
  if (data.failed && data.status === 404) {
    return (
      <div class="card sounds__empty">
        <EmptyState icon="soundboards" title="Soundboard not found" role="alert">
          {data.message}
          <Link q:slot="actions" href={Soundboards.path(data.guildId)} scroll={false} class="button button--secondary">All soundboards</Link>
        </EmptyState>
      </div>
    );
  }
  if ( data.failed ) { return <LoadError message={data.message} retrying={soundboard.pending} onRetry$={retry} />; }

  const { board, sounds } = data.detail;
  const isMine = board.userId === account.value.user.id;
  const duplicate = $(() => {
    const soundIds = sounds.map((sound) => sound.id).slice(0, Soundboards.MAX_SOUNDS);
    openDraft(draft, location.url.pathname, `${board.name} copy`, soundIds);
  });

  return (
    <section class="board-detail" aria-labelledby="board-title">
      <div class="card card--raised board-head">
        <BoardThumb board={board} size="lg" />
        <div class="board-head__identity">
          <h2 id="board-title" class="sound-head__title">{board.name}</h2>
          <span class="board-head__meta">
            {isMine && <span class="badge badge--accent">Yours</span>}
            {!board.canEdit && <span class="badge">View only</span>}
            <span class="caption">{sounds.length} / {Soundboards.MAX_SOUNDS} sounds</span>
          </span>
        </div>
        <button type="button" class="button button--secondary button--sm" onClick$={duplicate}>
          <Icon name="copy" />
          <span>Duplicate</span>
        </button>
      </div>

      {!board.canEdit && (
        <div class="callout callout--info" role="note">
          <Icon name="info" />
          <p>Only the member who made this board or a server administrator can change it. You can play its sounds and duplicate it.</p>
        </div>
      )}

      <BoardGrid board={board} sounds={sounds} />

      {board.canEdit && (
        <>
          <div class="board-detail__edit">
            <BoardRename board={board} />
            <BoardThumbnail board={board} />
          </div>
          <BoardAdd sounds={sounds} />
          <BoardDelete board={board} />
        </>
      )}
    </section>
  );
});
