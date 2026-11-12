import { component$ } from '@qwik.dev/core';
import type { DocumentHead, RequestHandler } from '@qwik.dev/router';
import { SOUND_ID } from '../../../../../../lib/sounds';
import { useMySounds } from '../layout';

export const onGet: RequestHandler = ({ params, error }) => {
  if (!SOUND_ID.test(params.soundId)) throw error(404, "This sound doesn't exist, or you can't see it.");
};

export default component$(() => null);

export const head: DocumentHead = ({ resolveValue, params }) => {
  const sound = resolveValue(useMySounds).library.guilds.flatMap((group) => group.sounds).find((item) => item.id === params.soundId);
  return { title: `${sound ? sound.name : 'My sounds'} · Beebot` };
};
