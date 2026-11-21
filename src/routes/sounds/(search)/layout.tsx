import { $, component$, noSerialize, Slot, useContext, useSignal, useStore, useTask$, type NoSerialize, type QRL } from '@qwik.dev/core';
import { routeLoader$, useLocation, useNavigate, type RequestHandler } from '@qwik.dev/router';
import { BoardRow, BoardTile } from '../../../components/catalog/board-items';
import { SearchContext } from '../../../components/catalog/catalog-context';
import { searchBoards, searchSounds } from '../../../components/catalog/catalog-server';
import { RowsSkeleton, TagsSkeleton, TilesSkeleton } from '../../../components/catalog/catalog-states';
import { neighbours, PanelBar } from '../../../components/catalog/panel-bar';
import { SearchBox } from '../../../components/catalog/search-box';
import { SoundRow, SoundTile } from '../../../components/catalog/sound-items';
import { EmptyState } from '../../../components/empty-state/empty-state';
import { LoadError } from '../../../components/sounds/library-states';
import { SoundPlayerContext } from '../../../components/sounds/sound-player';
import { isDocumentRequest, loadFailure, loaderResolver } from '../../../lib/beebot.server';
import { CatalogClient } from '../../../lib/beebot/catalog.server';
import {
  boardPath,
  CATALOG_SORT_LABELS,
  CATALOG_SORTS,
  EXPLORE_BOARDS,
  LENGTHS,
  PREVIEW_BOARDS,
  PREVIEW_SOUNDS,
  SEARCH_TYPE_LABELS,
  SEARCH_TYPES,
  soundPath,
  SOUNDS_PATH,
  type CatalogSort,
  type LengthFilter,
  type SearchType,
  type SoundCard,
} from '../../../lib/catalog';
import { CACHED_LOADER } from '../../../lib/catalog-loaders';
import { requireBoard, requireSound } from '../../../lib/catalog-guard.server';
import { peekValue } from '../../../lib/loader-value';
import type { Soundboard } from '../../../lib/soundboards';
import { useViewer } from '../layout';

const SEARCH_FAILED = 'Search is unavailable right now. Please try again.';
const FILTER_TAGS = 8;

export const useExplore = routeLoader$(async (event) => {
  const result = await new CatalogClient(event).explore();
  return result.ok ? { explore: result.data } : loadFailure(event, result);
}, CACHED_LOADER);

export const useExploreBoards = routeLoader$(async (event) => {
  const result = await new CatalogClient(event).soundboards({ limit: EXPLORE_BOARDS });
  return result.ok ? { boards: result.data.items } : loadFailure(event, result);
}, CACHED_LOADER);

export const onGet: RequestHandler = async (event) => {
  if ( !isDocumentRequest(event) ) { return; }
  const resolveValue = loaderResolver(event);
  resolveValue(useViewer).catch(() => undefined);
  resolveValue(useExploreBoards).catch(() => undefined);
  const explore = resolveValue(useExplore);
  explore.catch(() => undefined);
  await requireSound(event, resolveValue);
  await requireBoard(event, resolveValue);
  const data = await explore;
  const isHome = !event.params.soundId && !event.params.boardId;
  isHome && data.failed && event.status(data.status);
};

interface ResultList<T> {
  items: T[];
  cursor: string | null;
  loading: boolean;
  more: boolean;
  error: string | null;
  ticket: number;
}

const emptyList = <T,>(): ResultList<T> => ({ items: [], cursor: null, loading: false, more: false, error: null, ticket: 0 });

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

interface ExploreSectionsProps {
  selected: string | null;
  onPlay$: QRL<(sound: SoundCard) => void>;
  onSeeAll$: QRL<(type: SearchType) => void>;
}

