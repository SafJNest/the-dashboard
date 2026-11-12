import { component$, Slot, useStyles$ } from '@qwik.dev/core';
import { routeAction$, routeLoader$, useLocation, type RequestHandler } from '@qwik.dev/router';
import { AppHeader } from '../../components/dashboard/app-header';
import type { DashboardGuild, DashboardUser } from '../../components/dashboard/servers';
import { apiError, loginRedirect, SESSION_COOKIE } from '../../lib/beebot.server';
import { BeebotClient } from '../../lib/beebot/client.server';
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
}, { invalidate: [] });

export interface GreetResult {
  key: string;
  ok: boolean;
  errors: FieldError[];
  message: string | null;
}

export const useSaveGreet = routeAction$(async (form, event): Promise<GreetResult> => {
  const key = typeof form.key === 'string' ? form.key : '';
  const soundId = typeof form.soundId === 'string' && form.soundId ? form.soundId : null;
  if ((key !== GLOBAL_GREET && !GUILD_ID.test(key)) || (soundId !== null && !SOUND_ID.test(soundId))) {
    return { key, ok: false, errors: [], message: 'This greet is not valid.' };
  }
  const result = await new BeebotClient(event).saveGreets({ [key]: soundId });
  if (!result.ok) return { key, ok: false, errors: [], message: `${result.message} The greet was not saved.` };
  const entry = result.data[key];
  if (!entry) return { key, ok: false, errors: [], message: 'The greet was not saved. Please try again.' };
  return { key, ok: entry.ok, errors: entry.errors, message: entry.ok ? null : 'The greet was not saved.' };
}, { invalidate: [useAccount] });

export default component$(() => {
  useStyles$(styles);
  const account = useAccount();
  const location = useLocation();

  return (
    <div class="dashboard" aria-busy={location.isNavigating}>
      <AppHeader user={account.value.user} />
      <Slot />
    </div>
  );
});
