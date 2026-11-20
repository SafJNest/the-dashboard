import { component$, Pending, Slot, useContextProvider, useStore, useStyles$, useTask$ } from '@qwik.dev/core';
import { routeAction$, routeLoader$, useLocation, type RequestHandler } from '@qwik.dev/router';
import { Icon } from '../../../../components/dashboard/icons';
import { BoardCreate } from '../../../../components/soundboards/board-create';
import { BoardList, BoardListSkeleton } from '../../../../components/soundboards/board-list';
import { closeDraft, openDraft, SoundboardDraftContext, type SoundboardDraft } from '../../../../components/soundboards/draft';
import { SoundPlayer } from '../../../../components/sounds/sound-player';
import { isDocumentRequest, loaderResolver, loadFailure } from '../../../../lib/beebot.server';
import { BeebotClient } from '../../../../lib/beebot/client.server';
import { useGuildSoundLibrary } from '../../../../lib/sound-loaders';
import { Soundboards } from '../../../../lib/soundboards';
import { useAccount } from '../../layout';
import { useGuild } from '../layout';
import soundStyles from '../../../../components/sounds/sounds.css?inline';
import styles from '../../../../components/soundboards/soundboards.css?inline';

export { useGuildSoundLibrary };

export const useSoundboards = routeLoader$(async (event) => {
  const { guildId } = event.params;
  const result = await new BeebotClient(event).soundboards(guildId);
  return result.ok ? { guildId, boards: result.data } : { ...loadFailure(event, result), guildId };
}, { search: [], serializationStrategy: 'always', cacheControl: { private: true, maxAge: 300 }, blockSSR: false });

export const onGet: RequestHandler = (event) => {
  if ( !isDocumentRequest(event) ) { return; }
  const resolveValue = loaderResolver(event);
  resolveValue(useAccount).catch(() => undefined);
  resolveValue(useGuild).catch(() => undefined);
  resolveValue(useGuildSoundLibrary).catch(() => undefined);
  resolveValue(useSoundboards).catch(() => undefined);
};

export const useCreateSoundboard = routeAction$(async (form, event): Promise<{ boardId: string | null; message: string | null }> => {
  const { guildId } = event.params;
  const name = Soundboards.readName(form.name);
  const soundIds = Soundboards.readSoundIds(form.soundIds);
  const hasValidCount = soundIds.length > 0 && soundIds.length <= Soundboards.MAX_SOUNDS;
  if ( !name ) { return { boardId: null, message: Soundboards.INVALID_NAME }; }
  if ( !hasValidCount ) { return { boardId: null, message: `Choose from 1 to ${Soundboards.MAX_SOUNDS} sounds.` }; }
  const created = await new BeebotClient(event).createSoundboard(guildId, name, soundIds);
  if ( !created.ok ) { return { boardId: null, message: `${created.message} The soundboard was not created.` }; }
  return { boardId: created.data.board.id, message: null };
}, { invalidate: [useSoundboards] });

export default component$(() => {
  useStyles$(soundStyles);
  useStyles$(styles);
  const location = useLocation();
  const guild = useGuild();
  const draft = useStore<SoundboardDraft>({ path: null, name: '', soundIds: [] });
  const isCreating = draft.path === location.url.pathname;
  useContextProvider(SoundboardDraftContext, draft);

  useTask$(({ track }) => {
    const pathname = track(() => location.url.pathname);
    const hasLeftDraft = draft.path !== null && draft.path !== pathname;
    hasLeftDraft && closeDraft(draft);
  });

  return (
    <div class="container soundboards">
      <header class="soundboards__head">
        <div class="settings-head__text">
          <p class="overline">{guild.value.name}</p>
          <h1 class="settings-head__title">Soundboards</h1>
          <p class="text-muted">Grids of up to {Soundboards.MAX_SOUNDS} sounds that members play from a message in Discord. You can change the boards you made; server administrators can change every board.</p>
        </div>
        <button
          type="button"
          class="button button--primary"
          disabled={isCreating}
          onClick$={() => openDraft(draft, location.url.pathname)}
        >
          <Icon name="plus" />
          <span>New soundboard</span>
        </button>
      </header>

      <SoundPlayer key={location.params.guildId}>
        <div class="soundboards__work">
          <Pending fallback$={() => <BoardListSkeleton />}>
            <BoardList />
          </Pending>
          <div class="soundboards__main">
            {isCreating && <BoardCreate />}
            <div hidden={isCreating}>
              <Slot />
            </div>
          </div>
        </div>
      </SoundPlayer>
    </div>
  );
});
