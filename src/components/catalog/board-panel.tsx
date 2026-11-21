import { $, component$, Slot, useSignal, useVisibleTask$ } from '@qwik.dev/core';
import { boardPath, creatorPath } from '../../lib/catalog';
import { useBoardComments } from '../../lib/catalog-loaders';
import { peekValue } from '../../lib/loader-value';
import { formatCount } from '../../lib/sound-stats';
import { Soundboards, type BoardVoteResult, type SoundboardDetail } from '../../lib/soundboards';
import type { SoundUser } from '../../lib/sounds';
import { Icon } from '../dashboard/icons';
import { BoardKeys } from '../soundboards/board-keys';
import { LoadError } from '../sounds/library-states';
import { boardKeysLabel, BoardThumb } from './board-items';
import { recordPlay, voteBoard } from './catalog-server';
import { CommentsSkeleton } from './catalog-states';
import { Comments } from './comments';
import { CopyCommand, CopyLink } from './copy-buttons';
import { LoginGate } from './login-gate';
import { revealPanel } from './panel-bar';
import { PersonAvatar } from './sound-items';

const VOTE_FAILED = 'Your like could not be sent. Please try again.';

interface BoardHeadProps {
  detail: SoundboardDetail;
  owner: SoundUser | null;
  isMine: boolean;
  editing?: boolean;
}

export const BoardHead = component$<BoardHeadProps>(({ detail, owner, isMine, editing = false }) => {
  const { board, sounds } = detail;
  return (
    <div class="board-head">
      <BoardThumb board={board} size="lg" />
      <div class="sound-card__meta">
        <span class="caption">Soundboard</span>
        {editing ? <Slot name="title" /> : <h2 class="display sound-card__title">{board.name}</h2>}
        <span class="catalog-who">
          {isMine && <span class="catalog-who__you">You</span>}
          {!isMine && owner && (
            <span>
              <a href={creatorPath(owner.id)} class="board-head__owner">
                <PersonAvatar user={owner} size={16} />
                {owner.name}
              </a>
            </span>
          )}
          <span>{boardKeysLabel(sounds.length)}</span>
          {!board.public && <span><span class="badge">Private</span></span>}
        </span>
      </div>
    </div>
  );
});

export const SaveCopy = () => (
  <span class="catalog-soon">
    <button type="button" class="button button--secondary" disabled title="Coming soon">
      <Icon name="copy" />Save a copy
    </button>
    <span class="badge">Coming soon</span>
  </span>
);

const BoardComments = component$<{ boardId: string; count: number; owned: boolean; signedIn: boolean; loginHref: string }>(({ boardId, count, owned, signedIn, loginHref }) => {
  const loader = useBoardComments();
  const value = peekValue(loader);
  const current = value?.boardId === boardId ? value : undefined;
  if ( current?.failed ) { return <LoadError message={current.message} retrying={loader.pending} onRetry$={$(() => loader.invalidate())} />; }
  if ( !current?.page ) { return <CommentsSkeleton />; }
  return <Comments key={boardId} target={{ kind: 'soundboard', id: boardId }} commentCount={count} seed={current.page} signedIn={signedIn} soundOwned={owned} loginHref={loginHref} />;
});

interface BoardPanelProps {
  detail: SoundboardDetail;
  mode: 'public' | 'server';
  owner: SoundUser | null;
  viewerId: string | null;
  signedIn: boolean;
  loginHref: string;
}

export const BoardPanel = component$<BoardPanelProps>(({ detail, mode, owner, viewerId, signedIn, loginHref }) => {
  const { board, sounds } = detail;
  const voted = useSignal<BoardVoteResult | null>(null);
  const voting = useSignal(false);
  const gate = useSignal(false);
  const error = useSignal<string | null>(null);
  const isMine = viewerId !== null && board.userId === viewerId;
  const votes = voted.value ?? { likes: board.likes, vote: board.vote };
  const panel = useSignal<HTMLElement>();

  useVisibleTask$(() => revealPanel(panel.value), { strategy: 'document-ready' });

  const like = $(async () => {
    if ( !signedIn ) { gate.value = true; return; }
    if ( voting.value ) { return; }
    voting.value = true;
    error.value = null;
    const result = await voteBoard(board.id, votes.vote === 'LIKE' ? null : 'LIKE').catch(() => null);
    voting.value = false;
    if ( !result?.ok ) { error.value = result?.message ?? VOTE_FAILED; return; }
    voted.value = result.data;
  });

  const played = $((soundId: string) => {
    recordPlay(soundId, crypto.randomUUID(), board.id).then(
      (result) => !result.ok && console.error('[BoardPanel] Play not recorded.', result.message),
      (failure: unknown) => console.error('[BoardPanel] Play not recorded.', failure),
    );
  });

  return (
    <article ref={panel} class="catalog-panel__body board-panel" aria-label={board.name}>
      <header class="board-panel__head">
        <BoardHead detail={detail} owner={owner} isMine={isMine} />
        <div class="board-panel__actions">
          {mode === 'public' && (
            <div class="catalog-anchor">
              <div class="catalog-react" role="group" aria-label={`Like ${board.name}`} aria-busy={voting.value}>
                <button type="button" class="catalog-react__button" aria-pressed={votes.vote === 'LIKE'} aria-label={`Like, ${votes.likes} likes`} onClick$={like}>
                  <Icon name="heart" />{formatCount(votes.likes)}
                </button>
              </div>
              {gate.value && <LoginGate title="Log in to like soundboards" text="Likes help good boards get found. One click with Discord." loginHref={loginHref} onClose$={() => (gate.value = false)} />}
            </div>
          )}
          <CopyCommand command={Soundboards.command(board.id)} />
          {board.public && <CopyLink path={boardPath(board.id)} />}
          {mode === 'server' && board.public && <a href={boardPath(board.id)} class="button button--secondary"><Icon name="link" />Public page</a>}
          {isMine && <a href={Soundboards.myPath(board.id)} class="button button--secondary"><Icon name="edit" />{mode === 'public' ? 'Manage' : 'Edit in My soundboards'}</a>}
          {!isMine && <SaveCopy />}
        </div>
      </header>
      {error.value && <p class="callout callout--danger" role="alert">{error.value}</p>}
      {sounds.length > 0 ? (
        <BoardKeys key={board.id} boardName={board.name} sounds={sounds} onPlayed$={played} />
      ) : (
        <p class="text-muted">This soundboard has no sounds you can play.</p>
      )}
      {mode === 'public' && <BoardComments boardId={board.id} count={board.commentCount} owned={isMine} signedIn={signedIn} loginHref={loginHref} />}
    </article>
  );
});
