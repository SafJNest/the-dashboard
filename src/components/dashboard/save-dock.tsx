import { component$, type QRL, type Signal } from '@qwik.dev/core';
import { useUnsavedChangesGuard } from './unsaved-guard';

interface SaveDockProps {
  dirty: Signal<boolean>;
  action: { readonly isRunning: boolean };
  onReset$: QRL<() => void>;
}

export const SaveDock = component$<SaveDockProps>(({ dirty, action, onReset$ }) => {
  useUnsavedChangesGuard(dirty, action);
  return (
    <div class="settings-dock" hidden={!dirty.value}>
      <div class="savebar" role="region" aria-label="Unsaved changes">
        <span>You have unsaved changes</span>
        <div class="savebar__actions">
          <button type="button" class="button button--ghost button--sm" disabled={action.isRunning} onClick$={onReset$}>
            Reset
          </button>
          <button type="submit" class="button button--primary button--sm" disabled={action.isRunning}>
            {action.isRunning ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
});
