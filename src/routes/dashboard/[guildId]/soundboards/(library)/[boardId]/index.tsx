import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { useGuild } from '../../../layout';
import { useGuildBoard } from '../layout';

export default component$(() => null);

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useGuildBoard);
  const name = data.failed || !data.detail ? 'Soundboards' : data.detail.board.name;
  return { title: `${resolveValue(useGuild).name} | ${name}` };
};
