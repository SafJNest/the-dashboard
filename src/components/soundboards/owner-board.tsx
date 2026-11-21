import { $, component$, useComputed$, useSignal, useVisibleTask$ } from '@qwik.dev/core';
import { Form, useNavigate } from '@qwik.dev/router';
import { boardPath } from '../../lib/catalog';
import { useAddBoardSound, useArrangeBoard, useDeleteBoard, useRemoveBoardSound, useUpdateBoard } from '../../lib/board-editor';
import { SoundLibrary } from '../../lib/sound-library';
import { useMySounds } from '../../lib/sound-loaders';
import { formatCount, formatLength } from '../../lib/sound-stats';
import { Soundboards, type SoundboardDetail } from '../../lib/soundboards';
import type { SoundUser } from '../../lib/sounds';
import { BoardHead } from '../catalog/board-panel';
import { CopyCommand } from '../catalog/copy-buttons';
import { revealPanel } from '../catalog/panel-bar';
import { LazyComments } from '../catalog/sound-panel';
import { Icon } from '../dashboard/icons';
import { SaveDock } from '../dashboard/save-dock';
import { BoardKeys } from './board-keys';

interface OwnerBoardProps {
  detail: SoundboardDetail;
  owner: SoundUser;
  placing: { soundId: string; name: string } | null;
}

const AddSounds = component$<{ detail: SoundboardDetail; sectionId: string }>(({ detail, sectionId }) => {
  const library = useMySounds();
  const add = useAddBoardSound();
  const query = useSignal('');
  const data = library.error ? null : library.value;
  const keyOf = new Map(detail.sounds.map((sound, index) => [sound.id, Soundboards.keyOf(index)]));
  const isFull = Soundboards.storedIds(detail).length >= Soundboards.MAX_SOUNDS;
  const entries = data && !data.failed ? SoundLibrary.filter(SoundLibrary.myEntries(data.library), { text: query.value, owner: 'all', visibility: 'all', sort: 'name' }) : [];

  return (
    <section id={sectionId} class="owner-block" aria-labelledby={`${sectionId}-title`}>
      <div class="chart-block__head">
        <h3 id={`${sectionId}-title`} class="chart-block__title">Add sounds</h3>
        <span class="caption">Your sounds · liked sounds coming soon</span>
      </div>
      <label class="sound-list__search">
        <Icon name="search" />
        <span class="visually-hidden">Search your sounds</span>
        <input type="search" class="input input--sm" placeholder="Search your sounds" autocomplete="off" bind:value={query} />
      </label>
      {add.value?.message && <p class="callout callout--danger" role="alert">{add.value.message}</p>}
      {data?.failed && <p class="callout callout--danger" role="alert">{data.message}</p>}
      <ul class="pop__list owner-add">
        {entries.map(({ sound }) => {
          const key = keyOf.get(sound.id);
          return (
            <li key={sound.id} class="owner-add__row">
              <span class="option__title">{sound.name}</span>
              <span class="caption">{formatLength(sound.durationMs)}</span>
              {key ? (
                <span class="caption">On {key}</span>
              ) : (
                <button type="button" class="button button--secondary button--sm" disabled={isFull || add.isRunning} onClick$={() => add.submit({ soundId: sound.id })}>
                  {isFull ? 'Full' : 'Add'}
                </button>
              )}
            </li>
          );
        })}
        {data && !data.failed && !entries.length && <li class="caption">{query.value ? 'No sounds match.' : "You haven't uploaded any sound yet."}</li>}
      </ul>
    </section>
  );
});

