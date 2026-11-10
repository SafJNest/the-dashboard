import { component$, useStyles$ } from '@qwik.dev/core';
import { routeLoader$, type DocumentHead } from '@qwik.dev/router';
import { BeeDefs } from '../components/bee/bee-defs';
import { CallToAction } from '../components/landing/call-to-action';
import { Features } from '../components/landing/features';
import { Hero } from '../components/landing/hero';
import { SiteFooter } from '../components/site-footer/site-footer';
import { SiteHeader } from '../components/site-header/site-header';
import styles from './landing.css?inline';

export const useInviteUrl = routeLoader$(({ env }) => {
  const clientId = env.get('DISCORD_CLIENT_ID');
  if (!clientId) {
    return null;
  }
  const params = new URLSearchParams({ client_id: clientId, scope: 'bot applications.commands' });
  return `https://discord.com/oauth2/authorize?${params}`;
});

export default component$(() => {
  useStyles$(styles);
  const inviteUrl = useInviteUrl();

  return (
    <div class="landing">
      <BeeDefs />
      <div class="landing__top">
        <SiteHeader inviteUrl={inviteUrl.value} />
      </div>
      <main>
        <Hero inviteUrl={inviteUrl.value} />
        <Features />
        <CallToAction inviteUrl={inviteUrl.value} />
      </main>
      <SiteFooter />
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Beebot — One hive. Every server.',
  meta: [
    {
      name: 'description',
      content: 'Welcome messages, levels, leaderboards and soundboards for your Discord server, run by a swarm of 500 nodes.',
    },
  ],
};
