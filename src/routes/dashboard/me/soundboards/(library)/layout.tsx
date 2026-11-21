import { $, component$, Pending, Slot, useSignal, useStyles$, useTask$, type QRL } from '@qwik.dev/core';
import { Form, useLocation, type RequestHandler } from '@qwik.dev/router';
import { BoardRow } from '../../../../../components/catalog/board-items';
import { PanelSkeleton, RowsSkeleton } from '../../../../../components/catalog/catalog-states';
import { neighbours, PanelBar } from '../../../../../components/catalog/panel-bar';
import { Icon } from '../../../../../components/dashboard/icons';
import { EmptyState } from '../../../../../components/empty-state/empty-state';
import { OwnerBoard } from '../../../../../components/soundboards/owner-board';
import { LoadError } from '../../../../../components/sounds/library-states';
import { apiError, awaitLoader, isDocumentRequest, loaderResolver } from '../../../../../lib/beebot.server';
import { loadBoardSounds, useAddBoardSound, useArrangeBoard, useCreateBoard, useDeleteBoard, useMyBoard, usePlacingSound, useRemoveBoardSound, useUpdateBoard } from '../../../../../lib/board-editor';
import { SoundLibrary, type VisibilityFilter } from '../../../../../lib/sound-library';
import { useMyBoards } from '../../../../../lib/sound-loaders';
import type { CatalogResult } from '../../../../../lib/beebot/catalog.server';
import type { MySoundLibrary } from '../../../../../lib/sounds';
import { formatCount } from '../../../../../lib/sound-stats';
import { Soundboards } from '../../../../../lib/soundboards';
import { useAccount } from '../../../layout';
import soundStyles from '../../../../../components/sounds/sounds.css?inline';

export { useAddBoardSound, useArrangeBoard, useCreateBoard, useDeleteBoard, useMyBoard, useMyBoards, usePlacingSound, useRemoveBoardSound, useUpdateBoard };

const VISIBILITIES: VisibilityFilter[] = ['all', 'public', 'private'];

export const onGet: RequestHandler = async (event) => {
  if ( !isDocumentRequest(event) ) { return; }
  const resolveValue = loaderResolver(event);
  resolveValue(useAccount).catch(() => undefined);
  const board = resolveValue(useMyBoard);
  const placing = resolveValue(usePlacingSound);
  board.catch(() => undefined);
  placing.catch(() => undefined);
  const boards = await awaitLoader(event, resolveValue(useMyBoards));
  if ( boards.failed ) { throw apiError(event, boards); }
  const detail = await awaitLoader(event, board);
  if ( detail.failed ) { throw apiError(event, detail); }
  const sound = await awaitLoader(event, placing);
  if ( sound.failed ) { throw apiError(event, sound); }
};

const NewBoard = component$<{ onClose$: QRL<() => void> }>(({ onClose$ }) => {
  const create = useCreateBoard();
  const library = useSignal<CatalogResult<MySoundLibrary> | null>();
  const chosen = useSignal<string[]>([]);

  useTask$(async ({ cleanup }) => {
    const request = new AbortController();
    cleanup(() => request.abort());

    const result = await loadBoardSounds(request.signal).catch(() => null);
    if ( !request.signal.aborted ) { library.value = result; }
  });

  const data = library.value;
  const entries = data?.ok ? SoundLibrary.filter(SoundLibrary.myEntries(data.data), { text: '', owner: 'all', visibility: 'all', sort: 'name' }) : [];
  const isFull = chosen.value.length >= Soundboards.MAX_SOUNDS;

  return (
    <Form action={create} class="card settings-card new-board">
      <h2 class="chart-block__title">New soundboard</h2>
      {create.value?.message && <p class="callout callout--danger" role="alert">{create.value.message}</p>}
      <div class="field">
        <label class="label" for="new-board-name">Name</label>
        <input id="new-board-name" class="input" name="name" maxLength={Soundboards.NAME_MAX} required autocomplete="off" autofocus />
      </div>
      <fieldset class="new-board__sounds">
        <legend class="label">Sounds · {chosen.value.length} / {Soundboards.MAX_SOUNDS}</legend>
        {data === undefined && <RowsSkeleton label="Loading your sounds" />}
        {data === null && <p class="callout callout--danger" role="alert">{SoundLibrary.LOAD_ERROR}</p>}
        {data && !data.ok && <p class="callout callout--danger" role="alert">{data.message}</p>}
        {entries.map(({ sound }) => {
          const isChosen = chosen.value.includes(sound.id);
          return (
            <label key={sound.id} class="choice">
              <input type="checkbox" class="choice__input" name="soundIds[]" value={sound.id} checked={isChosen} disabled={!isChosen && isFull}
                onChange$={(_, input) => (chosen.value = input.checked ? [...chosen.value, sound.id] : chosen.value.filter((id) => id !== sound.id))} />
              <span class="choice__title">{sound.name}</span>
              <span class="choice__mark"><Icon name="check" /></span>
            </label>
          );
        })}
        {data?.ok && !entries.length && <p class="caption">Upload a sound first: a board needs at least one.</p>}
      </fieldset>
      <div class="confirm__actions">
        <button type="button" class="button button--ghost button--sm" onClick$={onClose$}>Cancel</button>
        <button type="submit" class="button button--primary button--sm" disabled={create.isRunning || !chosen.value.length} aria-busy={create.isRunning}>
          {create.isRunning ? 'Creating…' : 'Create soundboard'}
        </button>
      </div>
    </Form>
  );
});

