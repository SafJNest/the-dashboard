import { $, component$, Pending, Slot, useContext, useStore, useStyles$ } from '@qwik.dev/core';
import { Link, useLocation, type RequestHandler } from '@qwik.dev/router';
import { PanelSkeleton, RowsSkeleton } from '../../../../../components/catalog/catalog-states';
import { neighbours, PanelBar } from '../../../../../components/catalog/panel-bar';
import { SoundRow } from '../../../../../components/catalog/sound-items';
import { Icon } from '../../../../../components/dashboard/icons';
import { EmptyState } from '../../../../../components/empty-state/empty-state';
import { LibraryTools } from '../../../../../components/sounds/library-tools';
import { LoadError, SummarySkeleton } from '../../../../../components/sounds/library-states';
import { OwnerSound } from '../../../../../components/sounds/owner-sound';
import { SoundPlayer, SoundPlayerContext } from '../../../../../components/sounds/sound-player';
import { apiError, awaitLoader, isDocumentRequest, loaderResolver } from '../../../../../lib/beebot.server';
import { SOUND_NOT_FOUND } from '../../../../../lib/beebot/client.server';
import { toSoundCard, type SoundCard } from '../../../../../lib/catalog';
import { useDeleteSound, useOwnedSoundCard, useRemoveSoundImage, useSearchTags, useSetSoundImage, useUpdateSound } from '../../../../../lib/sound-editor';
import { SoundLibrary, type LibraryQuery, type VisibilityFilter } from '../../../../../lib/sound-library';
import { useMySounds, useSoundAnalytics } from '../../../../../lib/sound-loaders';
import { formatCount } from '../../../../../lib/sound-stats';
import { useAccount } from '../../../layout';
import soundStyles from '../../../../../components/sounds/sounds.css?inline';

export { useDeleteSound, useMySounds, useOwnedSoundCard, useRemoveSoundImage, useSearchTags, useSetSoundImage, useSoundAnalytics, useUpdateSound };

const VISIBILITIES: VisibilityFilter[] = ['all', 'public', 'private'];

export const onGet: RequestHandler = async (event) => {
  if ( !isDocumentRequest(event) ) { return; }
  if ( event.url.search ) { throw event.redirect(301, event.url.pathname); }
  const resolveValue = loaderResolver(event);
  resolveValue(useAccount).catch(() => undefined);
  resolveValue(useOwnedSoundCard).catch(() => undefined);
  const data = await awaitLoader(event, resolveValue(useMySounds));
  if ( data.failed ) { throw apiError(event, data); }
  const { soundId } = event.params;
  const isListed = SoundLibrary.myEntries(data.library).some((entry) => entry.sound.id === soundId);
  if ( soundId && !isListed ) { throw event.error(404, SOUND_NOT_FOUND); }
};

const MyStrip = component$(() => {
  const account = useAccount();
  const loader = useMySounds();
  const data = loader.error ? null : loader.value;
  if ( !data || data.failed ) { return null; }
  const entries = SoundLibrary.myEntries(data.library);
  const publicCount = entries.filter((entry) => entry.sound.public).length;
  const ids = new Set(entries.map((entry) => entry.sound.id));
  const greets = Object.values(account.value.greets).filter((sound) => ids.has(sound.id)).length;
  return (
    <div class="sounds__strip">
      <div class="stat-tile"><span class="overline">Sounds</span><strong>{formatCount(entries.length)}</strong><span class="caption">{publicCount} public · {entries.length - publicCount} private</span></div>
      <div class="stat-tile"><span class="overline">Plays · 30 days</span><strong>{formatCount(data.library.summary.plays)}</strong><span class="caption">across every server</span></div>
      <div class="stat-tile"><span class="overline">Likes</span><strong>{formatCount(data.library.summary.likes)}</strong><span class="caption">on your sounds</span></div>
      <div class="stat-tile"><span class="overline">Used as greet</span><strong>{formatCount(greets)}</strong><span class="caption">by you</span></div>
    </div>
  );
});

const MyWork = component$<{ query: LibraryQuery }>(({ query }) => {
  const loader = useMySounds();
  const player = useContext(SoundPlayerContext);
  const location = useLocation();
  const play = $((sound: SoundCard) => player.toggle$(sound.id, sound.audioUrl));
  const retry = $(() => loader.invalidate());
  if ( loader.error ) { return <LoadError message={SoundLibrary.LOAD_ERROR} retrying={loader.pending} onRetry$={retry} />; }
  const data = loader.value;
  if ( data.failed ) { return <LoadError message={data.message} retrying={loader.pending} onRetry$={retry} />; }
  const all = SoundLibrary.myEntries(data.library);
  const entries = SoundLibrary.filter(all, query);
  const { soundId } = location.params;
  const selected = soundId ? all.find((entry) => entry.sound.id === soundId) ?? null : null;
  const position = entries.findIndex((entry) => entry.sound.id === soundId);
  const paths = neighbours(entries, position, (entry) => SoundLibrary.myPath(entry.sound.id));

  if (!all.length) {
    return (
      <div class="card">
        <EmptyState icon="sounds" title="No sounds yet" flight="patrol">
          Upload your first sound and use it anywhere Beebot is.
          <Link q:slot="actions" href={SoundLibrary.UPLOAD_PATH} class="button button--primary">Upload sound</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div class="catalog-results">
      <section class="catalog-list catalog-list--grid" aria-label="Your sounds">
        {entries.map(({ sound, guildName }) => (
          <SoundRow key={sound.id} sound={toSoundCard(sound)} href={SoundLibrary.myPath(sound.id)} query={query.text} detail={guildName} showUploader={false} current={sound.id === soundId} onPlay$={play} />
        ))}
        {!entries.length && <p class="text-muted">No sounds match these filters.</p>}
      </section>
      {selected && (
        <aside class="card card--raised catalog-panel" aria-label="Sound details">
          <PanelBar kind="Sound" closeHref={SoundLibrary.myPath()} {...paths} />
          <Pending fallback$={() => <PanelSkeleton />}>
            <OwnerSound key={selected.sound.id} sound={selected.sound} guildName={selected.guildName} />
          </Pending>
        </aside>
      )}
    </div>
  );
});

export default component$(() => {
  useStyles$(soundStyles);
  const loader = useMySounds();
  const query = useStore<LibraryQuery>({ text: '', owner: 'all', visibility: 'all', sort: 'newest' });
  const count = loader.error || loader.pending || loader.value.failed ? null : SoundLibrary.myEntries(loader.value.library).length;

  return (
    <main class="container library">
      <header class="library__head">
        <div class="settings-head__text">
          <p class="overline">Your profile{count === null ? '' : ` · ${formatCount(count)} sounds`}</p>
          <h1 class="settings-head__title">My sounds</h1>
          <p class="text-muted">Edit a sound where you open it. Other servers and Explore show the same sound, with only the actions they allow.</p>
        </div>
        <Link href={SoundLibrary.UPLOAD_PATH} class="button button--primary"><Icon name="plus" />Upload sound</Link>
      </header>
      <Pending fallback$={() => <SummarySkeleton />}>
        <MyStrip />
      </Pending>
      <LibraryTools query={query} label="Visibility" filters={VISIBILITIES.map((value) => ({ value, label: SoundLibrary.VISIBILITY_LABELS[value] }))} field="visibility" />
      <SoundPlayer>
        <Pending fallback$={() => <div class="catalog-list catalog-list--grid"><RowsSkeleton label="Loading your sounds" /></div>}>
          <MyWork query={query} />
        </Pending>
      </SoundPlayer>
      <Slot />
    </main>
  );
});
