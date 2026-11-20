import { $, component$, Pending, useComputed$, useContext, useSignal, useVisibleTask$ } from '@qwik.dev/core';
import { Form, useLocation, useNavigate } from '@qwik.dev/router';
import { useCreateSoundboard } from '../../routes/dashboard/[guildId]/soundboards/layout';
import { Soundboards } from '../../lib/soundboards';
import { Icon } from '../dashboard/icons';
import { SaveDock } from '../dashboard/save-dock';
import { BoardLibrary, LibrarySkeleton } from './board-library';
import { closeDraft, SoundboardDraftContext } from './draft';

export const BoardCreate = component$(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const draft = useContext(SoundboardDraftContext);
  const create = useCreateSoundboard();
  const nameInput = useSignal<HTMLInputElement>();
  const dirty = useComputed$(() => draft.name.trim() !== '' || draft.soundIds.length > 0);
  const close = $(() => closeDraft(draft));

  useVisibleTask$(() => {
    nameInput.value?.focus();
  });

  return (
    <Form
      action={create}
      class="settings-form"
      onSubmitCompleted$={async (event) => {
        const boardId = event.detail.value?.boardId;
        if ( !boardId ) { return; }
        closeDraft(draft);
        await navigate(Soundboards.path(location.params.guildId, boardId));
      }}
    >
      <section class="card settings-card" aria-labelledby="board-create-title">
        <h2 id="board-create-title" class="chart-block__title">New soundboard</h2>
        {create.value?.message && (
          <div class="callout callout--danger" role="alert">
            <Icon name="warning" />
            <p>{create.value.message}</p>
          </div>
        )}
        <div class="field">
          <label class="label" for="board-create-name">Name</label>
          <input
            ref={nameInput}
            id="board-create-name"
            class="input"
            name="name"
            value={draft.name}
            maxLength={Soundboards.NAME_MAX}
            required
            autocomplete="off"
            onInput$={(_, input) => (draft.name = input.value)}
          />
          <p class="hint">Members choose the board by this name with /soundboard play.</p>
        </div>
        {draft.soundIds.map((soundId) => (
          <input key={soundId} type="hidden" name="soundIds[]" value={soundId} />
        ))}
      </section>
      <section class="card card--flush board-library" aria-labelledby="board-create-sounds">
        <div class="board-library__head">
          <h2 id="board-create-sounds" class="chart-block__title">Sounds</h2>
          <span class="caption">{draft.soundIds.length} / {Soundboards.MAX_SOUNDS} selected</span>
        </div>
        <Pending fallback$={() => <LibrarySkeleton />}>
          <BoardLibrary mode="select" />
        </Pending>
      </section>
      <SaveDock dirty={dirty} action={create} label="Create soundboard" onReset$={close} />
      {!dirty.value && (
        <button type="button" class="button button--ghost button--sm board-create__cancel" onClick$={close}>
          Cancel
        </button>
      )}
    </Form>
  );
});
