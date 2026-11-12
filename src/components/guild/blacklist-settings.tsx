import { $, component$, useSignal } from '@qwik.dev/core';
import { channelGroups } from '../../lib/guild';
import { useGuild } from '../../routes/dashboard/[guildId]/layout';
import { ChannelPicker } from './channel-picker';
import { SettingsForm } from './settings-form';

export const BlacklistSettings = component$(() => {
  const guild = useGuild();
  const version = useSignal(0);
  const { blacklist } = guild.value.settings;

  return (
    <SettingsForm
      key={`${guild.value.id}:${version.value}`}
      section="blacklist"
      group="Moderation"
      title="Blacklist"
      description="Get alerted when someone banned from many other servers joins yours."
      command="/blacklist"
      toggle={{ name: 'enabled', checked: blacklist.enabled, label: 'Enable blacklist alerts' }}
      onReset$={$(() => {
        version.value++;
      })}
    >
      <section class="card settings-card settings-card--narrow" aria-labelledby="blacklist-title">
        <h2 id="blacklist-title" class="heading heading--sm">Cross-server protection</h2>
        <p class="text-muted">
          Beebot keeps track of users banned across every server it's in. When someone who joins has been banned more times than your threshold, Beebot alerts your channel.
        </p>
        <div class="field">
          <label class="label" for="blacklist-threshold">Ban threshold</label>
          <input id="blacklist-threshold" class="input input--number" type="number" name="threshold" min="1" step="1" value={blacklist.threshold} required />
          <p class="hint">Alert when a member has been banned from at least this many servers.</p>
        </div>
        <ChannelPicker
          id="blacklist-channel"
          label="Alert channel"
          hint="Text channels only."
          groups={channelGroups(guild.value)}
          value={blacklist.channelId}
        />
      </section>
    </SettingsForm>
  );
});
