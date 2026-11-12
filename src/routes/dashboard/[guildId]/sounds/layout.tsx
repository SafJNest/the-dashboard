import { component$ } from '@qwik.dev/core';
import { useLocation, type RequestHandler } from '@qwik.dev/router';
import { SoundLibrary } from '../../../../components/sounds/sound-library';
import { apiError, awaitLoader, isDocumentRequest, loaderResolver } from '../../../../lib/beebot.server';
import { SOUND_NOT_FOUND } from '../../../../lib/beebot/client.server';
import { useGuildSoundAnalytics, useGuildSoundLibrary } from '../../../../lib/sound-loaders';
import { useAccount } from '../../layout';
import { useGuild } from '../layout';

export { useGuildSoundAnalytics, useGuildSoundLibrary };

export const onGet: RequestHandler = async (event) => {
  if (!isDocumentRequest(event)) return;
  if (event.url.search) throw event.redirect(301, event.url.pathname);
  const resolveValue = loaderResolver(event);
  resolveValue(useGuildSoundAnalytics).catch(() => undefined);
  resolveValue(useAccount).catch(() => undefined);
  resolveValue(useGuild).catch(() => undefined);
  const data = await awaitLoader(event, resolveValue(useGuildSoundLibrary));
  if (data.failed) throw apiError(event, data);
  const { soundId } = event.params;
  if (soundId && !data.library.sounds.some((sound) => sound.id === soundId)) throw event.error(404, SOUND_NOT_FOUND);
};

export default component$(() => {
  const guild = useGuild();
  const location = useLocation();
  const library = useGuildSoundLibrary();
  const analytics = useGuildSoundAnalytics();
  return <SoundLibrary source={{ scope: 'guild', guildId: location.params.guildId, guildName: guild.value.name, library, analytics }} />;
});
