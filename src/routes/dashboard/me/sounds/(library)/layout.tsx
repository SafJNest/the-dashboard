import { component$ } from '@qwik.dev/core';
import type { RequestHandler } from '@qwik.dev/router';
import { SoundLibrary } from '../../../../../components/sounds/sound-library';
import { apiError, awaitLoader, isDocumentRequest, loaderResolver } from '../../../../../lib/beebot.server';
import { SOUND_NOT_FOUND } from '../../../../../lib/beebot/client.server';
import { mySoundsPath, soundHref } from '../../../../../lib/sound-library';
import { useMySoundAnalytics, useMySounds } from '../../../../../lib/sound-loaders';
import { GUILD_ID } from '../../../../../lib/sounds';
import { useAccount } from '../../../layout';

export { useMySoundAnalytics, useMySounds };

const GUILD_NOT_IN_LIBRARY = "You haven't uploaded sounds in this server.";

export const onGet: RequestHandler = async (event) => {
  if (!isDocumentRequest(event)) return;
  const resolveValue = loaderResolver(event);
  const { guildId, soundId } = event.params;
  const legacyGuild = event.url.searchParams.get('guild');
  if (event.url.search) {
    const base = { basePath: mySoundsPath(guildId ?? (legacyGuild && GUILD_ID.test(legacyGuild) ? legacyGuild : null)) };
    throw event.redirect(301, soundId ? soundHref(base, soundId) : base.basePath);
  }
  if (guildId !== undefined && !GUILD_ID.test(guildId)) throw event.error(404, GUILD_NOT_IN_LIBRARY);
  resolveValue(useMySoundAnalytics).catch(() => undefined);
  resolveValue(useAccount).catch(() => undefined);
  const data = await awaitLoader(event, resolveValue(useMySounds));
  if (data.failed) throw apiError(event, data);
  const groups = data.library.guilds;
  if (guildId !== undefined && !groups.some((group) => group.guildId === guildId)) throw event.error(404, GUILD_NOT_IN_LIBRARY);
  if (soundId && !groups.some((group) => group.sounds.some((sound) => sound.id === soundId))) throw event.error(404, SOUND_NOT_FOUND);
};

export default component$(() => {
  const library = useMySounds();
  const analytics = useMySoundAnalytics();
  return <SoundLibrary source={{ scope: 'me', library, analytics }} />;
});
