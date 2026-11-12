import { $, component$, Slot, useOnDocument, useOnWindow, useSignal, useStyles$, useTask$ } from '@qwik.dev/core';
import { isBrowser } from '@qwik.dev/core/build';
import { routeAction$, routeLoader$, useLocation, type RequestHandler } from '@qwik.dev/router';
import { AppHeader } from '../../components/dashboard/app-header';
import { DocumentRecovery } from '../../components/dashboard/document-recovery';
import { NAVIGATION_CANCELLED } from '../../components/dashboard/unsaved-guard';
import type { DashboardGuild, DashboardUser } from '../../components/dashboard/servers';
import { apiError, loginRedirect, SESSION_COOKIE } from '../../lib/beebot.server';
import { BeebotClient } from '../../lib/beebot/client.server';
import { pageKey } from '../../lib/dashboard-path';
import { useGuildSoundLibrary, useMySounds } from '../../lib/sound-loaders';
import { GLOBAL_GREET, GUILD_ID, SOUND_ID, type FieldError, type Greets, type VoteState } from '../../lib/sounds';
import styles from './dashboard.css?inline';

export const onRequest: RequestHandler = (event) => {
  if (!event.cookie.get(SESSION_COOKIE)?.value) throw loginRedirect(event);
  if (event.internalRequest === 'loader') event.headers.set('Vary', 'Cookie');
  else event.headers.set('Cache-Control', 'private, no-store');
};

export const useAccount = routeLoader$(async (event) => {
  const result = await new BeebotClient(event).account();
  if (!result.ok) throw apiError(event, result);
  const { user, servers, greets } = result.data;
  const account: { user: DashboardUser; guilds: DashboardGuild[]; greets: Greets } = {
    user: { name: user.globalName || user.username, avatarUrl: user.avatarUrl },
    guilds: servers,
    greets,
  };
  return account;
}, { search: [], serializationStrategy: 'always', cacheControl: { private: true, maxAge: 300 } });

export interface VoteResult {
  soundId: string;
  state: VoteState | null;
  message: string | null;
}

export const useVoteSound = routeAction$(async (form, event): Promise<VoteResult> => {
  const soundId = typeof form.soundId === 'string' ? form.soundId : '';
  const vote = form.vote;
  if (!SOUND_ID.test(soundId) || (vote !== 'like' && vote !== 'dislike')) return { soundId, state: null, message: 'This vote is not valid.' };
  const result = await new BeebotClient(event).setVote(soundId, vote, form.enabled === 'true');
  return result.ok ? { soundId, state: result.data, message: null } : { soundId, state: null, message: result.message };
}, { invalidate: [useGuildSoundLibrary, useMySounds] });

export interface GreetResult {
  key: string;
  target: string;
  ok: boolean;
  errors: FieldError[];
  message: string | null;
}

export const useSaveGreet = routeAction$(async (form, event): Promise<GreetResult> => {
  const key = typeof form.key === 'string' ? form.key : '';
  const target = typeof form.target === 'string' ? form.target : '';
  const soundId = typeof form.soundId === 'string' && form.soundId ? form.soundId : null;
  if ((key !== GLOBAL_GREET && !GUILD_ID.test(key)) || (soundId !== null && !SOUND_ID.test(soundId))) {
    return { key, target, ok: false, errors: [], message: 'This greet is not valid.' };
  }
  const result = await new BeebotClient(event).saveGreets({ [key]: soundId });
  if (!result.ok) return { key, target, ok: false, errors: [], message: `${result.message} The greet was not saved.` };
  const entry = result.data[key];
  if (!entry) return { key, target, ok: false, errors: [], message: 'The greet was not saved. Please try again.' };
  return { key, target, ok: entry.ok, errors: entry.errors, message: entry.ok ? null : 'The greet was not saved.' };
}, { invalidate: [useAccount] });

const focusRequest = { href: '', page: false, done: true };

function clearPendingLinks() {
  for (const link of document.querySelectorAll('a[q\\:link][aria-busy="true"]')) link.removeAttribute('aria-busy');
}

export default component$(() => {
  useStyles$(styles);
  const account = useAccount();
  const location = useLocation();
  const pending = useSignal<string | null>(null);

  useOnDocument('click', $((event) => {
    const click = event as MouseEvent;
    if (click.button !== 0 || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return;
    const link = (click.target as Element | null)?.closest?.('a[q\\:link][href]') as HTMLAnchorElement | null;
    if (!link || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin || url.pathname + url.search === window.location.pathname + window.location.search) return;
    clearPendingLinks();
    link.setAttribute('aria-busy', 'true');
    pending.value = url.pathname + url.search;
  }));

  useOnWindow(NAVIGATION_CANCELLED, $(() => {
    clearPendingLinks();
    pending.value = null;
  }));

  useOnWindow('popstate', $(() => {
    clearPendingLinks();
    pending.value = window.location.pathname + window.location.search;
  }));

  useTask$(({ track }) => {
    const href = track(() => location.url.pathname + location.url.search);
    const navigating = track(() => location.isNavigating);
    if (!isBrowser || pending.value === null) return;
    if (href === pending.value || !navigating) {
      pending.value = null;
      clearPendingLinks();
    }
  });

  useTask$(({ track, cleanup }) => {
    const href = track(() => location.url.pathname + location.url.search);
    const navigating = track(() => location.isNavigating);
    const previous = location.prevUrl;
    if (!isBrowser || !previous) return;
    if (href !== focusRequest.href) {
      focusRequest.href = href;
      focusRequest.page = pageKey(previous.pathname) !== pageKey(location.url.pathname);
      focusRequest.done = false;
    }
    if (focusRequest.done || (focusRequest.page && navigating)) return;
    focusRequest.done = true;
    const samePage = !focusRequest.page;
    const restore = () => {
      const active = document.activeElement;
      if (samePage) {
        if (active && active !== document.body) return false;
        document.querySelector<HTMLElement>(`.dashboard a[href="${CSS.escape(href)}"]`)?.focus({ preventScroll: true });
        return false;
      }
      const title = document.querySelector<HTMLElement>('.dashboard h1');
      if (!title || document.querySelector('.dashboard .page-skeleton')) return false;
      if (active && active !== document.body && !active.closest('a[href]')) return true;
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
      return true;
    };
    const observer = new MutationObserver(() => {
      if (restore()) observer.disconnect();
    });
    requestAnimationFrame(() => {
      if (!restore()) observer.observe(document.body, { childList: true, subtree: true });
    });
    const timer = setTimeout(() => observer.disconnect(), samePage ? 2000 : 10000);
    cleanup(() => {
      clearTimeout(timer);
      observer.disconnect();
    });
  });

  if (account.error) return <DocumentRecovery />;

  return (
    <div class="dashboard" aria-busy={pending.value !== null}>
      <AppHeader user={account.value.user} navigating={pending.value !== null} />
      <Slot />
    </div>
  );
});
