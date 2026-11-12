import { component$, Slot } from '@qwik.dev/core';
import { Link, routeAction$, routeLoader$, useLocation, type DocumentHead } from '@qwik.dev/router';
import { GuildSwitcher } from '../../../components/dashboard/guild-switcher';
import { Icon } from '../../../components/dashboard/icons';
import { findSection } from '../../../components/guild/sections';
import { apiError, GUILD_NOT_AVAILABLE } from '../../../lib/beebot.server';
import { BeebotClient } from '../../../lib/beebot/client.server';
import type { SettingsResult } from '../../../lib/guild';
import { buildSettingsBody, readSettingsResult } from '../../../lib/settings';
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
  const failure = (message: string): SettingsResult => ({ section, key, ok: false, errors: [], message });
  const { guildId } = event.params;
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
    section,
    key,
    ok,
    errors: result.errors,
    message: ok || result.errors.length ? null : 'Your changes were not saved. Please try again.',
  };
}, { invalidate: [useGuild] });

export default component$(() => {
  const guild = useGuild();
  const account = useAccount();
  const location = useLocation();
  const settingsPath = `/dashboard/${guild.value.id}/settings/`;
  const soundsPath = `/dashboard/${guild.value.id}/sounds/`;
  const inSettings = location.url.pathname.startsWith(settingsPath);
  const inSounds = location.url.pathname.startsWith(soundsPath);
  const section = findSection(location.params.section)?.slug;
  const switchPath = inSounds ? 'sounds/' : `settings/${section ? `${section}/` : ''}`;

  return (
    <>
      <div class="guild-bar">
        <div class="guild-bar__context">
          <Link href="/dashboard/" class="crumb">
            <Icon name="back" />
            <span>All servers</span>
          </Link>
          <span class="crumb-sep" aria-hidden="true">/</span>
          <GuildSwitcher current={guild.value} guilds={account.value.guilds} path={switchPath} />
        </div>
        <nav class="ctxtabs" aria-label={guild.value.name}>
          <Link href={settingsPath} class="ctxtab" aria-current={inSettings ? 'page' : undefined}>
            <Icon name="settings" />
            <span>Settings</span>
          </Link>
          <span class="ctxtab" aria-disabled="true">
            <Icon name="leaderboard" />
            <span>Leaderboard</span>
            <span class="badge">Soon</span>
          </span>
          <span class="ctxtab" aria-disabled="true">
            <Icon name="soundboards" />
            <span>Soundboards</span>
            <span class="badge">Soon</span>
          </span>
          <Link href={soundsPath} class="ctxtab" aria-current={inSounds ? 'page' : undefined}>
            <Icon name="sounds" />
            <span>Sounds</span>
          </Link>
        </nav>
      </div>
      <Slot />
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const { iconUrl } = resolveValue(useGuild);
  return { links: iconUrl ? [{ key: 'favicon', rel: 'icon', href: iconUrl }] : [] };
};
