import { $, component$, noSerialize, Slot, useContext, useSignal, useStore, useTask$, type NoSerialize, type QRL } from '@qwik.dev/core';
import { Link, routeLoader$, useLocation, useNavigate, type DocumentHead, type RequestHandler } from '@qwik.dev/router';
import { SearchContext } from '../../../../components/catalog/catalog-context';
import { searchSounds } from '../../../../components/catalog/catalog-server';
import { CreatorSkeleton, RowsSkeleton } from '../../../../components/catalog/catalog-states';
import { PersonAvatar, SoundRow } from '../../../../components/catalog/sound-items';
import { Icon } from '../../../../components/dashboard/icons';
import { LoadError } from '../../../../components/sounds/library-states';
import { SoundPlayerContext } from '../../../../components/sounds/sound-player';
import { apiError, isDocumentRequest, loadFailure, loaderResolver } from '../../../../lib/beebot.server';
import { CatalogClient } from '../../../../lib/beebot/catalog.server';
import { CATALOG_SORT_LABELS, likeShare, NOT_FOUND_STATUS, SOUNDS_PATH, USER_ID, type CatalogSort, type SoundCard } from '../../../../lib/catalog';
import { CACHED_LOADER } from '../../../../lib/catalog-loaders';
import { requireSound } from '../../../../lib/catalog-guard.server';
import { peekValue } from '../../../../lib/loader-value';
import { formatCompact, formatCount } from '../../../../lib/sound-stats';
import { useViewer } from '../../layout';

const CREATOR_SORTS: CatalogSort[] = ['popular', 'mostLiked', 'newest'];
const LIST_FAILED = 'These sounds are unavailable right now. Please try again.';

export const useCreator = routeLoader$(async (event) => {
  const { userId } = event.params;
  if ( !USER_ID.test(userId) ) { return { ...loadFailure(event, CatalogClient.notFound(CatalogClient.CREATOR_NOT_FOUND)), userId }; }
  const result = await new CatalogClient(event).creator(userId);
  return result.ok ? { userId, creator: result.data } : { ...loadFailure(event, result), userId };
}, CACHED_LOADER);

export const useCreatorSounds = routeLoader$(async (event) => {
  const { userId } = event.params;
  if ( !USER_ID.test(userId) ) { return { ...loadFailure(event, CatalogClient.notFound(CatalogClient.CREATOR_NOT_FOUND)), userId }; }
  const result = await new CatalogClient(event).sounds({ uploaderId: userId, sort: 'popular' });
  return result.ok ? { userId, page: result.data } : { ...loadFailure(event, result), userId };
}, CACHED_LOADER);

export const onGet: RequestHandler = async (event) => {
  if ( !isDocumentRequest(event) ) { return; }
  const resolveValue = loaderResolver(event);
  resolveValue(useViewer).catch(() => undefined);
  resolveValue(useCreatorSounds).catch(() => undefined);
  const creator = resolveValue(useCreator);
  creator.catch(() => undefined);
  await requireSound(event, resolveValue);
  const data = await creator;
  if ( data.failed ) { throw apiError(event, data); }
};

interface CreatorSoundsProps {
  userId: string;
  name: string | null;
  home: string;
  selected: string | null;
  onPlay$: QRL<(sound: SoundCard) => void>;
}

