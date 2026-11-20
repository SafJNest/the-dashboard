import { $, component$, useSignal } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { useAccount } from '../../routes/dashboard/layout';
import { useSoundboards } from '../../routes/dashboard/[guildId]/soundboards/layout';
import { LOAD_ERROR } from '../../lib/sound-library';
import { Soundboards, type Soundboard } from '../../lib/soundboards';
import { LoadError, Skeleton } from '../sounds/library-states';

type Owner = 'all' | 'mine' | 'others';

const OWNERS: { value: Owner; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'others', label: 'Others' },
];
const SLOTS = Array.from({ length: Soundboards.MAX_SOUNDS }, (_, index) => index);
const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index);

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((word) => [...word][0]).join('').slice(0, 2).toUpperCase();

export function BoardThumb({ board, size }: { board: Pick<Soundboard, 'name' | 'thumbnailUrl'>; size: 'sm' | 'lg' }) {
  return (
    <span class={['board-thumb', `board-thumb--${size}`, board.thumbnailUrl && 'board-thumb--image']} aria-hidden="true">
      {board.thumbnailUrl ? <img src={board.thumbnailUrl} alt="" width={88} height={88} loading="lazy" /> : initials(board.name)}
    </span>
  );
}

export function BoardListSkeleton() {
  return (
    <aside class="card card--flush board-list" aria-label="Soundboards" aria-busy="true">
      <span class="visually-hidden" role="status">Loading soundboards</span>
      <div class="board-list__tools" aria-hidden="true">
        <Skeleton width="70%" height="var(--bb-control-xs)" />
      </div>
      <div class="board-list__items" aria-hidden="true">
        {SKELETON_ROWS.map((row) => (
          <div key={row} class="board-card">
            <Skeleton width="2.75rem" height="2.75rem" />
            <span class="board-card__body">
              <Skeleton width={`${45 + ((row * 17) % 40)}%`} />
              <Skeleton width="35%" height="0.5rem" />
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

export const BoardList = component$(() => {
  const location = useLocation();
  const account = useAccount();
  const soundboards = useSoundboards();
  const owner = useSignal<Owner>('all');
  const data = soundboards.error ? null : soundboards.value;
  const retry = $(() => soundboards.invalidate());

  if ( !data ) { return <LoadError message={LOAD_ERROR} retrying={soundboards.pending} onRetry$={retry} />; }
  if ( data.guildId !== location.params.guildId ) { return <BoardListSkeleton />; }
  if ( data.failed ) { return <LoadError message={data.message} retrying={soundboards.pending} onRetry$={retry} />; }

  const userId = account.value.user.id;
  const mineCount = data.boards.filter((board) => board.userId === userId).length;
  const counts: Record<Owner, number> = { all: data.boards.length, mine: mineCount, others: data.boards.length - mineCount };
  const wantsMine = owner.value === 'mine';
  const boards = owner.value === 'all' ? data.boards : data.boards.filter((board) => (board.userId === userId) === wantsMine);

  return (
    <aside class="card card--flush board-list" aria-label="Soundboards">
      <div class="board-list__tools">
        <div class="filter-tabs" role="group" aria-label="Made by">
          {OWNERS.map((item) => (
            <button key={item.value} type="button" class="filter-tabs__item" aria-pressed={owner.value === item.value} onClick$={() => (owner.value = item.value)}>
              {item.label}
              <span class="filter-tabs__count">{counts[item.value]}</span>
            </button>
          ))}
        </div>
      </div>
      <ul class="board-list__items">
        {boards.map((board) => {
          const isCurrent = board.id === location.params.boardId;
          return (
            <li key={board.id}>
              <Link href={Soundboards.path(board.guildId, board.id)} scroll={false} class="board-card" aria-current={isCurrent ? 'page' : undefined}>
                <BoardThumb board={board} size="sm" />
                <span class="board-card__body">
                  <span class="board-card__name">{board.name}</span>
                  <span class="board-card__meta">
                    {board.userId === userId && <span class="badge badge--accent">Yours</span>}
                    <span>{board.soundCount} / {Soundboards.MAX_SOUNDS} sounds</span>
                  </span>
                  <span class="board-card__slots" aria-hidden="true">
                    {SLOTS.map((slot) => (
                      <span key={slot} class={slot < board.soundCount ? 'is-filled' : undefined} />
                    ))}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {!boards.length && <p class="caption board-list__empty">{data.boards.length ? 'No soundboards match this filter.' : 'No soundboards in this server yet.'}</p>}
    </aside>
  );
});
