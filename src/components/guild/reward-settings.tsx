import { component$ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { useGuild } from '../../routes/dashboard/[guildId]/layout';
import { Icon } from '../dashboard/icons';
import { AlertSettings } from './alert-settings';
import { SectionIntro } from './settings-form';

const INTRO = {
  group: 'Leveling',
  title: 'Rewards',
  description: 'Give roles when members reach a level, each with its own message.',
  command: '/reward',
};

export const RewardSettings = component$(() => {
  const guild = useGuild();
  const location = useLocation();
  const { reward } = guild.value.settings;
  const levels = Object.keys(reward).sort((a, b) => Number(a) - Number(b));
  const requested = location.url.searchParams.get('level');
  const selected = requested && reward[requested] ? requested : levels[0];

  if (!selected) {
    return (
      <div class="settings-form">
        <header class="settings-head">
          <SectionIntro {...INTRO} />
        </header>
        <p class="callout callout--info">
          <Icon name="info" />
          <span>No rewards yet. Create one in Discord with <span class="mono">/reward</span>, then edit it here.</span>
        </p>
      </div>
    );
  }

  return (
    <AlertSettings kind="reward" itemKey={selected} key={selected}>
      <section q:slot="lead" class="card settings-card" aria-labelledby="reward-tiers">
        <h2 id="reward-tiers" class="heading heading--sm">Tiers</h2>
        <ul class="item-picker">
          {levels.map((level) => {
            const item = reward[level];
            const role = guild.value.roles.find((entry) => entry.id === item.roleIds[0]);
            return (
              <li key={level}>
                <Link href={`?level=${level}`} class="item-picker__link" aria-current={level === selected ? 'true' : undefined}>
                  <span class="badge badge--accent">LVL {level}</span>
                  <span class="item-picker__label">{role ? role.name : 'No roles'}</span>
                  {!item.valid && <span class="badge badge--warning">Fix</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </AlertSettings>
  );
});
