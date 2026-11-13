import { component$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { settingsPath } from '../../lib/dashboard-path';
import { useGuild } from '../../routes/dashboard/[guildId]/layout';
import { Icon } from '../dashboard/icons';
import { EmptyState } from '../empty-state/empty-state';
import { AlertSettings } from './alert-settings';
import { SectionIntro } from './settings-form';

const INTRO = {
  group: 'Leveling',
  title: 'Rewards',
  description: 'Give roles when members reach a level, each with its own message.',
  command: '/reward',
};

export const RewardSettings = component$<{ level?: string }>(({ level }) => {
  const guild = useGuild();
  const { reward } = guild.value.settings;
  const levels = Object.keys(reward).sort((a, b) => Number(a) - Number(b));
  const selected = level ?? levels[0];

  if (level !== undefined && !reward[level]) {
    return (
      <div class="settings-form">
        <header class="settings-head">
          <SectionIntro {...INTRO} />
        </header>
        <div class="callout callout--danger" role="alert">
          <Icon name="warning" />
          <div class="load-error__body">
            <p>Level {level} has no reward.</p>
            <Link href={settingsPath(guild.value.id, 'rewards')} class="button button--secondary button--sm">Show all rewards</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div class="settings-form">
        <header class="settings-head">
          <SectionIntro {...INTRO} />
        </header>
        <div class="card">
          <EmptyState icon="rewards" title="No rewards yet">
            Create one in Discord with <span class="mono">/reward</span>, then edit it here.
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <AlertSettings kind="reward" itemKey={selected} key={selected}>
      <section q:slot="lead" class="card settings-card" aria-labelledby="reward-tiers">
        <h2 id="reward-tiers" class="heading heading--sm">Tiers</h2>
        <ul class="item-picker">
          {levels.map((item) => {
            const entry = reward[item];
            const role = guild.value.roles.find((candidate) => candidate.id === entry.roleIds[0]);
            return (
              <li key={item}>
                <Link href={settingsPath(guild.value.id, 'rewards', item)} scroll={false} class="item-picker__link" aria-current={item === selected ? 'page' : undefined}>
                  <span class="badge badge--accent">LVL {item}</span>
                  <span class="item-picker__label">{role ? role.name : 'No roles'}</span>
                  {!entry.valid && <span class="badge badge--warning">Fix</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </AlertSettings>
  );
});
