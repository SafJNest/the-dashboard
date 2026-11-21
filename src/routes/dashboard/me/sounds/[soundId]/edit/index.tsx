import { component$ } from '@qwik.dev/core';
import type { RequestHandler } from '@qwik.dev/router';
import { SoundLibrary } from '../../../../../../lib/sound-library';

export const onGet: RequestHandler = ({ params, redirect }) => {
  throw redirect(301, SoundLibrary.myPath(params.soundId));
};

export default component$(() => null);
