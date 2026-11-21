import { $, component$, Pending, Slot, useContext, useStore, useStyles$ } from '@qwik.dev/core';
import { Link, useLocation, type RequestHandler } from '@qwik.dev/router';
import { RowsSkeleton } from '../../../../../components/catalog/catalog-states';
import { neighbours, PanelBar } from '../../../../../components/catalog/panel-bar';
import { SoundPanel } from '../../../../../components/catalog/sound-panel';
import { SoundRow } from '../../../../../components/catalog/sound-items';
import { GreetPicker } from '../../../../../components/sounds/greet-picker';
import { LibraryTools } from '../../../../../components/sounds/library-tools';
import { LoadError, SummarySkeleton } from '../../../../../components/sounds/library-states';
import { SoundPlayer, SoundPlayerContext } from '../../../../../components/sounds/sound-player';
import { apiError, awaitLoader, isDocumentRequest, loaderResolver } from '../../../../../lib/beebot.server';
import { SOUND_NOT_FOUND } from '../../../../../lib/beebot/client.server';
import { toSoundCard, type SoundCard } from '../../../../../lib/catalog';
import { SoundLibrary, type LibraryQuery, type OwnerFilter } from '../../../../../lib/sound-library';
import { useGuildSoundLibrary } from '../../../../../lib/sound-loaders';
import { formatChange, formatCompact, formatCount } from '../../../../../lib/sound-stats';
import { useAccount } from '../../../layout';
import { useGuild } from '../../layout';
import catalogStyles from '../../../../../components/catalog/catalog.css?inline';
import soundStyles from '../../../../../components/sounds/sounds.css?inline';

export { useGuildSoundLibrary };

const OWNERS: OwnerFilter[] = ['all', 'mine', 'others'];

export const onGet: RequestHandler = async (event) => {
  if ( !isDocumentRequest(event) ) { return; }
  if ( event.url.search ) { throw event.redirect(301, event.url.pathname); }
  const resolveValue = loaderResolver(event);
  resolveValue(useAccount).catch(() => undefined);
  resolveValue(useGuild).catch(() => undefined);
  const data = await awaitLoader(event, resolveValue(useGuildSoundLibrary));
  if ( data.failed ) { throw apiError(event, data); }
  const { soundId } = event.params;
  if ( soundId && !data.library.sounds.some((sound) => sound.id === soundId) ) { throw event.error(404, SOUND_NOT_FOUND); }
};

