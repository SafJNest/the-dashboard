import { routeAction$, routeLoader$, server$ } from '@qwik.dev/router';
import { loadFailure } from './beebot.server';
import { BeebotClient } from './beebot/client.server';
import { CatalogClient } from './beebot/catalog.server';
import { Soundboards } from './soundboards';
import { PROFILE_PERIOD, useMyBoards } from './sound-loaders';
import { SOUND_ID } from './sounds';

export interface BoardActionResult {
  ok: boolean;
  message: string | null;
}

const DONE: BoardActionResult = { ok: true, message: null };
const BOARD_LOADER = { search: [] as string[], serializationStrategy: 'always' as const, cacheControl: { private: true, noStore: true }, blockSSR: false };

const failed = (message: string): BoardActionResult => ({ ok: false, message });
const readSoundId = (value: unknown) => (typeof value === 'string' && SOUND_ID.test(value) ? value : null);

export const loadBoardSounds = server$(function () {
  return new CatalogClient(this).mySounds(PROFILE_PERIOD);
});

export const useMyBoard = routeLoader$(async (event) => {
  const { boardId } = event.params;
  if ( !boardId ) { return { boardId: null, detail: null }; }
  const result = Soundboards.ID.test(boardId) ? await new BeebotClient(event).soundboard(boardId) : CatalogClient.notFound(Soundboards.NOT_FOUND);
  return result.ok ? { boardId, detail: result.data } : { ...loadFailure(event, result), boardId };
}, BOARD_LOADER);

export const usePlacingSound = routeLoader$(async (event) => {
  const { soundId } = event.params;
  if ( !soundId ) { return { soundId: null, name: null }; }
  const result = SOUND_ID.test(soundId) ? await new CatalogClient(event).sound(soundId) : CatalogClient.notFound(CatalogClient.SOUND_NOT_FOUND);
  return result.ok ? { soundId, name: result.data.name } : { ...loadFailure(event, result), soundId };
}, BOARD_LOADER);

export const useCreateBoard = routeAction$(async (form, event): Promise<BoardActionResult> => {
  const name = Soundboards.readName(form.name);
  const soundIds = Soundboards.readSoundIds(form.soundIds);
  const hasValidCount = soundIds.length > 0 && soundIds.length <= Soundboards.MAX_SOUNDS;
  if ( !name ) { return failed(Soundboards.INVALID_NAME); }
  if ( !hasValidCount ) { return failed(`Choose from 1 to ${Soundboards.MAX_SOUNDS} sounds.`); }
  const created = await new CatalogClient(event).createSoundboard(name, soundIds);
  if ( !created.ok ) { return failed(`${created.message} The soundboard was not created.`); }
  throw event.redirect(303, Soundboards.myPath(created.data.board.id));
}, { invalidate: [useMyBoards] });

export const useUpdateBoard = routeAction$(async (form, event): Promise<BoardActionResult> => {
  const { boardId } = event.params;
  const name = Soundboards.readName(form.name);
  if ( !boardId || !Soundboards.ID.test(boardId) ) { return failed(Soundboards.NOT_FOUND); }
  if ( !name ) { return failed(Soundboards.INVALID_NAME); }
  const result = await new BeebotClient(event).updateSoundboard(boardId, { name, public: form.public === 'true' });
  return result.ok ? DONE : failed(`${result.message} Your changes were not saved.`);
}, { invalidate: [useMyBoards, useMyBoard] });

export const useArrangeBoard = routeAction$(async (form, event): Promise<BoardActionResult> => {
  const { boardId } = event.params;
  const soundIds = Soundboards.readSoundIds(form.soundIds);
  if ( !boardId || !Soundboards.ID.test(boardId) ) { return failed(Soundboards.NOT_FOUND); }
  if ( soundIds.length > Soundboards.MAX_SOUNDS ) { return failed(Soundboards.FULL); }
  const result = await new BeebotClient(event).updateSoundboard(boardId, { sortMode: 'MANUAL', soundIds });
  return result.ok ? DONE : failed(`${result.message} The keys were not changed.`);
}, { invalidate: [useMyBoard] });

export const useAddBoardSound = routeAction$(async (form, event): Promise<BoardActionResult> => {
  const { boardId } = event.params;
  const soundId = readSoundId(form.soundId);
  if ( !boardId || !Soundboards.ID.test(boardId) || !soundId ) { return failed(Soundboards.SOUND_NOT_AVAILABLE); }
  const result = await new BeebotClient(event).addSoundboardSound(boardId, soundId);
  return result.ok ? DONE : failed(`${result.message} The sound was not added.`);
}, { invalidate: [useMyBoards, useMyBoard] });

export const useRemoveBoardSound = routeAction$(async (form, event): Promise<BoardActionResult> => {
  const { boardId } = event.params;
  const soundId = readSoundId(form.soundId);
  if ( !boardId || !Soundboards.ID.test(boardId) || !soundId ) { return failed(Soundboards.SOUND_NOT_AVAILABLE); }
  const result = await new BeebotClient(event).removeSoundboardSound(boardId, soundId);
  return result.ok ? DONE : failed(`${result.message} The sound was not removed.`);
}, { invalidate: [useMyBoards, useMyBoard] });

export const useDeleteBoard = routeAction$(async (_, event): Promise<BoardActionResult> => {
  const { boardId } = event.params;
  if ( !boardId || !Soundboards.ID.test(boardId) ) { return failed(Soundboards.NOT_FOUND); }
  const result = await new BeebotClient(event).deleteSoundboard(boardId);
  if ( !result.ok ) { return failed(`${result.message} The soundboard was not deleted.`); }
  throw event.redirect(303, Soundboards.myPath());
}, { invalidate: [useMyBoards] });
