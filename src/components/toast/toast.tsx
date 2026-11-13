import { component$, useStyles$ } from '@qwik.dev/core';
import { Bee } from '../bee/bee';
import styles from './toast.css?inline';

interface ToastProps {
  title: string;
  message?: string;
  tone?: 'success' | 'danger';
  class?: string;
}

export const Toast = component$<ToastProps>(({ title, message, tone = 'success', class: className }) => {
  useStyles$(styles);
  return (
    <div class={['toast', `toast--${tone}`, className]} role={tone === 'danger' ? 'alert' : 'status'}>
      <span class="toast__bee bee-host" aria-hidden="true">
        <Bee flight="tile" size={26} enter dizzy={tone === 'danger'} />
      </span>
      <span class="toast__text">
        <span class="toast__title">{title}</span>
        {message && <span class="toast__message">{message}</span>}
      </span>
    </div>
  );
});
