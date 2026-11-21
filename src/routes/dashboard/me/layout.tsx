import { component$, Slot, useStyles$ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { UserAvatar } from '../../../components/dashboard/account-menu';
import { Icon } from '../../../components/dashboard/icons';
import { Soundboards } from '../../../lib/soundboards';
import { SoundLibrary } from '../../../lib/sound-library';
import { useAccount } from '../layout';
import catalogStyles from '../../../components/catalog/catalog.css?inline';

const OVERVIEW_PATH = '/dashboard/me/';

export default component$(() => {
  useStyles$(catalogStyles);
  const account = useAccount();
  const location = useLocation();
  const { pathname } = location.url;
  const { user } = account.value;
  const inSounds = pathname.startsWith(SoundLibrary.MY_PATH);
  const inBoards = pathname.startsWith(Soundboards.myPath());

  return (
    <>
      <div class="guild-bar profile-bar">
        <div class="profile-bar__who">
          <UserAvatar user={user} size={28} />
          <span>{user.name}</span>
          <span class="caption">Your sounds, boards and settings</span>
        </div>
        <nav class="ctxtabs" aria-label="Your profile">
          <Link href={OVERVIEW_PATH} class="ctxtab" aria-current={pathname === OVERVIEW_PATH ? 'page' : undefined}>
            <Icon name="greet" />
            <span>Overview</span>
          </Link>
          <Link href={SoundLibrary.MY_PATH} class="ctxtab" aria-current={inSounds ? 'page' : undefined}>
            <Icon name="sounds" />
            <span>My sounds</span>
          </Link>
          <Link href={Soundboards.myPath()} class="ctxtab" aria-current={inBoards ? 'page' : undefined}>
            <Icon name="soundboards" />
            <span>My soundboards</span>
          </Link>
          <span class="ctxtab" aria-disabled="true">
            <Icon name="playlists" />
            <span>Playlists</span>
            <span class="badge">Soon</span>
          </span>
        </nav>
      </div>
      <Slot />
    </>
  );
});
