import { component$, Pending } from '@qwik.dev/core';
import { routeAction$, routeLoader$, useLocation, type DocumentHead, type RequestHandler } from '@qwik.dev/router';
import { BoardDetail, DetailSkeleton } from '../../../../../components/soundboards/board-detail';
import { apiError, awaitLoader, isDocumentRequest, loaderResolver, loadFailure, type ApiFailure } from '../../../../../lib/beebot.server';
import { BeebotClient } from '../../../../../lib/beebot/client.server';
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from '../../../../../lib/catalog';
import { Soundboards } from '../../../../../lib/soundboards';
import { SOUND_ID } from '../../../../../lib/sounds';
import { useGuild } from '../../layout';
import { useSoundboards } from '../layout';

export interface BoardActionResult {
  ok: boolean;
  message: string | null;
}

const NOT_FOUND: ApiFailure = { ok: false, status: 404, code: 'soundboard_not_found', message: Soundboards.NOT_FOUND, retryAfter: null };
const DONE: BoardActionResult = { ok: true, message: null };
const failed = (message: string): BoardActionResult => ({ ok: false, message });
const readSoundId = (value: unknown) => (typeof value === 'string' && SOUND_ID.test(value) ? value : null);

export const useSoundboard = routeLoader$(async (event) => {
  const { guildId, boardId } = event.params;
  const result = Soundboards.ID.test(boardId) ? await new BeebotClient(event).soundboard(guildId, boardId) : NOT_FOUND;
  return result.ok ? { guildId, boardId, detail: result.data } : { ...loadFailure(event, result), guildId, boardId };
}, { search: [], serializationStrategy: 'always', cacheControl: { private: true, maxAge: 300 }, blockSSR: false });

export const onGet: RequestHandler = async (event) => {
  if ( !isDocumentRequest(event) ) { return; }
  const resolveValue = loaderResolver(event);
  const detail = resolveValue(useSoundboard);
  const boards = await awaitLoader(event, resolveValue(useSoundboards));
  if ( boards.failed ) { throw apiError(event, boards); }
  const data = await awaitLoader(event, detail);
  if ( data.failed ) { throw apiError(event, data); }
};

export const useRenameSoundboard = routeAction$(async (form, event): Promise<BoardActionResult> => {
  const { guildId, boardId } = event.params;
  const name = Soundboards.readName(form.name);
  if ( !Soundboards.ID.test(boardId) ) { return failed(Soundboards.NOT_FOUND); }
  if ( !name ) { return failed(Soundboards.INVALID_NAME); }
  const result = await new BeebotClient(event).renameSoundboard(guildId, boardId, name);
  return result.ok ? DONE : failed(`${result.message} The name was not saved.`);
}, { invalidate: [useSoundboards, useSoundboard] });

export const useAddSoundboardSound = routeAction$(async (form, event): Promise<BoardActionResult> => {
  const { guildId, boardId } = event.params;
  const soundId = readSoundId(form.soundId);
  if ( !Soundboards.ID.test(boardId) || !soundId ) { return failed(Soundboards.SOUND_NOT_AVAILABLE); }
  const result = await new BeebotClient(event).addSoundboardSound(guildId, boardId, soundId);
  return result.ok ? DONE : failed(`${result.message} The sound was not added.`);
}, { invalidate: [useSoundboards, useSoundboard] });

export const useRemoveSoundboardSound = routeAction$(async (form, event): Promise<BoardActionResult> => {
  const { guildId, boardId } = event.params;
  const soundId = readSoundId(form.soundId);
  if ( !Soundboards.ID.test(boardId) || !soundId ) { return failed(Soundboards.SOUND_NOT_AVAILABLE); }
  const result = await new BeebotClient(event).removeSoundboardSound(guildId, boardId, soundId);
  return result.ok ? DONE : failed(`${result.message} The sound was not removed.`);
}, { invalidate: [useSoundboards, useSoundboard] });

export const useSetSoundboardThumbnail = routeAction$(async (form, event): Promise<BoardActionResult> => {
  const { guildId, boardId } = event.params;
  const file = form.file;
  const isImage = file instanceof Blob && IMAGE_TYPES.includes(file.type);
  if ( !Soundboards.ID.test(boardId) ) { return failed(Soundboards.NOT_FOUND); }
  if ( !isImage ) { return failed('Choose a PNG, JPEG or GIF image.'); }
  if ( file.size > IMAGE_MAX_BYTES ) { return failed('The image must be 1 MB or smaller.'); }
  const body = new FormData();
  body.append('file', file, file instanceof File ? file.name : 'thumbnail');
  const result = await new BeebotClient(event).setSoundboardThumbnail(guildId, boardId, body);
  return result.ok ? DONE : failed(`${result.message} The thumbnail was not saved.`);
}, { invalidate: [useSoundboards, useSoundboard] });

export const useDeleteSoundboard = routeAction$(async (_, event): Promise<BoardActionResult> => {
  const { guildId, boardId } = event.params;
  if ( !Soundboards.ID.test(boardId) ) { return failed(Soundboards.NOT_FOUND); }
  const result = await new BeebotClient(event).deleteSoundboard(guildId, boardId);
  return result.ok ? DONE : failed(`${result.message} The soundboard was not deleted.`);
}, { invalidate: [useSoundboards] });

export default component$(() => {
  const location = useLocation();
  return (
    <Pending fallback$={() => <DetailSkeleton />}>
      <BoardDetail key={location.params.boardId} />
    </Pending>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useSoundboard);
  const name = data.failed ? 'Soundboards' : data.detail.board.name;
  return { title: `${resolveValue(useGuild).name} | ${name}` };
};
