import { $, component$, Pending, Slot, useSignal, useStyles$ } from '@qwik.dev/core';
import { Link, routeLoader$, useLocation, type RequestHandler } from '@qwik.dev/router';
import { BoardPanel } from '../../../../../components/catalog/board-panel';
import { BoardRow } from '../../../../../components/catalog/board-items';
import { PanelSkeleton, RowsSkeleton } from '../../../../../components/catalog/catalog-states';
import { neighbours, PanelBar } from '../../../../../components/catalog/panel-bar';
import { LoadError } from '../../../../../components/sounds/library-states';
import { apiError, awaitLoader, isDocumentRequest, loaderResolver, loadFailure } from '../../../../../lib/beebot.server';
import { BeebotClient } from '../../../../../lib/beebot/client.server';
import { CatalogClient } from '../../../../../lib/beebot/catalog.server';
import { SoundLibrary, type OwnerFilter } from '../../../../../lib/sound-library';
import { Soundboards } from '../../../../../lib/soundboards';
import { formatCount } from '../../../../../lib/sound-stats';
import { useAccount } from '../../../layout';
import { useGuild } from '../../layout';
import catalogStyles from '../../../../../components/catalog/catalog.css?inline';
import soundStyles from '../../../../../components/sounds/sounds.css?inline';

const OWNERS: OwnerFilter[] = ['all', 'mine', 'others'];
const BOARD_LOADER = { search: [] as string[], serializationStrategy: 'always' as const, cacheControl: { private: true, maxAge: 300 }, blockSSR: false };

export const useGuildBoards = routeLoader$(async (event) => {
  const { guildId } = event.params;
  const result = await new BeebotClient(event).guildSoundboards(guildId);
  return result.ok ? { guildId, boards: result.data } : { ...loadFailure(event, result), guildId };
}, BOARD_LOADER);

export const useGuildBoard = routeLoader$(async (event) => {
  const { guildId, boardId } = event.params;
  if ( !boardId ) { return { boardId: null, detail: null }; }
  const result = Soundboards.ID.test(boardId) ? await new BeebotClient(event).guildSoundboard(guildId, boardId) : CatalogClient.notFound(Soundboards.NOT_FOUND);
  return result.ok ? { boardId, detail: result.data } : { ...loadFailure(event, result), boardId };
}, BOARD_LOADER);

export const onGet: RequestHandler = async (event) => {
  if ( !isDocumentRequest(event) ) { return; }
  const resolveValue = loaderResolver(event);
  resolveValue(useAccount).catch(() => undefined);
  resolveValue(useGuild).catch(() => undefined);
  const board = resolveValue(useGuildBoard);
  board.catch(() => undefined);
  const boards = await awaitLoader(event, resolveValue(useGuildBoards));
  if ( boards.failed ) { throw apiError(event, boards); }
  const detail = await awaitLoader(event, board);
  if ( detail.failed ) { throw apiError(event, detail); }
};

const BoardDetail = component$<{ viewerId: string }>(({ viewerId }) => {
  const location = useLocation();
  const loader = useGuildBoard();
  const value = loader.error ? null : loader.value;
  if ( !value ) { return <LoadError message={SoundLibrary.LOAD_ERROR} retrying={loader.pending} onRetry$={$(() => loader.invalidate())} />; }
  if ( value.boardId !== location.params.boardId ) { return <PanelSkeleton />; }
  if ( value.failed ) { return <div class="catalog-panel__body"><LoadError message={value.message} /></div>; }
  if ( !value.detail ) { return null; }
  return <BoardPanel key={value.boardId} detail={value.detail} owner={null} mode="server" viewerId={viewerId} signedIn loginHref="/auth/login/" />;
});

const ServerBoards = component$(() => {
  const location = useLocation();
  const account = useAccount();
  const loader = useGuildBoards();
  const owner = useSignal<OwnerFilter>('all');
  const retry = $(() => loader.invalidate());
  if ( loader.error ) { return <LoadError message={SoundLibrary.LOAD_ERROR} retrying={loader.pending} onRetry$={retry} />; }
  const data = loader.value;
  const { guildId, boardId } = location.params;
  if ( data.guildId !== guildId ) { return <div class="catalog-list"><RowsSkeleton label="Loading soundboards" /></div>; }
  if ( data.failed ) { return <LoadError message={data.message} retrying={loader.pending} onRetry$={retry} />; }
  const userId = account.value.user.id;
  const mine = data.boards.filter((board) => board.userId === userId).length;
  const counts: Record<OwnerFilter, number> = { all: data.boards.length, mine, others: data.boards.length - mine };
  const boards = owner.value === 'all' ? data.boards : data.boards.filter((board) => (board.userId === userId) === (owner.value === 'mine'));
  const position = boards.findIndex((board) => board.id === boardId);
  const paths = neighbours(boards, position, (board) => Soundboards.guildPath(guildId, board.id));

  return (
    <>
      <div class="catalog-filters library__tools">
        <div class="filter-tabs" role="group" aria-label="Made by">
          {OWNERS.map((value) => (
            <button key={value} type="button" class="filter-tabs__item" aria-pressed={owner.value === value} onClick$={() => (owner.value = value)}>
              {SoundLibrary.OWNER_LABELS[value]}
              <span class="filter-tabs__count">{counts[value]}</span>
            </button>
          ))}
        </div>
        <span class="caption">Only the maker can change a board.</span>
      </div>
      <div class="catalog-results">
        <section class="catalog-list catalog-list--grid" aria-label="Soundboards">
          {boards.map((board) => <BoardRow key={board.id} board={board} href={Soundboards.guildPath(guildId, board.id)} viewerId={userId} current={board.id === boardId} />)}
          {!boards.length && <p class="text-muted">{data.boards.length ? 'No soundboards match this filter.' : 'No soundboards in this server yet.'}</p>}
        </section>
        {boardId && (
          <aside class="card card--raised catalog-panel" aria-label="Soundboard details">
            <PanelBar kind="Soundboard" closeHref={Soundboards.guildPath(guildId)} {...paths} />
            <Pending fallback$={() => <PanelSkeleton />}>
              <BoardDetail viewerId={userId} />
            </Pending>
          </aside>
        )}
      </div>
    </>
  );
});

export default component$(() => {
  useStyles$(catalogStyles);
  useStyles$(soundStyles);
  const guild = useGuild();
  const location = useLocation();
  const loader = useGuildBoards();
  const data = loader.error || loader.pending ? null : loader.value;
  const count = data && !data.failed && data.guildId === location.params.guildId ? data.boards.length : null;

  return (
    <main class="container library">
      <header class="library__head">
        <div class="settings-head__text">
          <p class="overline">{guild.value.name}{count === null ? '' : ` · ${formatCount(count)} boards`}</p>
          <h1 class="settings-head__title">Soundboards</h1>
          <p class="text-muted">Public boards linked to this server. Play them here; make and edit your own in your profile.</p>
        </div>
        <Link href={Soundboards.myPath()} class="button button--secondary">My soundboards</Link>
      </header>
      <Pending fallback$={() => <div class="catalog-list"><RowsSkeleton label="Loading soundboards" /></div>}>
        <ServerBoards />
      </Pending>
      <Slot />
    </main>
  );
});
