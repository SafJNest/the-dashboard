import { component$, Slot, useStyles$ } from '@qwik.dev/core';
import { routeLoader$ } from '@qwik.dev/router';
import { BeeDefs } from '../../components/bee/bee-defs';
import { SiteFooter } from '../../components/site-footer/site-footer';
import { SiteHeader } from '../../components/site-header/site-header';
import { discordInviteUrl } from '../../lib/invite';
import styles from './site.css?inline';

export const useSiteInviteUrl = routeLoader$(({ env }) => discordInviteUrl(env.get('DISCORD_CLIENT_ID')));

export default component$(() => {
  useStyles$(styles);
  const inviteUrl = useSiteInviteUrl();

  return (
    <div class="site">
      <BeeDefs />
      <div class="site__top">
        <SiteHeader inviteUrl={inviteUrl.value} />
      </div>
      <Slot />
      <SiteFooter />
    </div>
  );
});