const BoardDetail = component$(() => {
  const location = useLocation();
  const account = useAccount();
  const loader = useMyBoard();
  const placing = usePlacingSound();
  const value = loader.error ? null : loader.value;
  const sound = placing.error ? null : placing.value;
  if ( !value ) { return <LoadError message={SoundLibrary.LOAD_ERROR} retrying={loader.pending} onRetry$={$(() => loader.invalidate())} />; }
  if ( value.boardId !== location.params.boardId ) { return <PanelSkeleton />; }
  if ( value.failed ) { return <div class="catalog-panel__body"><LoadError message={value.message} /></div>; }
  if ( !value.detail ) { return null; }
  const isPlacing = !!sound && !sound.failed && sound.soundId === location.params.soundId && !!sound.name;
  const { user } = account.value;
  return (
    <OwnerBoard
      key={value.boardId}
      detail={value.detail}
      owner={{ id: user.id, name: user.name, avatarUrl: user.avatarUrl }}
      placing={isPlacing ? { soundId: sound.soundId as string, name: sound.name as string } : null}
    />
  );
});

const MyBoards = component$<{ visibility: VisibilityFilter }>(({ visibility }) => {
  const location = useLocation();
  const account = useAccount();
  const loader = useMyBoards();
  const retry = $(() => loader.invalidate());
  if ( loader.error ) { return <LoadError message={SoundLibrary.LOAD_ERROR} retrying={loader.pending} onRetry$={retry} />; }
  const data = loader.value;
  if ( data.failed ) { return <LoadError message={data.message} retrying={loader.pending} onRetry$={retry} />; }
  const { boardId } = location.params;
  const boards = visibility === 'all' ? data.boards : data.boards.filter((board) => board.public === (visibility === 'public'));
  const position = boards.findIndex((board) => board.id === boardId);
  const paths = neighbours(boards, position, (board) => Soundboards.myPath(board.id));
  const userId = account.value.user.id;
  const guildName = (guildId: string | null) => (guildId ? account.value.guilds.find((guild) => guild.id === guildId)?.name ?? null : null);

  if ( !data.boards.length && !boardId ) {
    return (
      <div class="card">
        <EmptyState icon="soundboards" title="No soundboards yet" flight="patrol">
          Put up to {Soundboards.MAX_SOUNDS} sounds on keys and play them from the dashboard or Discord.
        </EmptyState>
      </div>
    );
  }

  return (
    <div class="catalog-results">
      <section class="catalog-list catalog-list--grid" aria-label="Your soundboards">
        {boards.map((board) => <BoardRow key={board.id} board={board} href={Soundboards.myPath(board.id)} viewerId={userId} detail={guildName(board.guildId)} current={board.id === boardId} />)}
        {!boards.length && <p class="text-muted">No soundboards match this filter.</p>}
      </section>
      {boardId && (
        <aside class="card card--raised catalog-panel" aria-label="Soundboard details">
          <PanelBar kind="Soundboard" closeHref={Soundboards.myPath()} {...paths} />
          <Pending fallback$={() => <PanelSkeleton />}>
            <BoardDetail />
          </Pending>
        </aside>
      )}
    </div>
  );
});

export default component$(() => {
  useStyles$(soundStyles);
  const loader = useMyBoards();
  const visibility = useSignal<VisibilityFilter>('all');
  const creating = useSignal(false);
  const data = loader.error || loader.pending ? null : loader.value;
  const count = data && !data.failed ? data.boards.length : null;

  return (
    <main class="container library">
      <header class="library__head">
        <div class="settings-head__text">
          <p class="overline">Your profile{count === null ? '' : ` · ${formatCount(count)} boards`}</p>
          <h1 class="settings-head__title">My soundboards</h1>
          <p class="text-muted">Up to {Soundboards.MAX_SOUNDS} sounds on the keys Q to N. Edit names, visibility and keys here.</p>
        </div>
        <button type="button" class="button button--primary" disabled={creating.value} onClick$={() => (creating.value = true)}>
          <Icon name="plus" />New soundboard
        </button>
      </header>
      {creating.value && (
        <Pending fallback$={() => <PanelSkeleton />}>
          <NewBoard onClose$={$(() => (creating.value = false))} />
        </Pending>
      )}
      <div class="catalog-filters library__tools">
        <div class="filter-tabs" role="group" aria-label="Visibility">
          {VISIBILITIES.map((value) => (
            <button key={value} type="button" class="filter-tabs__item" aria-pressed={visibility.value === value} onClick$={() => (visibility.value = value)}>
              {SoundLibrary.VISIBILITY_LABELS[value]}
            </button>
          ))}
        </div>
      </div>
      <Pending fallback$={() => <div class="catalog-list"><RowsSkeleton label="Loading your soundboards" /></div>}>
        <MyBoards visibility={visibility.value} />
      </Pending>
      <Slot />
    </main>
  );
});
