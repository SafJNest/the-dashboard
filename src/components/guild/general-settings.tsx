import { $, component$, useSignal } from '@qwik.dev/core';
import { LEAGUE_SHARDS } from '../../lib/guild';
import { useGuild } from '../../routes/dashboard/[guildId]/layout';
import { SettingsForm } from './settings-form';

export const GeneralSettings = component$(() => {
  const guild = useGuild();
  const version = useSignal(0);
  const { general } = guild.value.settings;

  return (
    <SettingsForm
      key={`${guild.value.id}:${version.value}`}
      section="general"
      group="Server"
      title="Prefix & voice"
      description="Text command prefix, text-to-speech voice and League of Legends region."
      command="/prefix · /voice"
      onReset$={$(() => {
        version.value++;
      })}
    >
      <div class="settings-grid">
        <section class="card settings-card" aria-labelledby="general-prefix">
          <h2 id="general-prefix" class="heading heading--sm">Command prefix</h2>
          <div class="field">
            <label class="label" for="general-prefix-input">Prefix</label>
            <input id="general-prefix-input" class="input input--short mono" name="prefix" value={general.prefix} required />
            <p class="hint">Used for text commands. Slash commands always work.</p>
          </div>
        </section>
        <section class="card settings-card" aria-labelledby="general-voice">
          <h2 id="general-voice" class="heading heading--sm">Text-to-speech voice</h2>
          <div class="settings-pair">
            <div class="field">
              <label class="label" for="general-language">Language</label>
              <input id="general-language" class="input mono" name="language" value={general.language} />
            </div>
            <div class="field">
              <label class="label" for="general-voice-input">Voice</label>
              <input id="general-voice-input" class="input" name="voice" value={general.voice} />
            </div>
          </div>
          <p class="hint">Default voice for <span class="mono">/tts</span> in this server.</p>
        </section>
        <section class="card settings-card" aria-labelledby="general-league">
          <h2 id="general-league" class="heading heading--sm">League of Legends</h2>
          <div class="field">
            <label class="label" for="general-shard">Region</label>
            <select id="general-shard" name="leagueShard" class="select">
              {!general.leagueShard && <option value="" selected>Not set</option>}
              {LEAGUE_SHARDS.map((shard) => (
                <option key={shard.value} value={shard.value} selected={shard.value === general.leagueShard}>{shard.label}</option>
              ))}
            </select>
            <p class="hint">Default region for League commands in this server.</p>
          </div>
        </section>
      </div>
    </SettingsForm>
  );
});
