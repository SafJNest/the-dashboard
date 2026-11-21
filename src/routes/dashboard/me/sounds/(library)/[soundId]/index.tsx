import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { SoundLibrary } from '../../../../../../lib/sound-library';
import { useMySounds } from '../layout';

export default component$(() => null);

export const head: DocumentHead = ({ resolveValue, params }) => {
  const data = resolveValue(useMySounds);
  const sound = data.failed ? undefined : SoundLibrary.myEntries(data.library).find((entry) => entry.sound.id === params.soundId)?.sound;
  return { title: sound ? `${sound.name} · My sounds · Beebot` : 'My sounds · Beebot' };
};