export const OwnerBoard = component$<OwnerBoardProps>(({ detail, owner, placing }) => {
  const navigate = useNavigate();
  const update = useUpdateBoard();
  const arrange = useArrangeBoard();
  const add = useAddBoardSound();
  const remove = useRemoveBoardSound();
  const destroy = useDeleteBoard();
  const dialog = useSignal<HTMLDialogElement>();
  const { board, sounds } = detail;
  const name = useSignal(board.name);
  const isPublic = useSignal(board.public);
  const formId = `board-edit-${board.id}`;
  const addId = `board-add-${board.id}`;
  const inForm = { form: formId };
  const dirty = useComputed$(() => name.value !== board.name || isPublic.value !== board.public);
  const busy = arrange.isRunning || add.isRunning || remove.isRunning;
  const message = arrange.value?.message ?? remove.value?.message ?? (placing ? add.value?.message : null) ?? null;

  const reset = $(() => {
    name.value = board.name;
    isPublic.value = board.public;
  });

  const submitOrder = $((ids: string[]) => arrange.submit({ soundIds: ids }));

  const swap = $(async (from: number, to: number) => {
    const ids = Soundboards.storedIds(detail);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    await submitOrder(ids);
  });

  const moveToEnd = $(async (from: number) => {
    const visible = sounds.map((sound) => sound.id);
    const [moved] = visible.splice(from, 1);
    await submitOrder([...visible, moved, ...detail.hiddenIds]);
  });

  const removeAt = $(async (index: number) => {
    const sound = sounds[index];
    sound && (await remove.submit({ soundId: sound.id }));
  });

  const place = $(async () => {
    if ( !placing || add.isRunning ) { return; }
    const { value } = await add.submit({ soundId: placing.soundId });
    value.ok && (await navigate(Soundboards.myPath(board.id), { scroll: false }));
  });

  const panel = useSignal<HTMLElement>();

  useVisibleTask$(() => revealPanel(panel.value), { strategy: 'document-ready' });

  const showAdd = $(() => document.getElementById(addId)?.scrollIntoView({ block: 'start' }));

  return (
    <article ref={panel} class="catalog-panel__body board-panel" aria-label={board.name}>
      <div class="sound-card__main">
        <BoardHead detail={{ ...detail, board: { ...board, public: isPublic.value } }} owner={owner} isMine editing>
          <div q:slot="title" class="owner-title">
            <label class="visually-hidden" for={`${formId}-name`}>Name</label>
            <input id={`${formId}-name`} class="input owner-title__input" name="name" {...inForm} maxLength={Soundboards.NAME_MAX} required autocomplete="off" bind:value={name} />
          </div>
        </BoardHead>
        {update.value && !update.value.ok && <p class="callout callout--danger" role="alert">{update.value.message}</p>}
        {placing && (
          <div class="callout callout--info placing" role="status">
            <Icon name="info" />
            <p>Placing <strong>{placing.name}</strong>. Click an empty key or press its letter.</p>
            <a href={Soundboards.myPath(board.id)} class="button button--ghost button--sm">Cancel</a>
          </div>
        )}
        {message && <p class="callout callout--danger" role="alert">{message}</p>}
        <BoardKeys
          key={board.id}
          boardName={board.name}
          sounds={sounds}
          editable
          placing={placing?.name ?? null}
          busy={busy}
          onSwap$={swap}
          onMoveToEnd$={moveToEnd}
          onRemove$={removeAt}
          onAdd$={showAdd}
          onPlace$={place}
        />
        <AddSounds detail={detail} sectionId={addId} />
        <section class="owner-block">
          <span class="label" id={`${formId}-visibility`}>Visibility</span>
          <div class="segmented" role="radiogroup" aria-labelledby={`${formId}-visibility`}>
            <label class="segmented__item">
              <input type="radio" class="segmented__input" name="public" value="true" {...inForm} checked={isPublic.value} onChange$={() => (isPublic.value = true)} />
              Public
            </label>
            <label class="segmented__item">
              <input type="radio" class="segmented__input" name="public" value="false" {...inForm} checked={!isPublic.value} onChange$={() => (isPublic.value = false)} />
              Private
            </label>
          </div>
          <p class="hint">{isPublic.value ? 'Anyone can find it in Explore and play it from its page.' : 'Only you can see it. No link, not in search.'}</p>
        </section>
        <div class="sound-card__row">
          <span class="catalog-soon">
            <button type="button" class="button button--secondary" disabled title="Coming soon"><Icon name="message" />Post to a channel</button>
            <span class="badge">Coming soon</span>
          </span>
          <CopyCommand command={Soundboards.command(board.id)} />
          {board.public && <a href={boardPath(board.id)} class="button button--secondary"><Icon name="link" />Public page</a>}
        </div>
        <dl class="catalog-facts">
          <div><dt>Plays</dt><dd>{formatCount(board.plays)}</dd></div>
          <div><dt>Likes</dt><dd>{formatCount(board.likes)}</dd></div>
          <div><dt>Comments</dt><dd>{formatCount(board.commentCount)}</dd></div>
          <div><dt>Saved copies</dt><dd title="Coming soon">—</dd></div>
        </dl>
        <section class="owner-block owner-block--row">
          <button type="button" class="button button--danger button--sm" onClick$={() => dialog.value?.showModal()}>
            <Icon name="trash" />Delete soundboard
          </button>
        </section>
        <Form id={formId} action={update} class="owner-form">
          <SaveDock dirty={dirty} action={update} onReset$={reset} />
        </Form>
        <dialog ref={dialog} class="card card--raised confirm" aria-labelledby={`${formId}-delete`}>
          <Form action={destroy} class="confirm__body">
            <h2 id={`${formId}-delete`} class="chart-block__title">Delete “{board.name}”?</h2>
            <p class="text-muted">The board is removed for everyone. Its sounds stay where they are. This can't be undone.</p>
            {destroy.value?.message && <p class="callout callout--danger" role="alert">{destroy.value.message}</p>}
            <div class="confirm__actions">
              <button type="button" class="button button--ghost button--sm" disabled={destroy.isRunning} onClick$={() => dialog.value?.close()}>Cancel</button>
              <button type="submit" class="button button--danger button--sm" disabled={destroy.isRunning}>{destroy.isRunning ? 'Deleting…' : 'Delete'}</button>
            </div>
          </Form>
        </dialog>
      </div>
      {board.public && <LazyComments kind="soundboard" id={board.id} count={board.commentCount} owned loginHref="/auth/login/" />}
    </article>
  );
});
