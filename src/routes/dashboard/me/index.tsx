import { $, component$, Pending, useContext } from '@qwik.dev/core';
import { Link, type DocumentHead } from '@qwik.dev/router';
import { RowsSkeleton } from '../../../components/catalog/catalog-states';
import { SoundRow } from '../../../components/catalog/sound-items';
import { GuildAvatar } from '../../../components/dashboard/guild-avatar';
import { Icon } from '../../../components/dashboard/icons';
import { LoadError } from '../../../components/sounds/library-states';
import { SoundPlayer, SoundPlayerContext } from '../../../components/sounds/sound-player';
import { toSoundCard, type SoundCard } from '../../../lib/catalog';
import { SoundLibrary } from '../../../lib/sound-library';
import { useMySounds } from '../../../lib/sound-loaders';
import { GLOBAL_GREET } from '../../../lib/sounds';
import { useAccount } from '../layout';

export { useMySounds };

const RECENT_COUNT = 5;

const RecentSounds = component$(() => {
  const loader = useMySounds();
  const player = useContext(SoundPlayerContext);
  const play = $((sound: SoundCard) => player.toggle$(sound.id, sound.audioUrl));
  if ( loader.error ) { return <LoadError message={SoundLibrary.LOAD_ERROR} retrying={loader.pending} onRetry$={$(() => loader.invalidate())} />; }
  const data = loader.value;
  if ( data.failed ) { return <LoadError message={data.message} retrying={loader.pending} onRetry$={$(() => loader.invalidate())} />; }
  const entries = SoundLibrary.filter(SoundLibrary.myEntries(data.library), { text: '', owner: 'all', visibility: 'all', sort: 'newest' }).slice(0, RECENT_COUNT);
  if ( !entries.length ) { return <p class="text-muted">You haven't uploaded any sound yet.</p>; }
  return (
    <div class="catalog-list">
      {entries.map(({ sound, guildName }) => (
        <SoundRow key={sound.id} sound={toSoundCard(sound)} href={SoundLibrary.myPath(sound.id)} detail={guildName} current={false} showUploader={false} onPlay$={play} />
      ))}
    </div>
  );
});

export default component$(() => {
  const account = useAccount();
  const { greets, guilds } = account.value;
  const globalGreet = greets[GLOBAL_GREET];
  const serverGreets = guilds.filter((guild) => greets[guild.id]);

  return (
    <main class="container profile">
      <header class="settings-head__text">
        <p class="overline">Profile</p>
        <h1 class="settings-head__title">Overview</h1>
      </header>
      <div class="profile__grid">
        <section class="card settings-card" aria-labelledby="profile-greets">
          <h2 id="profile-greets" class="chart-block__title">Greet</h2>
          <p class="hint">Beebot plays your greet when you join a voice channel. A server greet wins over the global one. Change it from any sound.</p>
          <ul class="profile__greets">
            <li>
              <span class="option__title">Everywhere</span>
              {globalGreet ? <Link href={SoundLibrary.myPath(globalGreet.id)} class="caption">{globalGreet.name}</Link> : <span class="caption">Not set</span>}
            </li>
            {serverGreets.map((guild) => (
              <li key={guild.id}>
                <GuildAvatar name={guild.name} iconUrl={guild.iconUrl} size="sm" />
                <span class="option__title">{guild.name}</span>
                <span class="caption">{greets[guild.id].name}</span>
              </li>
            ))}
          </ul>
        </section>
        <section class="card settings-card" aria-labelledby="profile-accounts">
          <h2 id="profile-accounts" class="chart-block__title">Linked accounts</h2>
          <p class="hint">Signed in with Discord.</p>
          <span class="catalog-soon">
            <button type="button" class="button button--secondary button--sm" disabled title="Coming soon">Link an account</button>
            <span class="badge">Coming soon</span>
          </span>
        </section>
      </div>
      <section class="card settings-card" aria-labelledby="profile-recent">
        <div class="chart-block__head">
          <h2 id="profile-recent" class="chart-block__title">Recent sounds</h2>
          <Link href={SoundLibrary.UPLOAD_PATH} class="button button--secondary button--sm"><Icon name="plus" />Upload</Link>
        </div>
        <SoundPlayer>
          <Pending fallback$={() => <div class="catalog-list"><RowsSkeleton label="Loading your sounds" /></div>}>
            <RecentSounds />
          </Pending>
        </SoundPlayer>
      </section>
    </main>
  );
});

export const head: DocumentHead = {
  title: 'Your profile · Beebot',
};
