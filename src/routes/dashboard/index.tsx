import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { Servers } from '../../components/dashboard/servers';
import { useAccount } from './layout';

export default component$(() => {
  const account = useAccount();
  return <Servers guilds={account.value.guilds} />;
});

export const head: DocumentHead = {
  title: 'Your servers · Beebot',
};
