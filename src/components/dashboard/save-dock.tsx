import { component$, useStyles$, type QRL, type Signal } from '@qwik.dev/core';
import { Bee } from '../bee/bee';
import { useUnsavedChangesGuard } from './unsaved-guard';
import styles from './save-dock.css?inline';

interface SaveDockProps {
  dirty: Signal<boolean>;
  action: { readonly isRunning: boolean };
  onReset$: QRL<() => void>;
}

export const SaveDock = component$<SaveDockProps>(({ dirty, action, onReset$ }) => {
  useStyles$(styles);
  useUnsavedChangesGuard(dirty, action);
  return (
    <div class="save-dock" hidden={!dirty.value}>
      <div class="save-dock__bar" role="region" aria-label="Unsaved changes">
        <p class="save-dock__status">
          <span class="save-dock__dot" aria-hidden="true" />
          {action.isRunning ? 'Saving…' : 'Unsaved changes'}
        </p>
        <div class="save-dock__actions">
          <button type="button" class="button button--secondary button--sm" disabled={action.isRunning} onClick$={onReset$}>
            Discard
          </button>
          <span class="save-dock__save bee-host">
            <Bee flight="save" size={26} enter />
            <button type="submit" class="button button--primary button--sm save-dock__submit bee-host__target" disabled={action.isRunning} aria-busy={action.isRunning}>
              {action.isRunning ? 'Saving…' : 'Save changes'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
});
