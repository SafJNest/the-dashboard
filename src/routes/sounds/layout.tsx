import { component$, Slot, useStyles$ } from '@qwik.dev/core';
import { routeAction$, routeLoader$, type RequestHandler } from '@qwik.dev/router';
import { BeeDefs } from '../../components/bee/bee-defs';
import { SiteFooter } from '../../components/site-footer/site-footer';
import { SiteHeader } from '../../components/site-header/site-header';
import { SoundPlayer } from '../../components/sounds/sound-player';
import { LOGIN_REQUIRED } from '../../lib/beebot.server';
import { CatalogClient } from '../../lib/beebot/catalog.server';
import { CACHED_LOADER } from '../../lib/catalog-loaders';
import { discordInviteUrl } from '../../lib/invite';
import { peekValue } from '../../lib/loader-value';
import { SOUND_ID } from '../../lib/sounds';
import catalogStyles from '../../components/catalog/catalog.css?inline';
import siteStyles from '../(site)/site.css?inline';

const GREET_FAILED = 'Beebot could not use this sound as your greet.';

export interface GreetResult {
  soundId: string | null;
  ok: boolean;
  message: string | null;
}

export const useSoundsSite = routeLoader$((event) => {
  return {
    loginHref: '/auth/login/',
    inviteUrl: discordInviteUrl(event.env.get('DISCORD_CLIENT_ID')),
  };
}, { serializationStrategy: 'always', cacheControl: 'immutable' });

export const useViewer = routeLoader$(async (event) => {
  const result = await new CatalogClient(event).viewer();
  if ( result.ok ) { return { signedIn: true, profile: result.data }; }
  const signedIn = result.code !== LOGIN_REQUIRED.code;
  signedIn && event.headers.set('Cache-Control', 'no-store');
  return { signedIn, profile: null };
}, CACHED_LOADER);

export const onRequest: RequestHandler = (event) => {
  const vary = event.headers.get('Vary');
  if ( event.internalRequest === 'loader' ) { event.headers.set('Vary', vary ? `${vary}, Cookie` : 'Cookie'); return; }
  event.headers.set('Cache-Control', 'private, no-store');
};

export const useGlobalGreet = routeAction$(async (form, event): Promise<GreetResult> => {
  const soundId = typeof form.soundId === 'string' && form.soundId ? form.soundId : null;
  if ( soundId !== null && !SOUND_ID.test(soundId) ) { return { soundId, ok: false, message: GREET_FAILED }; }
  const result = await new CatalogClient(event).setGlobalGreet(soundId);
  if ( !result.ok ) { return { soundId, ok: false, message: result.message }; }
  return result.data ? { soundId, ok: true, message: null } : { soundId, ok: false, message: GREET_FAILED };
}, { invalidate: [useViewer] });

export default component$(() => {
  useStyles$(siteStyles);
  useStyles$(catalogStyles);
  const site = useSoundsSite();
  const viewer = peekValue(useViewer());

  return (
    <div class="site">
      <BeeDefs />
      <div class="site__top">
        <SiteHeader inviteUrl={site.value.inviteUrl} account={viewer?.profile ?? null} signedIn={viewer?.signedIn ?? true} />
      </div>
      <main class="catalog-page">
        <SoundPlayer>
          <Slot />
        </SoundPlayer>
      </main>
      <SiteFooter />
    </div>
  );
});
