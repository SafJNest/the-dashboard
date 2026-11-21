import { routeLoader$ } from '@qwik.dev/router';
import { loadFailure } from './beebot.server';
import { BeebotClient } from './beebot/client.server';
import { CatalogClient } from './beebot/catalog.server';
import { SOUND_ID, type Period } from './sounds';

export const GUILD_PERIOD: Period = '7d';
export const PROFILE_PERIOD: Period = '30d';

const DASHBOARD_LOADER = { search: [] as string[], serializationStrategy: 'always' as const, cacheControl: { private: true, maxAge: 300 }, blockSSR: false };

export const useGuildSoundLibrary = routeLoader$(async (event) => {
  const { guildId } = event.params;
  const result = await new BeebotClient(event).guildSounds(guildId, GUILD_PERIOD);
  return result.ok ? { guildId, library: result.data } : { ...loadFailure(event, result), guildId };
}, DASHBOARD_LOADER);

export const useMySounds = routeLoader$(async (event) => {
  const result = await new BeebotClient(event).mySounds(PROFILE_PERIOD);
  return result.ok ? { library: result.data } : loadFailure(event, result);
}, DASHBOARD_LOADER);

export const useSoundAnalytics = routeLoader$(async (event) => {
  const { soundId } = event.params;
  if ( !soundId || !SOUND_ID.test(soundId) ) { return { analytics: null }; }
  const result = await new BeebotClient(event).soundAnalytics(soundId, PROFILE_PERIOD);
  return result.ok ? { analytics: result.data } : loadFailure(event, result);
}, DASHBOARD_LOADER);

export const useMyBoards = routeLoader$(async (event) => {
  const result = await new CatalogClient(event).mySoundboards();
  return result.ok ? { boards: result.data } : loadFailure(event, result);
}, DASHBOARD_LOADER);
