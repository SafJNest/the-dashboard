import { component$, useServerData, useSignal, useStyles$ } from '@qwik.dev/core';
import { isServer } from '@qwik.dev/core/build';
import { Link, useLocation } from '@qwik.dev/router';
import { Theme, type ThemeName } from '../../lib/theme';
import { GuildAvatar } from './guild-avatar';
import { Icon, type IconName } from './icons';
import type { DashboardGuild } from './servers';
import styles from './account-menu.css?inline';

interface AccountMenuProps {
  user: { name: string; avatarUrl: string | null };
  guilds: DashboardGuild[];
}

const THEMES: { value: ThemeName; label: string; icon: IconName }[] = [
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'light', label: 'Light', icon: 'sun' },
];

export function UserAvatar({ user, size }: { user: AccountMenuProps['user']; size: number }) {
  if ( user.avatarUrl ) { return <img class="avatar" src={user.avatarUrl} alt="" width={size} height={size} />; }
  return <span class="avatar avatar--violet" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>;
}

export const AccountMenu = component$<AccountMenuProps>(({ user, guilds }) => {
  useStyles$(styles);
  const location = useLocation();
  const requestHeaders = useServerData<Record<string, string>>('requestHeaders');
  const menu = useSignal<HTMLElement>();
  const leaving = useSignal(false);
  const theme = isServer ? Theme.fromCookie(requestHeaders?.cookie) : Theme.current();
  const currentGuild = location.params.guildId;

  return (
    <>
      <button type="button" class="account-toggle" popovertarget="account-menu" aria-label={`Account menu for ${user.name}`}>
        <UserAvatar user={user} size={30} />
        <span>{user.name}</span>
        <Icon name="chevronDown" />
      </button>
      <div
        id="account-menu"
        ref={menu}
        popover="auto"
        class="pop account-menu"
        aria-label="Account"
        onClick$={(event) => (event.target as Element).closest('a[href]') && menu.value?.hidePopover()}
      >
        <Link href="/dashboard/me/" class="option account-menu__who">
          <UserAvatar user={user} size={36} />
          <span class="account-menu__name">
            <strong>{user.name}</strong>
            <span class="caption">View profile</span>
          </span>
          <Icon name="chevronRight" />
        </Link>
        <div class="segmented account-menu__theme" role="radiogroup" aria-label="Theme">
          {THEMES.map((option) => (
            <label key={option.value} class="segmented__item">
              <input type="radio" name="theme" value={option.value} class="segmented__input" checked={option.value === theme} onChange$={() => Theme.apply(option.value)} />
              <Icon name={option.icon} />
              {option.label}
            </label>
          ))}
        </div>
        <hr class="account-menu__rule" />
        <section class="account-menu__section" aria-labelledby="account-menu-servers">
          <h2 id="account-menu-servers" class="overline account-menu__label">Servers</h2>
          {guilds.length > 0 && (
            <ul class="pop__list account-menu__guilds">
              {guilds.map((guild) => (
                <li key={guild.id}>
                  <Link href={`/dashboard/${guild.id}/settings/`} class="option" aria-current={guild.id === currentGuild ? 'true' : undefined}>
                    <GuildAvatar name={guild.name} iconUrl={guild.iconUrl} size="sm" />
                    <span class="option__title">{guild.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/dashboard/" class="option">
            <Icon name="servers" />
            <span class="option__title">All servers</span>
          </Link>
        </section>
        <hr class="account-menu__rule" />
        <ul class="pop__list">
          <li>
            <span class="option" aria-disabled="true">
              <Icon name="playlists" />
              <span class="option__title">Playlists</span>
              <span class="badge">Soon</span>
            </span>
          </li>
          <li>
            <Link href="/commands/" class="option">
              <Icon name="help" />
              <span class="option__title">Commands and help</span>
            </Link>
          </li>
        </ul>
        <hr class="account-menu__rule" />
        <form method="post" action="/auth/logout/" class="account-menu__logout" preventdefault:submit={leaving.value} onSubmit$={() => (leaving.value = true)}>
          <button type="submit" class="option" disabled={leaving.value} aria-busy={leaving.value}>
            <Icon name="leave" />
            <span class="option__title">{leaving.value ? 'Logging out…' : 'Log out'}</span>
          </button>
        </form>
      </div>
    </>
  );
});
