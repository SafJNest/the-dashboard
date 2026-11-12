import { $, component$, useSignal } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { alertBadge, DEFAULT_CHANNEL_SETTINGS, textChannels } from '../../lib/guild';
import { useGuild } from '../../routes/dashboard/[guildId]/layout';
import { SettingsForm } from './settings-form';

export const ExperienceSettings = component$(() => {
  const guild = useGuild();
  const version = useSignal(0);
  const { general, channels, levelUp, reward } = guild.value.settings;
  const levelUpBadge = alertBadge(levelUp);

  return (
    <SettingsForm
      key={version.value}
      section="experience"
      group="Leveling"
      title="Experience"
      description="Members earn XP by chatting. Choose where XP is earned and how much."
      command="/leaderboard"
      toggle={{ name: 'experienceEnabled', checked: general.experienceEnabled, label: 'Enable experience' }}
      onReset$={$(() => {
        version.value++;
      })}
    >
      <div class="settings-grid settings-grid--wide">
        <section class="card card--flush" aria-labelledby="xp-channels">
          <div class="card__intro">
            <h2 id="xp-channels" class="heading heading--sm">Channels</h2>
            <p class="hint">Turn XP off in a channel or change how much members earn there.</p>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Channel</th>
                  <th scope="col">XP</th>
                  <th scope="col">Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {textChannels(guild.value).map((channel) => {
                  const current = channels[channel.id] ?? DEFAULT_CHANNEL_SETTINGS;
                  return (
                    <tr key={channel.id}>
                      <td>
                        <span class="mono text-subtle">#</span>
                        {channel.name}
                        <input type="hidden" name={`orig:${channel.id}`} value={JSON.stringify(current)} />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          role="switch"
                          class="switch switch--sm"
                          name={`xp:${channel.id}`}
                          checked={current.experienceEnabled}
                          aria-label={`XP in #${channel.name}`}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          class="input input--sm input--number"
                          name={`mod:${channel.id}`}
                          value={current.experienceModifier}
                          min="0"
                          step="0.1"
                          required
                          aria-label={`XP multiplier in #${channel.name}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section class="card settings-card" aria-labelledby="xp-linked">
          <h2 id="xp-linked" class="heading heading--sm">Linked settings</h2>
          <Link href={`/dashboard/${guild.value.id}/settings/level-up/`} class="item-picker__link">
            <span class={['badge', levelUpBadge.tone && `badge--${levelUpBadge.tone}`]}>{levelUpBadge.label}</span>
            <span class="item-picker__label">Level-up message</span>
          </Link>
          <Link href={`/dashboard/${guild.value.id}/settings/rewards/`} class="item-picker__link">
            <span class="badge">{Object.keys(reward).length}</span>
            <span class="item-picker__label">Role rewards</span>
          </Link>
        </section>
      </div>
    </SettingsForm>
  );
});
