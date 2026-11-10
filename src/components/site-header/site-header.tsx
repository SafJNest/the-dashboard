import { component$, useStyles$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { HexMark } from '../hex-mark/hex-mark';
import styles from './site-header.css?inline';

interface SiteHeaderProps {
  inviteUrl: string | null;
}

const navItems = [
  { href: '/#features', label: 'Features' },
  { href: '/commands/', label: 'Commands' },
  { href: '/leaderboard/', label: 'Leaderboards' },
  { href: '/sounds/', label: 'Sounds' },
  { href: '/status/', label: 'Status' },
];

export const SiteHeader = component$<SiteHeaderProps>(({ inviteUrl }) => {
  useStyles$(styles);

  return (
    <header class="site-header">
      <Link href="/" class="brand">
        <HexMark />
        Beebot
      </Link>
      <nav class="site-header__nav" aria-label="Main">
        {navItems.map((item) => (
          <a key={item.href} href={item.href} class="nav-link">
            {item.label}
          </a>
        ))}
      </nav>
      <div class="site-header__actions">
        <Link href="/dashboard/" class="button button--ghost">
          Log in
        </Link>
        {inviteUrl ? (
          <a href={inviteUrl} class="button button--primary">
            Add to Discord
          </a>
        ) : (
          <button type="button" class="button button--primary" disabled>
            Add to Discord
          </button>
        )}
      </div>
    </header>
  );
});
