import { component$, useStyles$ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { SOUNDS_PATH } from '../../lib/catalog';
import { AccountMenu } from '../dashboard/account-menu';
import type { DashboardGuild } from '../dashboard/servers';
import { HexMark } from '../hex-mark/hex-mark';
import styles from './site-header.css?inline';

interface SiteHeaderProps {
  inviteUrl: string | null;
  account?: { name: string; avatarUrl: string | null; guilds: DashboardGuild[] } | null;
  signedIn?: boolean;
}

const navItems = [
  { href: `${SOUNDS_PATH}/`, label: 'Sounds' },
  { href: '/commands/', label: 'Commands' },
];

export const SiteHeader = component$<SiteHeaderProps>(({ inviteUrl, account = null, signedIn = false }) => {
  useStyles$(styles);
  const location = useLocation();

  return (
    <header class="site-header">
      <Link href="/" class="brand">
        <HexMark />
        Beebot
      </Link>
      <div class="site-header__end">
        <nav class="site-header__nav" aria-label="Main">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} class="site-header__link" aria-current={location.url.pathname.startsWith(item.href) ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <span class="site-header__separator" aria-hidden="true" />
        {account ? (
          <AccountMenu user={account} guilds={account.guilds} />
        ) : signedIn ? (
          <a href="/dashboard/" class="button button--secondary">Dashboard</a>
        ) : (
          <>
            <a href="/dashboard/" class="button button--ghost">
              Log in
            </a>
            {inviteUrl ? (
              <a href={inviteUrl} class="button button--primary">
                Add to Discord
              </a>
            ) : (
              <button type="button" class="button button--primary" disabled>
                Add to Discord
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
});
