import { $, component$, useSignal, useStore } from '@qwik.dev/core';
import { Soundboards, type Soundboard } from '../../lib/soundboards';
import { Icon } from '../dashboard/icons';
import { createBoard, listMyBoards } from './catalog-server';
import { LoginGate } from './login-gate';

interface AddToBoardProps {
  soundId: string;
  soundName: string;
  signedIn: boolean;
  loginHref: string;
}

const LOAD_FAILED = 'Your soundboards could not be loaded. Please try again.';

export const AddToBoard = component$<AddToBoardProps>(({ soundId, soundName, signedIn, loginHref }) => {
  const list = useStore({ boards: null as Soundboard[] | null, loading: false, error: null as string | null });
  const name = useSignal('');
  const creating = useSignal(false);
  const gate = useSignal(false);
  const popoverId = `add-to-board-${soundId}`;
  const anchor = `--add-to-board-${soundId}`;

  const load = $(async () => {
    if ( list.loading ) { return; }
    list.loading = true;
    list.error = null;
    const result = await listMyBoards().catch(() => null);
    list.loading = false;
    if ( !result ) { list.error = LOAD_FAILED; return; }
    if ( !result.ok ) { list.error = result.message; return; }
    list.boards = result.data;
  });

  const create = $(async () => {
    const boardName = Soundboards.readName(name.value);
    if ( !boardName ) { list.error = Soundboards.INVALID_NAME; return; }
    if ( creating.value ) { return; }
    creating.value = true;
    const result = await createBoard(boardName, [soundId]).catch(() => null);
    creating.value = false;
    if ( !result?.ok ) { list.error = result?.message ?? LOAD_FAILED; return; }
    window.location.assign(Soundboards.myPath(result.data.board.id));
  });

  if (!signedIn) {
    return (
      <span class="catalog-anchor">
        <button type="button" class="button button--secondary" onClick$={() => (gate.value = true)}>
          <Icon name="soundboards" />Add to soundboard
        </button>
        {gate.value && <LoginGate title="Log in to make soundboards" text="Put sounds on keys and play them from Discord." loginHref={loginHref} onClose$={() => (gate.value = false)} />}
      </span>
    );
  }

  return (
    <>
      <button type="button" class="button button--secondary" popovertarget={popoverId} style={{ 'anchor-name': anchor }}>
        <Icon name="soundboards" />Add to soundboard
      </button>
      <div
        id={popoverId}
        popover="auto"
        class="pop add-board"
        style={{ 'position-anchor': anchor }}
        aria-label={`Add ${soundName} to a soundboard`}
        onToggle$={(event) => (event as ToggleEvent).newState === 'open' && load()}
      >
        <p class="pop__title">Pick a board <span class="caption">· you choose the key there</span></p>
        {list.loading && !list.boards && <p class="caption" role="status">Loading your soundboards…</p>}
        {list.boards && list.boards.length === 0 && <p class="caption">You have no soundboards yet.</p>}
        {list.boards && list.boards.length > 0 && (
          <ul class="pop__list">
            {list.boards.map((board) => {
              const count = board.soundCount ?? 0;
              const isFull = count >= Soundboards.MAX_SOUNDS;
              return (
                <li key={board.id}>
                  {isFull ? (
                    <span class="option" aria-disabled="true">
                      <span class="option__title">{board.name}</span>
                      <span class="caption">Full · free a key first</span>
                    </span>
                  ) : (
                    <a href={Soundboards.placePath(board.id, soundId)} class="option">
                      <span class="option__title">{board.name}</span>
                      <span class="caption">{board.soundCount === null ? '' : `${count}/${Soundboards.MAX_SOUNDS}`}</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <form class="add-board__new" preventdefault:submit onSubmit$={create}>
          <label class="visually-hidden" for={`${popoverId}-name`}>New soundboard name</label>
          <input id={`${popoverId}-name`} class="input input--sm" placeholder="New soundboard" maxLength={Soundboards.NAME_MAX} bind:value={name} autocomplete="off" />
          <button type="submit" class="button button--secondary button--sm" disabled={creating.value || !name.value.trim()} aria-busy={creating.value}>
            <Icon name="plus" />Create
          </button>
        </form>
        {list.error && <p class="callout callout--danger" role="alert">{list.error}</p>}
      </div>
    </>
  );
});
