import { component$, Slot, useStyles$ } from '@qwik.dev/core';
import { Bee } from '../bee/bee';
import { Icon, type IconName } from '../dashboard/icons';
import styles from './empty-state.css?inline';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  tone?: 'default' | 'danger';
  flight?: 'orbit' | 'patrol';
  role?: 'alert' | 'status';
  class?: string;
}

export const EmptyState = component$<EmptyStateProps>(({ icon, title, tone = 'default', flight = 'orbit', role, class: className }) => {
  useStyles$(styles);
  return (
    <div class={['empty-state', `empty-state--${tone}`, className]} role={role}>
      <div class={['empty-state__stage', `empty-state__stage--${flight}`, 'bee-host']} aria-hidden="true">
        {flight === 'orbit' && (
          <svg class="empty-state__trail" viewBox="0 0 180 110">
            <ellipse cx="90" cy="55" rx="72" ry="26" />
          </svg>
        )}
        <span class="empty-state__tile">
          <Icon name={icon} />
        </span>
        {flight === 'orbit' ? <Bee flight="stage" size={34} dizzy={tone === 'danger'} /> : <Bee patrol size={38} dizzy={tone === 'danger'} />}
      </div>
      <p class="empty-state__title">{title}</p>
      <div class="empty-state__text">
        <Slot />
      </div>
      <div class="empty-state__actions">
        <Slot name="actions" />
      </div>
    </div>
  );
});
