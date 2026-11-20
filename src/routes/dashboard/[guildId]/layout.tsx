import { component$, Slot } from '@qwik.dev/core';
import { Link, routeAction$, routeLoader$, useLocation, type DocumentHead } from '@qwik.dev/router';
import { DocumentRecovery } from '../../../components/dashboard/document-recovery';
import { GuildSwitcher } from '../../../components/dashboard/guild-switcher';
import { Icon } from '../../../components/dashboard/icons';
import { PageSkeleton } from '../../../components/dashboard/page-skeleton';
import { findSection } from '../../../components/guild/sections';
import { apiError, GUILD_NOT_AVAILABLE } from '../../../lib/beebot.server';
import { BeebotClient } from '../../../lib/beebot/client.server';
import { settingsPath, settingsSection } from '../../../lib/dashboard-path';
import { peekValue } from '../../../lib/loader-value';
import type { SettingsResult } from '../../../lib/guild';
import { buildSettingsBody, readSettingsResult } from '../../../lib/settings';
import { Soundboards } from '../../../lib/soundboards';
import { GUILD_ID } from '../../../lib/sounds';
import { useAccount } from '../layout';

export const useGuild = routeLoader$(async (event) => {
  const { guildId } = event.params;
  if (!GUILD_ID.test(guildId)) throw event.error(404, GUILD_NOT_AVAILABLE);
  const result = await new BeebotClient(event).guild(guildId);
  if (!result.ok) throw apiError(event, result);
  return result.data;
}, { search: [], serializationStrategy: 'always', cacheControl: { private: true, maxAge: 300 } });

export const useSaveSettings = routeAction$(async (form, event): Promise<SettingsResult> => {
  const section = typeof form.section === 'string' ? form.section : '';
  const key = typeof form.key === 'string' && form.key ? form.key : null;
  const { guildId } = event.params;
  const failure = (message: string): SettingsResult => ({ guildId, section, key, ok: false, errors: [], message });
  if (!GUILD_ID.test(guildId)) return failure(GUILD_NOT_AVAILABLE);
  let request: ReturnType<typeof buildSettingsBody>;
  try {
    request = buildSettingsBody(form);
  } catch {
    return failure('Some values are not valid. Check the form and try again.');
  }
  const response = await new BeebotClient(event).saveGuildSettings(guildId, request.body);
  if (!response.ok) return failure(`${response.message} Your changes were not saved.`);
  const result = readSettingsResult(response.data);
  const ok = !result.failed;
  return {
    guildId,
    section,
    key,
    ok,
    errors: result.errors,
    message: ok || result.errors.length ? null : 'Your changes were not saved. Please try again.',
  };
}, { invalidate: [useGuild] });

export const useCreateKeyedAlert = routeAction$(async (form, event): Promise<{ message: string }> => {
  const { guildId } = event.params;
  const kind = form.kind;
  const identifier = typeof form.identifier === 'string' ? form.identifier.trim() : '';
  if (!GUILD_ID.test(guildId) || (kind !== 'reward' && kind !== 'twitch')) {
    return { message: 'This alert could not be created.' };
  }

  const client = new BeebotClient(event);
  let key = identifier;
  if (kind === 'twitch') {
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(identifier)) return { message: 'Enter a Twitch username.' };
    const streamer = await client.twitchStreamer(guildId, identifier);
    if (!streamer.ok) return { message: streamer.message };
    key = streamer.data;
  } else if (!/^(?:[1-9][0-9]?|100)$/.test(identifier)) {
    return { message: 'Enter a level between 1 and 100.' };
  }

  const saved = await client.saveGuildSettings(guildId, { [kind]: { [key]: {} } });
  if (!saved.ok) return { message: saved.message };
  const result = readSettingsResult(saved.data);
  if (result.failed) return { message: result.errors[0]?.message ?? 'This alert could not be created.' };

  throw event.redirect(303, settingsPath(guildId, kind === 'reward' ? 'rewards' : 'twitch', key));
}, { invalidate: [useGuild] });

export default component$(() => {
  const guild = useGuild();
  const account = useAccount();
  const location = useLocation();
  if (guild.error) return <DocumentRecovery />;
  const { guildId } = location.params;
  const loaded = peekValue(guild);
  const stale = loaded?.id !== guildId;
  const current = (stale ? account.value.guilds.find((item) => item.id === guildId) : loaded) ?? { id: guildId, name: 'Server', iconUrl: null };
  const settingsPath = `/dashboard/${guildId}/settings/`;
  const soundsPath = `/dashboard/${guildId}/sounds/`;
  const soundboardsPath = Soundboards.path(guildId);
  const inSettings = location.url.pathname.startsWith(settingsPath);
  const inSounds = location.url.pathname.startsWith(soundsPath);
  const inSoundboards = location.url.pathname.startsWith(soundboardsPath);
  const section = findSection(settingsSection(location.url.pathname))?.slug;
  const settingsSwitch = `settings/${section ? `${section}/` : ''}`;
  const libraryPath = inSounds ? 'sounds/' : 'soundboards/';
  const switchPath = inSounds || inSoundboards ? libraryPath : settingsSwitch;

  return (
    <>
      <div class="guild-bar">
        <div class="guild-bar__context">
          <Link href="/dashboard/" class="crumb">
            <Icon name="back" />
            <span>All servers</span>
          </Link>
          <span class="crumb-sep" aria-hidden="true">/</span>
          <GuildSwitcher current={current} guilds={account.value.guilds} path={switchPath} />
        </div>
        <nav class="ctxtabs" aria-label={current.name}>
          <Link href={settingsPath} class="ctxtab" aria-current={inSettings ? 'page' : undefined}>
            <Icon name="settings" />
            <span>Settings</span>
          </Link>
          <span class="ctxtab" aria-disabled="true">
            <Icon name="leaderboard" />
            <span>Leaderboard</span>
            <span class="badge">Soon</span>
          </span>
          <Link href={soundboardsPath} class="ctxtab" aria-current={inSoundboards ? 'page' : undefined}>
            <Icon name="soundboards" />
            <span>Soundboards</span>
          </Link>
          <Link href={soundsPath} class="ctxtab" aria-current={inSounds ? 'page' : undefined}>
            <Icon name="sounds" />
            <span>Sounds</span>
          </Link>
        </nav>
      </div>
      {stale ? <PageSkeleton /> : <Slot />}
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const { iconUrl } = resolveValue(useGuild);
  return { links: iconUrl ? [{ key: 'favicon', rel: 'icon', href: iconUrl }] : [] };
};
