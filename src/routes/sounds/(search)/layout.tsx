import { $, component$, noSerialize, Slot, useContext, useSignal, useStore, useTask$, type NoSerialize, type QRL } from '@qwik.dev/core';
import { Link, routeLoader$, useLocation, useNavigate, type RequestHandler } from '@qwik.dev/router';
import { SearchContext } from '../../../components/catalog/catalog-context';
import { searchSounds } from '../../../components/catalog/catalog-server';
import { RowsSkeleton, TagsSkeleton, TilesSkeleton } from '../../../components/catalog/catalog-states';
import { SearchBox } from '../../../components/catalog/search-box';
import { SoundRow, SoundTile } from '../../../components/catalog/sound-items';
import { Icon } from '../../../components/dashboard/icons';
import { EmptyState } from '../../../components/empty-state/empty-state';
import { LoadError } from '../../../components/sounds/library-states';
import { SoundPlayerContext } from '../../../components/sounds/sound-player';
import { isDocumentRequest, loadFailure, loaderResolver } from '../../../lib/beebot.server';
import { CatalogClient } from '../../../lib/beebot/catalog.server';
import { CATALOG_SORT_LABELS, CATALOG_SORTS, LENGTHS, type CatalogSort, type LengthFilter, type SoundCard } from '../../../lib/catalog';
import { CACHED_LOADER } from '../../../lib/catalog-loaders';
import { requireSound } from '../../../lib/catalog-guard.server';
import { peekValue } from '../../../lib/loader-value';
import { useSoundsSite, useViewer } from '../layout';

const SEARCH_FAILED = 'Search is unavailable right now. Please try again.';
const FILTER_TAGS = 8;

export const useExplore = routeLoader$(async (event) => {
  const result = await new CatalogClient(event).explore();
  return result.ok ? { explore: result.data } : loadFailure(event, result);
}, CACHED_LOADER);

export const onGet: RequestHandler = async (event) => {
  if ( !isDocumentRequest(event) ) { return; }
  const resolveValue = loaderResolver(event);
  resolveValue(useViewer).catch(() => undefined);
  const explore = resolveValue(useExplore);
  explore.catch(() => undefined);
  await requireSound(event, resolveValue);
  const data = await explore;
  if ( !event.params.soundId && data.failed ) { event.status(data.status); }
};

const PopularTags = component$<{ limit?: number; active: string | null; onPick$: QRL<(tag: string) => void> }>(({ limit, active, onPick$ }) => {
  const explore = peekValue(useExplore());
  if ( !explore ) { return <TagsSkeleton />; }
  const tags = explore.explore?.popularTags.slice(0, limit) ?? [];
  if ( tags.length === 0 ) { return null; }
  return (
    <div class="catalog-filters__tags" role="group" aria-label="Popular tags">
      {tags.map((tag) => (
        <button key={tag.id} type="button" class="catalog-chip" aria-pressed={active === tag.name} onClick$={() => onPick$(tag.name)}>#{tag.name}</button>
      ))}
    </div>
  );
});

const ExploreSections = component$<{ base: string; selected: string | null; onPlay$: QRL<(sound: SoundCard) => void> }>(({ base, selected, onPlay$ }) => {
  const loader = useExplore();
  const value = peekValue(loader);
  if ( value?.failed ) { return <LoadError message={value.message} retrying={loader.pending} onRetry$={$(() => loader.invalidate())} />; }
  const data = value?.explore;

  return (
    <div class="catalog-stack">
      <section class="catalog-section" aria-labelledby="catalog-trending">
        <div class="catalog-section__head"><h2 id="catalog-trending" class="heading">Trending this week</h2></div>
        {data ? (
          <div class="catalog-grid">
            {data.trending.map((sound) => <SoundTile key={sound.id} sound={sound} href={`${base}/${sound.id}/`} />)}
          </div>
        ) : (
          <TilesSkeleton />
        )}
      </section>
      <section class="catalog-section" aria-labelledby="catalog-latest">
        <div class="catalog-section__head"><h2 id="catalog-latest" class="heading">Just added</h2><span class="caption">Newest public sounds</span></div>
        <div class="card catalog-list catalog-list--grid" aria-busy={!data}>
          {data ? data.latest.map((sound) => <SoundRow key={sound.id} sound={sound} href={`${base}/${sound.id}/`} current={selected === sound.id} onPlay$={onPlay$} />) : <RowsSkeleton label="Loading new sounds" />}
        </div>
      </section>
    </div>
  );
});

