import { routeLoader$ } from '@qwik.dev/router';
import { loadFailure } from './beebot.server';
import { CatalogClient } from './beebot/catalog.server';
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
  const result = await new CatalogClient(event).comments(soundId, {});
  return result.ok ? { soundId, page: result.data } : { ...loadFailure(event, result), soundId };
}, FRESH_LOADER);
