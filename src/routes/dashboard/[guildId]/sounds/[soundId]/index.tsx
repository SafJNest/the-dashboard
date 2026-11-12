import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { useGuild } from '../../layout';
import { useGuildSoundLibrary } from '../layout';

export default component$(() => null);

export const head: DocumentHead = ({ resolveValue, params }) => {
  const data = resolveValue(useGuildSoundLibrary);
  const sound = data.failed ? undefined : data.library.sounds.find((item) => item.id === params.soundId);
  return { title: `${resolveValue(useGuild).name} | ${sound ? sound.name : 'Sounds'}` };
};
