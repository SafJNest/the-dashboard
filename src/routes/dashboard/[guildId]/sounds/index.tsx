import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { useGuild } from '../layout';

export default component$(() => null);

export const head: DocumentHead = ({ resolveValue }) => ({
  title: `${resolveValue(useGuild).name} | Sounds`,
});
