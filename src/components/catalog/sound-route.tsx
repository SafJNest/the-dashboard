import { $, component$, useContext } from '@qwik.dev/core';
import { useLocation, type DocumentHead } from '@qwik.dev/router';
import { NOT_FOUND_STATUS, SOUNDS_PATH } from '../../lib/catalog';
import { useSoundCard } from '../../lib/catalog-loaders';
import { peekValue } from '../../lib/loader-value';
import { pageHead } from '../../lib/seo';
import { useSoundsSite, useViewer } from '../../routes/sounds/layout';
import { LoadError } from '../sounds/library-states';
import { SearchContext } from './catalog-context';
import { PanelSkeleton } from './catalog-states';
import { SoundPanel } from './sound-panel';

export const SoundRoute = component$(() => {
  const site = useSoundsSite();
  const viewer = peekValue(useViewer());
  const loader = useSoundCard();
  const search = useContext(SearchContext);
  const soundId = useLocation().params.soundId;
  const value = peekValue(loader);
  const current = value?.soundId === soundId ? value : undefined;

  if (current?.failed) {
    const retry = current.status === NOT_FOUND_STATUS ? undefined : $(() => loader.invalidate());
    return <div class="catalog-panel__body"><LoadError message={current.message} retrying={loader.pending} onRetry$={retry} /></div>;
  }

  const live = current?.sound ?? null;
  const sound = live ?? (search.preview?.id === soundId ? search.preview : null);
  if ( !sound ) { return <PanelSkeleton />; }
  return <SoundPanel key={soundId} sound={sound} live={live} loginHref={site.value.loginHref} signedIn={viewer?.signedIn ?? true} greetId={viewer?.profile?.globalGreetId ?? null} />;
});

export const soundHead: DocumentHead = ({ resolveValue, url }) => {
  const sound = resolveValue(useSoundCard).sound;
  if ( !sound ) { return { title: 'Beebot sounds' }; }
  return pageHead(url, {
    title: `${sound.name} · Beebot sounds`,
    description: `Listen to ${sound.name} by ${sound.uploader.name} on Beebot.`,
    path: `${SOUNDS_PATH}/${sound.id}/`,
    image: sound.imageUrl,
    indexed: sound.public,
  });
};
