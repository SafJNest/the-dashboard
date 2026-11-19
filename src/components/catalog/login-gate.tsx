import { component$, type QRL } from '@qwik.dev/core';
import { Icon } from '../dashboard/icons';

interface LoginGateProps {
  title: string;
  text: string;
  loginHref: string;
  onClose$: QRL<() => void>;
}

export const LoginGate = component$<LoginGateProps>(({ title, text, loginHref, onClose$ }) => (
  <>
    <button type="button" class="catalog-scrim" aria-label="Close" onClick$={onClose$} />
    <div class="catalog-gate" role="dialog" aria-label={title}>
      <div class="catalog-gate__text">
        <p class="catalog-gate__title">{title}</p>
        <p class="text-muted">{text}</p>
      </div>
      <div class="catalog-gate__actions">
        <a href={loginHref} class="button button--primary button--sm"><Icon name="login" />Log in with Discord</a>
        <button type="button" class="button button--ghost button--sm" onClick$={onClose$}>Not now</button>
      </div>
    </div>
  </>
));
