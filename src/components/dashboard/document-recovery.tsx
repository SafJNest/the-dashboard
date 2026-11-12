import { component$, useTask$ } from '@qwik.dev/core';
import { isBrowser } from '@qwik.dev/core/build';
import { useLocation } from '@qwik.dev/router';

export const DocumentRecovery = component$(() => {
  const location = useLocation();
  useTask$(() => {
    if (isBrowser) window.location.assign(location.url.href);
  });
  return (
    <div class="container dashboard__recovery" role="status">
      <p class="text-muted">Reloading this page…</p>
    </div>
  );
});
