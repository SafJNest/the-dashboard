import { component$, useStyles$ } from '@qwik.dev/core';
import { routeLoader$, type DocumentHead } from '@qwik.dev/router';
import { BeeDefs } from '../components/bee/bee-defs';
import { CallToAction } from '../components/landing/call-to-action';
import { Features } from '../components/landing/features';
import { Hero } from '../components/landing/hero';
import { SiteFooter } from '../components/site-footer/site-footer';
import { SiteHeader } from '../components/site-header/site-header';
import { discordInviteUrl } from '../lib/invite';
import styles from './landing.css?inline';

export const useInviteUrl = routeLoader$(({ env }) => discordInviteUrl(env.get('DISCORD_CLIENT_ID')));

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
        <div class="landing__scene">
          <svg class="landing__comb" aria-hidden="true">
            <defs>
              <pattern id="landing-comb" width="34.64" height="60" patternUnits="userSpaceOnUse">
                <path class="landing__comb-cell" d="M17.32 0V10L34.64 20V40L17.32 50V60M17.32 10L0 20V40L17.32 50" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#landing-comb)" />
          </svg>
          <Hero inviteUrl={inviteUrl.value} />
          <Features />
        </div>
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