const CreatorSounds = component$<CreatorSoundsProps>(({ userId, name, home, selected, onPlay$ }) => {
  const seed = useCreatorSounds();
  const list = useStore({ items: [] as SoundCard[], cursor: null as string | null, sort: 'popular' as CatalogSort, query: '', submitted: '', missing: false, ready: false, loading: false, more: false, error: null as string | null, ticket: 0 });
  const request = useSignal<NoSerialize<AbortController>>();
  const label = name ? `Search ${name}'s sounds` : 'Search sounds';

  useTask$(({ track }) => {
    const value = track(() => peekValue(seed));
    if ( list.ready || value?.userId !== userId ) { return; }
    list.ready = true;
    list.missing = !!value.failed && value.status === NOT_FOUND_STATUS;
    if ( value.failed ) { list.error = list.missing ? null : value.message; return; }
    list.items = value.page.items;
    list.cursor = value.page.nextCursor;
  });

  const load = $(async (cursor: string | null) => {
    request.value?.abort();
    const controller = new AbortController();
    request.value = noSerialize(controller);
    const ticket = ++list.ticket;
    list.ready = true;
    list.loading = true;
    list.more = cursor !== null;
    list.error = null;
    if (!cursor) {
      list.submitted = list.query.trim();
      list.items = [];
      list.cursor = null;
    }
    const result = await searchSounds(controller.signal, { uploaderId: userId, q: list.submitted, sort: list.sort, cursor }).catch(() => null);
    if ( ticket !== list.ticket ) { return; }
    list.loading = false;
    if ( !result ) { list.error = LIST_FAILED; return; }
    if ( !result.ok ) { list.error = result.message; return; }
    list.items = cursor ? [...list.items, ...result.data.items] : result.data.items;
    list.cursor = result.data.nextCursor;
  });

  const fresh = !list.ready || (list.loading && !list.more);

  return (
    <>
      {!list.missing && (
        <div class="catalog-filters">
          <form class="search-box search-box--compact" role="search" preventdefault:submit onSubmit$={() => load(null)}>
            <div class="search-box__field">
              <Icon name="search" />
              <input class="search-box__input" type="search" aria-label={label} placeholder={label} value={list.query} onInput$={(_, element) => (list.query = element.value)} />
            </div>
          </form>
          <label class="visually-hidden" for="creator-sort">Sort</label>
          <select id="creator-sort" class="catalog-select" onChange$={(_, element) => {
            list.sort = element.value as CatalogSort;
            load(null);
          }}>
            {CREATOR_SORTS.map((sort) => <option key={sort} value={sort} selected={list.sort === sort}>{CATALOG_SORT_LABELS[sort]}</option>)}
          </select>
        </div>
      )}

      <div class="catalog-results">
        {!list.missing && (
          <section class="catalog-list catalog-list--grid" aria-label={name ? `${name}'s sounds` : 'Sounds'} aria-busy={fresh || list.loading}>
            {fresh ? (
              <RowsSkeleton label="Loading sounds" />
            ) : (
              list.items.map((sound) => <SoundRow key={sound.id} sound={sound} href={`${home}/${sound.id}/`} query={list.submitted} current={selected === sound.id} showUploader={false} onPlay$={onPlay$} />)
            )}
            {list.error && <LoadError message={list.error} retrying={list.loading} onRetry$={$(() => load(list.more ? list.cursor : null))} />}
            {!fresh && !list.loading && !list.error && list.items.length === 0 && <p class="text-muted">No public sounds yet.</p>}
            {list.cursor && !fresh && !list.error && (
              <div class="catalog-list__more">
                <button type="button" class="button button--secondary button--sm" disabled={list.loading} aria-busy={list.loading} onClick$={() => load(list.cursor)}>
                  {list.loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </section>
        )}
        {selected && (
          <aside class="card card--raised catalog-panel" aria-label="Sound details">
            <div class="catalog-panel__bar">
              <span class="overline">Now viewing</span>
              <Link href={`${home}/`} class="button button--ghost button--sm" aria-label="Close" scroll={false}><Icon name="close" /></Link>
            </div>
            <Slot />
          </aside>
        )}
      </div>
    </>
  );
});

export default component$(() => {
  const viewer = peekValue(useViewer());
  const loader = useCreator();
  const search = useContext(SearchContext);
  const player = useContext(SoundPlayerContext);
  const location = useLocation();
  const navigate = useNavigate();
  const userId = location.params.userId;
  const home = `${SOUNDS_PATH}/u/${userId}`;
  const selected = location.params.soundId ?? null;
  const value = peekValue(loader);
  const current = value?.userId === userId ? value : undefined;
  const creator = current?.creator ?? null;
  const self = !!creator && viewer?.profile?.id === userId;
  const share = creator ? likeShare(creator.likes, creator.dislikes) : null;

  const play = $(async (sound: SoundCard) => {
    search.preview = sound;
    await Promise.all([player.toggle$(sound.id, sound.audioUrl), navigate(`${home}/${sound.id}/`, { scroll: false })]);
  });

  return (
    <div class="catalog">
      <section class="creator-hero">
        <nav aria-label="Breadcrumb"><Link href={`${SOUNDS_PATH}/`} class="button button--ghost button--sm"><Icon name="back" /><span>Explore</span></Link></nav>
        {current?.failed ? (
          <LoadError message={current.message} retrying={loader.pending} onRetry$={current.status === NOT_FOUND_STATUS ? undefined : $(() => loader.invalidate())} />
        ) : creator ? (
          <>
            <div class="creator-hero__id">
              <PersonAvatar user={creator.user} size={96} />
              <div class="sound-card__meta">
                <p class="eyebrow">Sound creator</p>
                <h1 class="display display--md">{creator.user.name}</h1>
                {creator.uploadingSince && (
                  <p class="text-muted">Uploading since {new Date(creator.uploadingSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                )}
              </div>
              {self && <a href="/dashboard/me/sounds/" class="button button--primary">Manage in dashboard</a>}
            </div>
            <div class="creator-stats">
              <div><span class="overline">Public sounds</span><strong>{formatCount(creator.soundCount)}</strong></div>
              <div><span class="overline">Total plays</span><strong>{formatCompact(creator.plays)}</strong></div>
              <div><span class="overline">Likes received</span><strong>{formatCompact(creator.likes)}</strong><span class="caption">{share === null ? 'No ratings yet' : `${share}% of ratings are likes`}</span></div>
              <div><span class="overline">Comments</span><strong>{formatCompact(creator.commentCount)}</strong></div>
            </div>
          </>
        ) : (
          <CreatorSkeleton />
        )}
      </section>

      <CreatorSounds key={userId} userId={userId} name={creator?.user.name ?? null} home={home} selected={selected} onPlay$={play}>
        <Slot />
      </CreatorSounds>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const creator = resolveValue(useCreator).creator;
  return { title: creator ? `${creator.user.name} · Beebot sounds` : 'Beebot sounds' };
};
