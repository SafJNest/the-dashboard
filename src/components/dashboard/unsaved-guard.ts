import type { Signal } from '@qwik.dev/core';
import { useLocation, usePreventNavigate$ } from '@qwik.dev/router';

export const NAVIGATION_CANCELLED = 'dashboard:navigation-cancelled';

export function useUnsavedChangesGuard(dirty: Signal<boolean>, action: { readonly isRunning: boolean }) {
  const location = useLocation();
  usePreventNavigate$((url) => {
    const saving = action.isRunning;
    if (!dirty.value && !saving) return false;
    if (!url) return true;
    if (url instanceof URL && (url.pathname.startsWith('/auth/') || url.pathname + url.search === location.url.pathname + location.url.search)) return false;
    const leave = window.confirm(
      saving
        ? 'Your changes are still being saved and may be applied after you leave. Leave this page anyway?'
        : 'You have unsaved changes. Leave this page and discard them?',
    );
    if (!leave) window.dispatchEvent(new Event(NAVIGATION_CANCELLED));
    return !leave;
  });
}
