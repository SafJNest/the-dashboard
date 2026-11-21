import { routeLoader$ } from '@qwik.dev/router';
import { loadFailure } from './beebot.server';
import { CatalogClient } from './beebot/catalog.server';
import { Soundboards } from './soundboards';
import { SOUND_ID } from './sounds';

const CACHE_SECONDS = 60;

export const CACHED_LOADER = { serializationStrategy: 'always', cacheControl: { private: true, maxAge: CACHE_SECONDS }, blockSSR: false } as const;
const FRESH_LOADER = { serializationStrategy: 'always', cacheControl: { private: true, noStore: true }, blockSSR: false } as const;

export const useSoundCard = routeLoader$(async (event) => {
  const { soundId } = event.params;
  if ( !SOUND_ID.test(soundId) ) { return { ...loadFailure(event, CatalogClient.notFound(CatalogClient.SOUND_NOT_FOUND)), soundId }; }
  const result = await new CatalogClient(event).sound(soundId);
  return result.ok ? { soundId, sound: result.data } : { ...loadFailure(event, result), soundId };
}, FRESH_LOADER);

export const useSoundComments = routeLoader$(async (event) => {
  const { soundId } = event.params;
  if ( !SOUND_ID.test(soundId) ) { return { ...loadFailure(event, CatalogClient.notFound(CatalogClient.SOUND_NOT_FOUND)), soundId }; }
  const result = await new CatalogClient(event).comments({ kind: 'sound', id: soundId }, {});
  return result.ok ? { soundId, page: result.data } : { ...loadFailure(event, result), soundId };
}, FRESH_LOADER);

export const useBoardCard = routeLoader$(async (event) => {
  const { boardId } = event.params;
  if ( !Soundboards.ID.test(boardId) ) { return { ...loadFailure(event, CatalogClient.notFound(Soundboards.NOT_FOUND)), boardId }; }
  const client = new CatalogClient(event);
  const result = await client.soundboard(boardId);
  if ( !result.ok ) { return { ...loadFailure(event, result), boardId }; }
  const { userId } = result.data.board;
  const owner = userId ? await client.creator(userId) : null;
  return { boardId, detail: result.data, owner: owner?.ok ? owner.data.user : null };
}, FRESH_LOADER);

export const useBoardComments = routeLoader$(async (event) => {
  const { boardId } = event.params;
  if ( !Soundboards.ID.test(boardId) ) { return { ...loadFailure(event, CatalogClient.notFound(Soundboards.NOT_FOUND)), boardId }; }
  const result = await new CatalogClient(event).comments({ kind: 'soundboard', id: boardId }, {});
  return result.ok ? { boardId, page: result.data } : { ...loadFailure(event, result), boardId };
}, FRESH_LOADER);
