import { component$ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { HexMark } from '../hex-mark/hex-mark';
import { Icon } from './icons';
import type { DashboardUser } from './servers';

interface AppHeaderProps {
  user: DashboardUser;
}

export const AppHeader = component$<AppHeaderProps>(({ user }) => {
  const location = useLocation();
  const onMine = location.url.pathname.startsWith('/dashboard/me/');

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
          <form method="post" action="/auth/logout/">
            <button type="submit" class="button button--ghost button--sm">Log out</button>
          </form>
        </div>
      </div>
      <div class={['nav-progress', location.isNavigating && 'nav-progress--active']} aria-hidden="true" />
    </header>
  );
});
