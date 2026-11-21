import { component$ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { HexMark } from '../hex-mark/hex-mark';
import { AccountMenu } from './account-menu';
import { Icon } from './icons';
import { QuickSearch } from './quick-search';
import type { DashboardUser } from './servers';

interface AppHeaderProps {
  user: DashboardUser;
  greetName: string | null;
  navigating: boolean;
}

export const AppHeader = component$<AppHeaderProps>(({ user, greetName, navigating }) => {
  const location = useLocation();
  const onProfile = location.url.pathname.startsWith('/dashboard/me/');

  return (
    <header class="appbar">
      <div class="appbar__row">
        <a href="/" class="brand" aria-label="Beebot home">
          <HexMark />
          <span>Beebot</span>
        </a>
        <nav class="appbar__nav" aria-label="Main">
          <Link href="/dashboard/" class="appbar__link" aria-current={onProfile ? undefined : 'page'}>
            <Icon name="servers" />
            <span>Servers</span>
          </Link>
          <Link href="/dashboard/me/" class="appbar__link" aria-current={onProfile ? 'page' : undefined}>
            <Icon name="greet" />
            <span>Your profile</span>
          </Link>
        </nav>
        <span class="appbar__spacer" />
        <QuickSearch />
        <AccountMenu user={user} greetName={greetName} withLinks={false} />
      </div>
      <div class={['nav-progress', navigating && 'nav-progress--active']} aria-hidden="true" />
    </header>
  );
});
