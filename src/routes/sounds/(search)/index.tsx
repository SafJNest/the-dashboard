import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { SOUNDS_PATH } from '../../../lib/catalog';
import { pageHead } from '../../../lib/seo';

export default component$(() => null);

export const head: DocumentHead = ({ url }) => pageHead(url, {
  title: 'Beebot sounds',
  description: 'Search and listen to public Beebot sounds from every server.',
  path: `${SOUNDS_PATH}/`,
});
