import { $, component$, useOnWindow, useSignal } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { HexMark } from '../hex-mark/hex-mark';
import { Icon } from './icons';
import type { DashboardUser } from './servers';

interface AppHeaderProps {
  user: DashboardUser;
  navigating: boolean;
}

export const AppHeader = component$<AppHeaderProps>(({ user, navigating }) => {
  const location = useLocation();
  const leaving = useSignal(false);
  const onMine = location.url.pathname.startsWith('/dashboard/me/');

  useOnWindow('pageshow', $(() => {
    leaving.value = false;
  }));

  return (
    <header class="appbar">
      <div class="appbar__row">
        <a href="/" class="brand" aria-label="Beebot home">
          <HexMark />
          <span>Beebot</span>
        </a>
        <nav class="appbar__nav" aria-label="Main">
          <Link href="/dashboard/" class="appbar__link" aria-current={onMine ? undefined : 'page'}>
            <Icon name="servers" />
            <span>Servers</span>
          </Link>
          <Link href="/dashboard/me/sounds/" class="appbar__link" aria-current={onMine ? 'page' : undefined}>
            <Icon name="sounds" />
            <span>Sounds</span>
          </Link>
          <span class="appbar__link" aria-disabled="true">
            <Icon name="playlists" />
            <span>Playlists</span>
          </span>
        </nav>
        <span class="appbar__spacer" />
        <div class="appbar__account">
          <span class="appbar__user">
            {user.avatarUrl ? (
              <img class="avatar dashboard__avatar" src={user.avatarUrl} alt="" width="30" height="30" />
            ) : (
              <span class="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
            )}
            <span>{user.name}</span>
          </span>
          <form
            method="post"
            action="/auth/logout/"
            preventdefault:submit={leaving.value}
            onSubmit$={() => {
              leaving.value = true;
            }}
          >
            <button type="submit" class="button button--ghost button--sm" disabled={leaving.value} aria-busy={leaving.value}>
              {leaving.value ? 'Logging out…' : 'Log out'}
            </button>
          </form>
        </div>
      </div>
      <div class={['nav-progress', navigating && 'nav-progress--active']} aria-hidden="true" />
    </header>
  );
});