export default component$(() => {
  const site = useSoundsSite();
  const search = useContext(SearchContext);
  const player = useContext(SoundPlayerContext);
  const location = useLocation();
  const navigate = useNavigate();
  const results = useStore({ items: [] as SoundCard[], mine: [] as SoundCard[], cursor: null as string | null, loading: false, more: false, error: null as string | null, ticket: 0 });
  const request = useSignal<NoSerialize<AbortController>>();
  const base = site.value.base;
  const selected = location.params.soundId ?? null;
  const searching = search.submitted !== null || search.tag !== null;
  const typed = search.submitted ?? '';

  const run = $(async (cursor: string | null) => {
    request.value?.abort();
    const controller = new AbortController();
    request.value = noSerialize(controller);
    const ticket = ++results.ticket;
    results.loading = true;
    results.more = cursor !== null;
    results.error = null;
    if (!cursor) {
      results.items = [];
      results.mine = [];
      results.cursor = null;
    }
    const filters = { q: search.submitted ?? '', tag: search.tag, sort: search.sort, length: search.length, cursor };
    const result = await searchSounds(controller.signal, filters).catch(() => null);
    if ( ticket !== results.ticket ) { return; }
    results.loading = false;
    if ( !result ) { results.error = SEARCH_FAILED; return; }
    if ( !result.ok ) { results.error = result.message; return; }
    results.items = cursor ? [...results.items, ...result.data.items] : result.data.items;
    results.mine = cursor ? results.mine : result.data.mine;
    results.cursor = result.data.nextCursor;
  });

  useTask$(({ track }) => {
    track(() => [search.submitted, search.tag, search.sort, search.length]);
    const active = search.submitted !== null || search.tag !== null;
    active && run(null);
  });

  const play = $(async (sound: SoundCard) => {
    search.preview = sound;
    await Promise.all([player.toggle$(sound.id, sound.audioUrl), navigate(`${base}/${sound.id}/`, { scroll: false })]);
  });

  const showResults = $((query: string) => {
    const tag = query.startsWith('#') ? query.slice(1).trim() || null : null;
    const submitted = tag ? '' : query;
    const unchanged = search.tag === tag && search.submitted === submitted;
    search.tag = tag;
    search.submitted = submitted;
    unchanged && run(null);
  });

  const pickTag = $((tag: string) => {
    search.query = `#${tag}`;
    search.tag = tag;
    search.submitted = '';
  });

  const fresh = results.loading && !results.more;
  const empty = !results.loading && !results.error && results.items.length === 0 && results.mine.length === 0;
  const panel = selected && (
    <aside class="card card--raised catalog-panel" aria-label="Sound details">
      <div class="catalog-panel__bar">
        <span class="overline">Now viewing</span>
        <Link href={`${base}/`} class="button button--ghost button--sm" aria-label="Close" scroll={false}><Icon name="close" /></Link>
      </div>
      <Slot />
    </aside>
  );

  return (
    <div class="catalog">
      {searching ? (
        <div class="catalog-bar">
          <SearchBox base={base} compact onSearch$={showResults} onTag$={pickTag} onPlay$={play} />
          <div class="catalog-filters">
            <PopularTags limit={FILTER_TAGS} active={search.tag} onPick$={$((tag: string) => (search.tag = search.tag === tag ? null : tag))} />
            <div class="segmented" role="group" aria-label="Length">
              {(Object.keys(LENGTHS) as LengthFilter[]).map((length) => (
                <label key={length} class="segmented__item">
                  <input type="radio" name="catalog-length" class="visually-hidden" checked={search.length === length} onChange$={() => (search.length = length)} />
                  {LENGTHS[length].label}
                </label>
              ))}
            </div>
            <label class="visually-hidden" for="catalog-sort">Sort</label>
            <select id="catalog-sort" class="catalog-select" onChange$={(_, element) => (search.sort = (element.value || null) as CatalogSort | null)}>
              <option value="" selected={search.sort === null}>{typed ? 'Relevance' : 'Most played'}</option>
              {CATALOG_SORTS.filter((sort) => sort !== 'relevance' || typed).map((sort) => (
                <option key={sort} value={sort} selected={search.sort === sort}>{CATALOG_SORT_LABELS[sort]}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div class="catalog-hero">
          <p class="eyebrow">Beebot sounds</p>
          <h1 class="display catalog-hero__title">Find the sound <em>for the moment.</em></h1>
          <p class="lead">Search public sounds from every server by name or tag. Listen freely; log in to like, comment and use them as your greet.</p>
          <SearchBox base={base} compact={false} onSearch$={showResults} onTag$={pickTag} onPlay$={play} />
          <PopularTags active={null} onPick$={pickTag} />
        </div>
      )}

      {searching ? (
        <div class="catalog-results">
          <section class="catalog-list catalog-list--grid" aria-label="Results" aria-busy={results.loading}>
            {fresh ? (
              <RowsSkeleton label="Searching sounds" />
            ) : (
              <>
                {results.mine.length > 0 && (
                  <>
                    <h2 class="overline">Your sounds</h2>
                    {results.mine.map((sound) => <SoundRow key={`mine-${sound.id}`} sound={sound} href={`${base}/${sound.id}/`} query={typed} current={selected === sound.id} onPlay$={play} />)}
                    <h2 class="overline">Everyone</h2>
                  </>
                )}
                {results.items.map((sound) => <SoundRow key={sound.id} sound={sound} href={`${base}/${sound.id}/`} query={typed} current={selected === sound.id} onPlay$={play} />)}
              </>
            )}
            {results.error && <LoadError message={results.error} retrying={results.loading} onRetry$={$(() => run(results.more ? results.cursor : null))} />}
            {empty && (
              <div class="card">
                <EmptyState icon="search" title="No sounds match">Try fewer filters or a broader word. Tags work too, like #meme.</EmptyState>
              </div>
            )}
            {results.cursor && !fresh && !results.error && (
              <div class="catalog-list__more">
                <button type="button" class="button button--secondary button--sm" disabled={results.loading} aria-busy={results.loading} onClick$={() => run(results.cursor)}>
                  {results.loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </section>
          {panel}
        </div>
      ) : (
        <div class="catalog-results">
          <ExploreSections base={base} selected={selected} onPlay$={play} />
          {panel}
        </div>
      )}
    </div>
  );
});
