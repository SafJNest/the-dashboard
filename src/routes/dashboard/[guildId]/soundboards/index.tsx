import { component$, Pending, useContext } from '@qwik.dev/core';
import { useLocation, type DocumentHead, type RequestHandler } from '@qwik.dev/router';
import { EmptyState } from '../../../../components/empty-state/empty-state';
import { openDraft, SoundboardDraftContext } from '../../../../components/soundboards/draft';
import { apiError, awaitLoader, isDocumentRequest, loaderResolver } from '../../../../lib/beebot.server';
import { useGuild } from '../layout';
import { useSoundboards } from './layout';

export const onGet: RequestHandler = async (event) => {
  if ( !isDocumentRequest(event) ) { return; }
  const data = await awaitLoader(event, loaderResolver(event)(useSoundboards));
  if ( data.failed ) { throw apiError(event, data); }
};

const BoardPrompt = component$(() => {
  const location = useLocation();
  const soundboards = useSoundboards();
  const draft = useContext(SoundboardDraftContext);
  const data = soundboards.error ? null : soundboards.value;
  const isReady = data !== null && !data.failed && data.guildId === location.params.guildId;
  if ( !isReady ) { return null; }
  const hasBoards = data.boards.length > 0;

  return (
    <div class="card sounds__empty">
      <EmptyState icon="soundboards" title={hasBoards ? 'Choose a soundboard' : 'No soundboards yet'} flight="patrol">
        {hasBoards ? 'Pick a board from the list to play its sounds and see what is on it.' : 'Create the first board for this server with up to 25 of its sounds.'}
        {!hasBoards && (
          <button q:slot="actions" type="button" class="button button--secondary" onClick$={() => openDraft(draft, location.url.pathname)}>
            New soundboard
          </button>
        )}
      </EmptyState>
    </div>
  );
});

export default component$(() => (
  <Pending fallback$={() => null}>
    <BoardPrompt />
  </Pending>
));

export const head: DocumentHead = ({ resolveValue }) => ({
  title: `${resolveValue(useGuild).name} | Soundboards`,
});
