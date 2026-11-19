import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';

export default component$(() => null);

export const head: DocumentHead = {
  title: 'Beebot sounds',
  meta: [{ name: 'description', content: 'Search and listen to public Beebot sounds from every server.' }],
};
