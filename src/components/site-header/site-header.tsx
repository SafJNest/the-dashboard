import { component$, useStyles$ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { publicSoundsUrl, SOUNDS_PATH } from '../../lib/sounds-site';
import { HexMark } from '../hex-mark/hex-mark';
import styles from './site-header.css?inline';

interface SiteHeaderProps {
  inviteUrl: string | null;
  origin?: string;
  soundsHref?: string;
  account?: { name: string; avatarUrl: string | null } | null;
  signedIn?: boolean;
}

export const SiteHeader = component$<SiteHeaderProps>(({ inviteUrl, origin = '', soundsHref, account = null, signedIn = false }) => {
  useStyles$(styles);
  const location = useLocation();
  const onSounds = soundsHref !== undefined;
  const navItems = [
    { href: soundsHref ?? publicSoundsUrl('/'), label: 'Sounds', current: onSounds || location.url.pathname.startsWith(SOUNDS_PATH) },
    { href: `${origin}/commands/`, label: 'Commands', current: location.url.pathname.startsWith('/commands/') },
  ];

  return (
    <header class="site-header">
      {origin ? (
        <a href={`${origin}/`} class="brand">
          <HexMark />
          Beebot
        </a>
      ) : (
        <Link href="/" class="brand">
          <HexMark />
          Beebot
        </Link>
      )}
      <div class="site-header__end">
        <nav class="site-header__nav" aria-label="Main">
          {navItems.map((item) => {
            const sameSite = item.href.startsWith('/');
            const current = item.current ? 'page' : undefined;
            return sameSite ? (
              <Link key={item.label} href={item.href} class="site-header__link" aria-current={current}>{item.label}</Link>
            ) : (
              <a key={item.label} href={item.href} class="site-header__link" aria-current={current}>{item.label}</a>
            );
          })}
        </nav>
        <span class="site-header__separator" aria-hidden="true" />
        {account ? (
          <>
            <a href={`${origin}/dashboard/`} class="button button--secondary">Dashboard</a>
            <a href={`${origin}/dashboard/me/`} class="site-header__account">
              {account.avatarUrl ? <img class="avatar" src={account.avatarUrl} alt="" width={30} height={30} /> : <span class="avatar avatar--violet" aria-hidden="true">{account.name.slice(0, 1).toUpperCase()}</span>}
              <span>{account.name}</span>
            </a>
          </>
        ) : signedIn ? (
          <a href={`${origin}/dashboard/`} class="button button--secondary">Dashboard</a>
        ) : (
          <>
            <a href={`${origin}/dashboard/`} class="button button--ghost">
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
