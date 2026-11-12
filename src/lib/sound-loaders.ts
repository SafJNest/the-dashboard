import { routeLoader$ } from '@qwik.dev/router';
import { loadFailure } from './beebot.server';
import { BeebotClient } from './beebot/client.server';
import { readPeriod } from './sounds';

export const useGuildSoundLibrary = routeLoader$(async (event) => {
  const { guildId } = event.params;
  const period = readPeriod(event.url.searchParams.get('period'));
  const result = await new BeebotClient(event).guildSounds(guildId, period);
  return result.ok ? { period, guildId, library: result.data } : { ...loadFailure(event, result), period, guildId };
}, { search: ['period'], serializationStrategy: 'always', cacheControl: { private: true, maxAge: 300 }, blockSSR: false });

export const useGuildSoundAnalytics = routeLoader$(async (event) => {
  const { guildId } = event.params;
  const period = readPeriod(event.url.searchParams.get('period'));
  const result = await new BeebotClient(event).guildSoundAnalytics(guildId, period);
  return result.ok ? { period, guildId, analytics: result.data } : { ...loadFailure(event, result), period, guildId };
}, { search: ['period'], serializationStrategy: 'always', cacheControl: { private: true, maxAge: 300 }, blockSSR: false });

export const useMySounds = routeLoader$(async (event) => {
  const period = readPeriod(event.url.searchParams.get('period'));
  const result = await new BeebotClient(event).mySounds(period);
  return result.ok ? { period, guildId: null, library: result.data } : { ...loadFailure(event, result), period, guildId: null };
}, { search: ['period'], serializationStrategy: 'always', cacheControl: { private: true, maxAge: 300 }, blockSSR: false });

export const useMySoundAnalytics = routeLoader$(async (event) => {
  const period = readPeriod(event.url.searchParams.get('period'));
  const result = await new BeebotClient(event).mySoundAnalytics(period);
  return result.ok ? { period, guildId: null, analytics: result.data } : { ...loadFailure(event, result), period, guildId: null };
}, { search: ['period'], serializationStrategy: 'always', cacheControl: { private: true, maxAge: 300 }, blockSSR: false });
