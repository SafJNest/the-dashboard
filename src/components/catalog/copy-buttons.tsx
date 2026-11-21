import { component$, useSignal } from '@qwik.dev/core';
import { Icon } from '../dashboard/icons';

const COPY_FAILED = 'Copy failed';

export const CopyCommand = component$<{ command: string }>(({ command }) => {
  const copied = useSignal<boolean | null>(null);
  return (
    <button type="button" class="catalog-command" data-copied={copied.value || undefined} aria-label={`Copy command ${command}`} title={copied.value === false ? COPY_FAILED : undefined} onClick$={async () => {
      copied.value = await navigator.clipboard.writeText(command).then(() => true, () => false);
    }}>
      {command}
      <span class="catalog-command__icon"><Icon name={copied.value ? 'check' : 'copy'} /></span>
    </button>
  );
});

export const CopyLink = component$<{ path: string }>(({ path }) => {
  const copied = useSignal<boolean | null>(null);
  const title = copied.value === null ? 'Copy link' : copied.value ? 'Link copied' : COPY_FAILED;
  return (
    <button type="button" class="button button--secondary" aria-label="Copy link" title={title} onClick$={async () => {
      copied.value = await navigator.clipboard.writeText(new URL(path, window.location.origin).href).then(() => true, () => false);
    }}>
      <Icon name={copied.value ? 'check' : 'link'} />
    </button>
  );
});
