import { component$ } from '@qwik.dev/core';
import { routeLoader$, useLocation } from '@qwik.dev/router';
import { SoundLibrary } from '../../../../components/sounds/sound-library';
import { apiError } from '../../../../lib/beebot.server';
import { BeebotClient } from '../../../../lib/beebot/client.server';
import { guildLibraryModel } from '../../../../lib/sound-library';
import { readPeriod } from '../../../../lib/sounds';
import { useGuild } from '../layout';

export const useGuildSounds = routeLoader$(async (event) => {
  const { guildId } = event.params;
  const period = readPeriod(event.url.searchParams.get('period'));
  const client = new BeebotClient(event);
  const [library, analytics] = await Promise.all([client.guildSounds(guildId, period), client.guildSoundAnalytics(guildId, period)]);
  if (!library.ok) throw apiError(event, library);
  if (!analytics.ok) throw apiError(event, analytics);
  return { period, library: library.data, analytics: analytics.data };
}, { search: ['period'], serializationStrategy: 'always', cacheControl: { private: true, maxAge: 300 } });

export default component$(() => {
  const data = useGuildSounds();
  const guild = useGuild();
  const location = useLocation();
  return <SoundLibrary model={guildLibraryModel(data.value, location.url, location.params.soundId, guild.value.name)} />;
});
