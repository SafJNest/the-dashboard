import { component$, useContext } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { formatCompact } from '../../lib/sound-stats';
import { Soundboards, type Soundboard } from '../../lib/soundboards';
import { Icon } from '../dashboard/icons';
import { SearchContext } from './catalog-context';
import { Highlight } from './sound-items';

const KEY_ROWS = [10, 9, 7];

interface BoardThumbProps {
  board: Pick<Soundboard, 'thumbnailUrl'>;
  size?: 'sm' | 'lg' | 'fill';
}

export function BoardThumb({ board, size }: BoardThumbProps) {
  return (
    <span class={['sound-thumb', 'board-thumb', size && `sound-thumb--${size}`]} aria-hidden="true">
      {board.thumbnailUrl ? <img src={board.thumbnailUrl} alt="" width={88} height={88} loading="lazy" /> : <Icon name="soundboards" />}
    </span>
  );
}

export function KeyMap({ count }: { count: number }) {
  let slot = 0;
  return (
    <span class="keymap" aria-hidden="true">
      {KEY_ROWS.map((length, row) => (
        <span key={row} class="keymap__row">
          {Array.from({ length }, (_, index) => {
            const isStop = row === KEY_ROWS.length - 1 && index === length - 1;
            const isFilled = !isStop && slot < count;
            !isStop && slot++;
            return <span key={index} class={['keymap__dot', isFilled && 'keymap__dot--on', isStop && 'keymap__dot--stop']} />;
          })}
        </span>
      ))}
    </span>
  );
}

interface BoardRowProps {
  board: Soundboard;
  href: string;
  current: boolean;
  viewerId: string | null;
  query?: string;
  detail?: string | null;
}

export const BoardRow = component$<BoardRowProps>(({ board, href, current, viewerId, query = '', detail = null }) => {
  const isMine = viewerId !== null && board.userId === viewerId;
  const meta = [isMine ? 'You' : null, detail, board.soundCount === null ? null : `${board.soundCount} sounds`].filter(Boolean).join(' · ');
  return (
    <div class="catalog-row board-row" aria-current={current ? 'page' : undefined}>
      <Link href={href} class="catalog-row__link" aria-label={`Open soundboard ${board.name}`} prefetchData="off" scroll={false} />
      <BoardThumb board={board} />
      <span class="catalog-row__main">
        <span class="catalog-row__title">
          <Highlight text={board.name} query={query} />
          {!board.public && <span class="badge">Private</span>}
        </span>
        <span class="catalog-who">
          <span>Soundboard</span>
          {meta && <span class={isMine ? 'catalog-who__you' : undefined}>{meta}</span>}
        </span>
      </span>
      {board.soundCount !== null && <KeyMap count={board.soundCount} />}
      <span class="catalog-row__nums">
        <span class="catalog-row__optional"><Icon name="play" />{formatCompact(board.plays)}</span>
        <span><Icon name="heart" />{formatCompact(board.likes)}</span>
      </span>
    </div>
  );
});

export const BoardTile = component$<{ board: Soundboard; href: string }>(({ board, href }) => {
  const search = useContext(SearchContext);
  const count = board.soundCount === null ? '' : ` · ${board.soundCount} sounds`;
  return (
    <Link href={href} class="catalog-tile" prefetchData="off" scroll={false} onClick$={() => (search.preview = null)}>
      <BoardThumb board={board} size="fill" />
      <span class="catalog-name">{board.name}</span>
      <span class="catalog-who">
        <Icon name="soundboards" />
        <span>Soundboard{count}</span>
      </span>
      <span class="caption">{formatCompact(board.plays)} plays · {formatCompact(board.likes)} likes</span>
    </Link>
  );
});

export function boardKeysLabel(count: number) {
  return `${count} of ${Soundboards.MAX_SOUNDS} keys`;
}
