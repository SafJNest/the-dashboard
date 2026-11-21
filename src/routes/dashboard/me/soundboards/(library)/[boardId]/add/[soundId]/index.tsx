import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { useMyBoard } from '../../../layout';

export default component$(() => null);

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useMyBoard);
  const name = data.failed || !data.detail ? 'My soundboards' : data.detail.board.name;
  return { title: `${name} · My soundboards · Beebot` };
};
