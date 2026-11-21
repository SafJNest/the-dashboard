import { component$, useSignal, useStyles$ } from '@qwik.dev/core';
import { Icon } from './icons';
import styles from './header-menus.css?inline';

interface AccountMenuProps {
  user: { name: string; avatarUrl: string | null };
  greetName: string | null;
  withLinks: boolean;
}

const PROFILE_LINKS = [
  { href: '/dashboard/', label: 'Dashboard' },
  { href: '/dashboard/me/', label: 'Your profile' },
  { href: '/dashboard/me/sounds/', label: 'My sounds' },
  { href: '/dashboard/me/soundboards/', label: 'My soundboards' },
];

export function UserAvatar({ user, size }: { user: AccountMenuProps['user']; size: number }) {
  if ( user.avatarUrl ) { return <img class="avatar" src={user.avatarUrl} alt="" width={size} height={size} />; }
  return <span class="avatar avatar--violet" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>;
}

export const AccountMenu = component$<AccountMenuProps>(({ user, greetName, withLinks }) => {
  useStyles$(styles);
  const leaving = useSignal(false);
  return (
    <>
      <button type="button" class="account-toggle" popovertarget="account-menu" aria-label={`Account menu for ${user.name}`}>
        <UserAvatar user={user} size={30} />
        <span>{user.name}</span>
        <Icon name="chevronDown" />
      </button>
      <div id="account-menu" popover="auto" class="pop account-menu" aria-label="Account">
        <div class="account-menu__who">
          <UserAvatar user={user} size={36} />
          <span>
            <strong>{user.name}</strong>
            <span class="caption">Signed in with Discord</span>
          </span>
        </div>
        <ul class="pop__list">
          {withLinks && PROFILE_LINKS.map((link) => (
            <li key={link.href}><a href={link.href} class="option"><span class="option__title">{link.label}</span></a></li>
          ))}
          {withLinks && <li><span class="option" aria-disabled="true"><span class="option__title">Playlists</span><span class="badge">Soon</span></span></li>}
          <li>
            <a href="/dashboard/me/" class="option">
              <Icon name="greet" />
              <span class="option__title">Greet</span>
              <span class="caption">{greetName ?? 'Not set'}</span>
            </a>
          </li>
          <li>
            <span class="option account-menu__theme">
              <span class="option__title">Theme</span>
              <span class="segmented" role="radiogroup" aria-label="Theme">
                <label class="segmented__item"><input type="radio" name="account-theme" class="visually-hidden" checked />Dark</label>
                <label class="segmented__item" title="Coming soon"><input type="radio" name="account-theme" class="visually-hidden" disabled />Light</label>
              </span>
            </span>
          </li>
          <li><a href="/commands/" class="option"><span class="option__title">Commands and help</span></a></li>
        </ul>
        <form method="post" action="/auth/logout/" preventdefault:submit={leaving.value} onSubmit$={() => (leaving.value = true)}>
          <button type="submit" class="option account-menu__logout" disabled={leaving.value} aria-busy={leaving.value}>
            <Icon name="leave" />
            <span class="option__title">{leaving.value ? 'Logging out…' : 'Log out'}</span>
          </button>
        </form>
      </div>
    </>
  );
});