const ExploreSections = component$<ExploreSectionsProps>(({ selected, onPlay$, onSeeAll$ }) => {
  const loader = useExplore();
  const boardsLoader = useExploreBoards();
  const value = peekValue(loader);
  const boards = peekValue(boardsLoader);
  if ( value?.failed ) { return <LoadError message={value.message} retrying={loader.pending} onRetry$={$(() => loader.invalidate())} />; }
  const data = value?.explore;

  return (
    <div class="catalog-stack">
      <section class="catalog-section" aria-labelledby="catalog-trending">
        <div class="catalog-section__head">
          <h2 id="catalog-trending" class="heading">Trending sounds</h2>
          <button type="button" class="button button--ghost button--sm" onClick$={() => onSeeAll$('sounds')}>See all</button>
        </div>
        {data ? (
          <div class="catalog-grid">
            {data.trending.map((sound) => <SoundTile key={sound.id} sound={sound} href={soundPath(sound.id)} />)}
          </div>
        ) : (
          <TilesSkeleton />
        )}
      </section>
      {!boards?.failed && (
        <section class="catalog-section" aria-labelledby="catalog-boards">
          <div class="catalog-section__head">
            <h2 id="catalog-boards" class="heading">Soundboards to play</h2>
            <button type="button" class="button button--ghost button--sm" onClick$={() => onSeeAll$('boards')}>See all</button>
          </div>
          {boards ? (
            boards.boards.length > 0 ? (
              <div class="catalog-grid">
                {boards.boards.map((board) => <BoardTile key={board.id} board={board} href={boardPath(board.id)} />)}
              </div>
            ) : (
              <p class="text-muted">No public soundboards yet.</p>
            )
          ) : (
            <TilesSkeleton />
          )}
        </section>
      )}
      <section class="catalog-section" aria-labelledby="catalog-latest">
        <div class="catalog-section__head"><h2 id="catalog-latest" class="heading">Just added</h2><span class="caption">Newest public sounds</span></div>
        <div class="card catalog-list catalog-list--grid" aria-busy={!data}>
          {data ? data.latest.map((sound) => <SoundRow key={sound.id} sound={sound} href={soundPath(sound.id)} current={selected === soundPath(sound.id)} onPlay$={onPlay$} />) : <RowsSkeleton label="Loading new sounds" />}
        </div>
      </section>
    </div>
  );
});

