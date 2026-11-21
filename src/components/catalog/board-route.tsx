import { $, component$ } from '@qwik.dev/core';
import { useLocation, type DocumentHead } from '@qwik.dev/router';
import { boardPath, NOT_FOUND_STATUS } from '../../lib/catalog';
import { useBoardCard } from '../../lib/catalog-loaders';
import { peekValue } from '../../lib/loader-value';
import { pageHead } from '../../lib/seo';
import { useSoundsSite, useViewer } from '../../routes/sounds/layout';
import { LoadError } from '../sounds/library-states';
import { BoardPanel } from './board-panel';
import { PanelSkeleton } from './catalog-states';

export const BoardRoute = component$(() => {
  const site = useSoundsSite();
  const viewer = peekValue(useViewer());
  const loader = useBoardCard();
  const boardId = useLocation().params.boardId;
  const value = peekValue(loader);
  const current = value?.boardId === boardId ? value : undefined;

  if (current?.failed) {
    const retry = current.status === NOT_FOUND_STATUS ? undefined : $(() => loader.invalidate());
    return <div class="catalog-panel__body"><LoadError message={current.message} retrying={loader.pending} onRetry$={retry} /></div>;
  }
  if ( !current?.detail ) { return <PanelSkeleton />; }
  return (
    <BoardPanel
      key={boardId}
      detail={current.detail}
      owner={current.owner}
      mode="public"
      viewerId={viewer?.profile?.id ?? null}
      signedIn={viewer?.signedIn ?? true}
      loginHref={site.value.loginHref}
    />
  );
});

export const boardHead: DocumentHead = ({ resolveValue, url }) => {
  const data = resolveValue(useBoardCard);
  if ( data.failed ) { return { title: 'Beebot soundboards' }; }
  const { board, sounds } = data.detail;
  const by = data.owner ? ` by ${data.owner.name}` : '';
  return pageHead(url, {
    title: `${board.name} · Beebot soundboards`,
    description: `Play ${board.name}${by}: ${sounds.length} ${sounds.length === 1 ? 'sound' : 'sounds'} on the keys, on Beebot.`,
    path: boardPath(board.id),
    image: board.thumbnailUrl ?? sounds.find((sound) => sound.imageUrl)?.imageUrl ?? null,
    indexed: board.public,
  });
};