const ServerStats = component$(() => {
  const location = useLocation();
  const libraryLoader = useGuildSoundLibrary();
  const library = libraryLoader.error ? null : libraryLoader.value;
  if ( !library || library.failed || library.guildId !== location.params.guildId ) { return null; }
  const change = formatChange(library.library.summary.playsChangePercent);
  const overview = library.library.summary.overview;
  const top = overview ? SoundLibrary.ranked(overview.topSounds, library.library.sounds) : [];
  const uploader = overview?.topListener;
  const peak = top[0]?.plays ?? 0;
  return (
    <>
      <div class="sounds__strip">
        <div class="stat-tile">
          <span class="overline">Plays · 7 days</span>
          <strong>{formatCount(library.library.summary.plays)}</strong>
          {change ? <span class={['caption', change.up ? 'delta--up' : 'delta--down']}>{change.text} vs previous week</span> : <span class="caption">No comparison</span>}
        </div>
        <div class="stat-tile"><span class="overline">Sounds in the server</span><strong>{formatCount(library.library.counts.all)}</strong><span class="caption">{library.library.counts.mine} yours</span></div>
        <div class="stat-tile"><span class="overline">Most played</span><strong class="stat-tile__text">{top[0]?.sound.name ?? '—'}</strong><span class="caption">{top[0] ? `${formatCount(top[0].plays)} plays this week` : 'No plays this week'}</span></div>
        <div class="stat-tile"><span class="overline">Most active uploader</span><strong class="stat-tile__text">{uploader?.user.name ?? '—'}</strong><span class="caption">{uploader?.soundCount ? `${uploader.soundCount} sounds` : ''}</span></div>
      </div>
      {top.length > 0 && (
        <section class="card chart-block" aria-labelledby="server-top">
          <div class="chart-block__head"><h2 id="server-top" class="chart-block__title">Most played this week</h2></div>
          <ol class="rank">
            {top.map(({ sound, plays }) => (
              <li key={sound.id}>
                <Link href={SoundLibrary.guildPath(location.params.guildId, sound.id)} scroll={false} class="rank__name">{sound.name}</Link>
                <span class="caption">{sound.ownedByMe ? 'You' : sound.uploader.name}</span>
                <progress class="rank__bar" value={plays} max={peak} aria-label={`${sound.name}, ${formatCount(plays)} plays`} />
                <span class="text-muted">{formatCompact(plays)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
});

const ServerWork = component$<{ query: LibraryQuery; guildName: string }>(({ query, guildName }) => {
  const location = useLocation();
  const loader = useGuildSoundLibrary();
  const player = useContext(SoundPlayerContext);
  const play = $((sound: SoundCard) => player.toggle$(sound.id, sound.audioUrl));
  const retry = $(() => loader.invalidate());
  if ( loader.error ) { return <LoadError message={SoundLibrary.LOAD_ERROR} retrying={loader.pending} onRetry$={retry} />; }
  const data = loader.value;
  const { guildId, soundId } = location.params;
  if ( data.guildId !== guildId ) { return <div class="catalog-list catalog-list--grid"><RowsSkeleton label="Loading sounds" /></div>; }
  if ( data.failed ) { return <LoadError message={data.message} retrying={loader.pending} onRetry$={retry} />; }
  const all = SoundLibrary.guildEntries(data.library);
  const entries = SoundLibrary.filter(all, query);
  const selected = soundId ? all.find((entry) => entry.sound.id === soundId)?.sound ?? null : null;
  const position = entries.findIndex((entry) => entry.sound.id === soundId);
  const paths = neighbours(entries, position, (entry) => SoundLibrary.guildPath(guildId, entry.sound.id));

  return (
    <div class="catalog-results">
      <section class="catalog-list catalog-list--grid" aria-label={`Sounds in ${guildName}`}>
        {entries.map(({ sound }) => (
          <SoundRow key={sound.id} sound={toSoundCard(sound)} href={SoundLibrary.guildPath(guildId, sound.id)} query={query.text} current={sound.id === soundId} onPlay$={play} />
        ))}
        {!entries.length && <p class="text-muted">{all.length ? 'No sounds match these filters.' : 'Nobody has uploaded a sound to this server yet.'}</p>}
      </section>
      {selected && (
        <aside class="card card--raised catalog-panel" aria-label="Sound details">
          <PanelBar kind="Sound" closeHref={SoundLibrary.guildPath(guildId)} {...paths} />
          <SoundPanel key={selected.id} sound={toSoundCard(selected)} live={toSoundCard(selected)} mode="server" signedIn loginHref="/auth/login/" uploadedIn={guildName} comments="none">
            <GreetPicker q:slot="greet" soundId={selected.id} soundName={selected.name} variant="button" />
          </SoundPanel>
        </aside>
      )}
    </div>
  );
});

export default component$(() => {
  useStyles$(catalogStyles);
  useStyles$(soundStyles);
  const guild = useGuild();
  const location = useLocation();
  const loader = useGuildSoundLibrary();
  const query = useStore<LibraryQuery>({ text: '', owner: 'all', visibility: 'all', sort: 'plays' });
  const library = loader.error || loader.pending ? null : loader.value;
  const counts = library && !library.failed && library.guildId === location.params.guildId ? library.library.counts : null;

  return (
    <main class="container library">
      <header class="library__head">
        <div class="settings-head__text">
          <p class="overline">{guild.value.name}{counts ? ` · ${formatCount(counts.all)} sounds` : ''}</p>
          <h1 class="settings-head__title">Sounds</h1>
          <p class="text-muted">Every sound members can play here. To change your own, open them in your profile.</p>
        </div>
        <Link href={SoundLibrary.MY_PATH} class="button button--secondary">Manage my sounds</Link>
      </header>
      <Pending fallback$={() => <SummarySkeleton />}>
        <ServerStats />
      </Pending>
      <LibraryTools query={query} label="Uploaded by" field="owner" filters={OWNERS.map((value) => ({ value, label: SoundLibrary.OWNER_LABELS[value], count: counts ? { all: counts.all, mine: counts.mine, others: counts.others }[value] : undefined }))} />
      <SoundPlayer key={location.params.guildId}>
        <Pending fallback$={() => <div class="catalog-list catalog-list--grid"><RowsSkeleton label="Loading sounds" /></div>}>
          <ServerWork query={query} guildName={guild.value.name} />
        </Pending>
      </SoundPlayer>
      <Slot />
    </main>
  );
});