export default component$(() => {
  const search = useContext(SearchContext);
  const player = useContext(SoundPlayerContext);
  const viewer = peekValue(useViewer());
  const explore = peekValue(useExplore());
  const exploreBoards = peekValue(useExploreBoards());
  const location = useLocation();
  const navigate = useNavigate();
  const sounds = useStore<ResultList<SoundCard>>(emptyList());
  const boards = useStore<ResultList<Soundboard>>(emptyList());
  const soundRequest = useSignal<NoSerialize<AbortController>>();
  const boardRequest = useSignal<NoSerialize<AbortController>>();
  const { soundId, boardId } = location.params;
  const selected = soundId ? soundPath(soundId) : boardId ? boardPath(boardId) : null;
  const searching = search.submitted !== null || search.tag !== null;
  const typed = search.submitted ?? '';
  const boardsSearchable = search.tag === null;
  const viewerId = viewer?.profile?.id ?? null;

  const runSounds = $(async (cursor: string | null) => {
    soundRequest.value?.abort();
    const controller = new AbortController();
    soundRequest.value = noSerialize(controller);
    const ticket = ++sounds.ticket;
    sounds.loading = true;
    sounds.more = cursor !== null;
    sounds.error = null;
    !cursor && (sounds.items = []);
    const limit = search.type === 'all' ? PREVIEW_SOUNDS : undefined;
    const filters = { q: typed, tag: search.tag, sort: search.sort, length: search.length, limit, cursor };
    const result = await searchSounds(controller.signal, filters).catch(() => null);
    if ( ticket !== sounds.ticket ) { return; }
    sounds.loading = false;
    if ( !result ) { sounds.error = SEARCH_FAILED; return; }
    if ( !result.ok ) { sounds.error = result.message; return; }
    sounds.items = cursor ? [...sounds.items, ...result.data.items] : result.data.items;
    sounds.cursor = result.data.nextCursor;
  });

  const runBoards = $(async (cursor: string | null) => {
    boardRequest.value?.abort();
    const controller = new AbortController();
    boardRequest.value = noSerialize(controller);
    const ticket = ++boards.ticket;
    boards.loading = true;
    boards.more = cursor !== null;
    boards.error = null;
    !cursor && (boards.items = []);
    const limit = search.type === 'all' ? PREVIEW_BOARDS : undefined;
    const result = await searchBoards(controller.signal, { q: typed, limit, cursor }).catch(() => null);
    if ( ticket !== boards.ticket ) { return; }
    boards.loading = false;
    if ( !result ) { boards.error = SEARCH_FAILED; return; }
    if ( !result.ok ) { boards.error = result.message; return; }
    boards.items = cursor ? [...boards.items, ...result.data.items] : result.data.items;
    boards.cursor = result.data.nextCursor;
  });

  const run = $(async () => {
    const wantsSounds = search.type !== 'boards';
    const wantsBoards = search.type !== 'sounds' && search.tag === null;
    !wantsBoards && Object.assign(boards, emptyList<Soundboard>(), { ticket: boards.ticket + 1 });
    !wantsSounds && Object.assign(sounds, emptyList<SoundCard>(), { ticket: sounds.ticket + 1 });
    await Promise.all([wantsSounds && runSounds(null), wantsBoards && runBoards(null)]);
  });

  useTask$(({ track }) => {
    track(() => [search.submitted, search.tag, search.sort, search.length, search.type]);
    const active = search.submitted !== null || search.tag !== null;
    active && run();
  });

  const play = $(async (sound: SoundCard) => {
    search.preview = sound;
    await Promise.all([player.toggle$(sound.id, sound.audioUrl), navigate(soundPath(sound.id), { scroll: false })]);
  });

  const showResults = $((query: string) => {
    const tag = query.startsWith('#') ? query.slice(1).trim() || null : null;
    const submitted = tag ? '' : query;
    const unchanged = search.tag === tag && search.submitted === submitted;
    search.tag = tag;
    search.submitted = submitted;
    tag && search.type === 'boards' && (search.type = 'sounds');
    unchanged && run();
  });

  const pickTag = $((tag: string) => {
    search.query = `#${tag}`;
    search.tag = tag;
    search.submitted = '';
    search.type === 'boards' && (search.type = 'sounds');
  });

  const seeAll = $((type: SearchType) => {
    search.type = type;
    search.submitted === null && search.tag === null && (search.submitted = '');
  });

  const hrefs = searching
    ? [...sounds.items.map((sound) => soundPath(sound.id)), ...boards.items.map((board) => boardPath(board.id))]
    : [
        ...(explore?.explore?.trending ?? []).map((sound) => soundPath(sound.id)),
        ...(exploreBoards?.boards ?? []).map((board) => boardPath(board.id)),
        ...(explore?.explore?.latest ?? []).map((sound) => soundPath(sound.id)),
      ];
  const position = selected ? hrefs.indexOf(selected) : -1;
  const { previousHref, nextHref } = neighbours(hrefs, position, (href) => href);
  const panel = selected && (
    <aside class="card card--raised catalog-panel" aria-label={soundId ? 'Sound details' : 'Soundboard details'}>
      <PanelBar kind={soundId ? 'Sound' : 'Soundboard'} closeHref={`${SOUNDS_PATH}/`} previousHref={previousHref} nextHref={nextHref} />
      <Slot />
    </aside>
  );

  const showSounds = search.type !== 'boards';
  const showBoards = search.type !== 'sounds' && boardsSearchable;
  const isPreview = search.type === 'all';
  const soundsEmpty = !sounds.loading && !sounds.error && sounds.items.length === 0;
  const boardsEmpty = !boards.loading && !boards.error && boards.items.length === 0;
  const nothing = (!showSounds || soundsEmpty) && (!showBoards || boardsEmpty);
  const heading = typed ? `Results for “${typed}”` : search.tag ? `Sounds tagged #${search.tag}` : 'All results';

  return (
    <div class="catalog">
      {searching ? (
        <div class="catalog-bar">
          <SearchBox compact onSearch$={showResults} onTag$={pickTag} onPlay$={play} />
          <div class="catalog-filters">
            <div class="segmented" role="radiogroup" aria-label="Type">
              {SEARCH_TYPES.map((type) => {
                const isDisabled = type === 'boards' && !boardsSearchable;
                return (
                  <label key={type} class="segmented__item" title={isDisabled ? 'Tags apply to sounds only' : undefined}>
                    <input type="radio" name="catalog-type" class="visually-hidden" checked={search.type === type} disabled={isDisabled} onChange$={() => (search.type = type)} />
                    {SEARCH_TYPE_LABELS[type]}
                  </label>
                );
              })}
            </div>
            <PopularTags limit={FILTER_TAGS} active={search.tag} onPick$={$((tag: string) => {
              search.tag = search.tag === tag ? null : tag;
              search.type === 'boards' && (search.type = 'sounds');
            })} />
            <div class="segmented" role="radiogroup" aria-label="Length">
              {(Object.keys(LENGTHS) as LengthFilter[]).map((length) => (
                <label key={length} class="segmented__item">
                  <input type="radio" name="catalog-length" class="visually-hidden" checked={search.length === length} disabled={search.type === 'boards'} onChange$={() => (search.length = length)} />
                  {LENGTHS[length].label}
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : selected ? (
        <div class="catalog-bar">
          <SearchBox compact onSearch$={showResults} onTag$={pickTag} onPlay$={play} />
        </div>
      ) : (
        <div class="catalog-hero">
          <p class="eyebrow">Beebot sounds</p>
          <h1 class="display catalog-hero__title">Find the sound <em>for the moment.</em></h1>
          <p class="lead">Search every public sound and soundboard by name or tag. Listen freely; log in to like, comment and use them as your greet.</p>
          <SearchBox compact={false} onSearch$={showResults} onTag$={pickTag} onPlay$={play} />
          <PopularTags active={null} onPick$={pickTag} />
        </div>
      )}

      {searching ? (
        <div class="catalog-results">
          <div class="catalog-stack catalog-stack--tight">
            <div class="catalog-section__head">
              <h1 class="heading">{heading}</h1>
              <span>
                <label class="visually-hidden" for="catalog-sort">Sort</label>
                <select id="catalog-sort" class="catalog-select" disabled={search.type === 'boards'} onChange$={(_, element) => (search.sort = (element.value || null) as CatalogSort | null)}>
                  <option value="" selected={search.sort === null}>{typed ? 'Relevance' : 'Most played'}</option>
                  {CATALOG_SORTS.filter((sort) => (sort !== 'relevance' || typed) && sort !== 'mostDisliked').map((sort) => (
                    <option key={sort} value={sort} selected={search.sort === sort}>{CATALOG_SORT_LABELS[sort]}</option>
                  ))}
                </select>
              </span>
            </div>
            {showSounds && (
              <section class="catalog-section" aria-label="Sounds" aria-busy={sounds.loading}>
                {isPreview && !soundsEmpty && (
                  <div class="catalog-section__head">
                    <h2 class="heading heading--sm">Sounds</h2>
                    {sounds.cursor && <button type="button" class="button button--ghost button--sm" onClick$={() => (search.type = 'sounds')}>See all sounds</button>}
                  </div>
                )}
                <div class="catalog-list catalog-list--grid">
                  {sounds.loading && !sounds.more ? <RowsSkeleton label="Searching sounds" /> : sounds.items.map((sound) => <SoundRow key={sound.id} sound={sound} href={soundPath(sound.id)} query={typed} current={selected === soundPath(sound.id)} onPlay$={play} />)}
                  {sounds.error && <LoadError message={sounds.error} retrying={sounds.loading} onRetry$={$(() => runSounds(sounds.more ? sounds.cursor : null))} />}
                  {!isPreview && sounds.cursor && !sounds.error && !(sounds.loading && !sounds.more) && (
                    <div class="catalog-list__more">
                      <button type="button" class="button button--secondary button--sm" disabled={sounds.loading} aria-busy={sounds.loading} onClick$={() => runSounds(sounds.cursor)}>
                        {sounds.loading ? 'Loading…' : 'Load more'}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
            {showBoards && (
              <section class="catalog-section" aria-label="Soundboards" aria-busy={boards.loading}>
                {isPreview && !boardsEmpty && (
                  <div class="catalog-section__head">
                    <h2 class="heading heading--sm">Soundboards</h2>
                    {boards.cursor && <button type="button" class="button button--ghost button--sm" onClick$={() => (search.type = 'boards')}>See all soundboards</button>}
                  </div>
                )}
                <div class="catalog-list catalog-list--grid">
                  {boards.loading && !boards.more ? <RowsSkeleton label="Searching soundboards" /> : boards.items.map((board) => <BoardRow key={board.id} board={board} href={boardPath(board.id)} query={typed} viewerId={viewerId} current={selected === boardPath(board.id)} />)}
                  {boards.error && <LoadError message={boards.error} retrying={boards.loading} onRetry$={$(() => runBoards(boards.more ? boards.cursor : null))} />}
                  {!isPreview && boards.cursor && !boards.error && !(boards.loading && !boards.more) && (
                    <div class="catalog-list__more">
                      <button type="button" class="button button--secondary button--sm" disabled={boards.loading} aria-busy={boards.loading} onClick$={() => runBoards(boards.cursor)}>
                        {boards.loading ? 'Loading…' : 'Load more'}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
            {nothing && (
              <div class="card">
                <EmptyState icon="search" title="No results">Try fewer filters or a broader word. Tags work too, like #meme.</EmptyState>
              </div>
            )}
          </div>
          {panel}
        </div>
      ) : (
        <div class="catalog-results">
          <ExploreSections selected={selected} onPlay$={play} onSeeAll$={seeAll} />
          {panel}
        </div>
      )}
    </div>
  );
});
