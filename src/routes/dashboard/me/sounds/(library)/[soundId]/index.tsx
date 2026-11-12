import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { mySoundTitle } from '../../../../../../lib/sound-library';
import { useMySounds } from '../layout';

export default component$(() => null);

export const head: DocumentHead = ({ resolveValue, params }) => ({
  title: mySoundTitle(resolveValue(useMySounds), params),
});
