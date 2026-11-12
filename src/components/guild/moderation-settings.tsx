import { component$ } from '@qwik.dev/core';
import { formatDuration, roleColor } from '../../lib/guild';
import { useGuild } from '../../routes/dashboard/[guildId]/layout';
import { Icon } from '../dashboard/icons';
import { SectionIntro } from './settings-form';

const ACTIONS: Record<number, { label: string; tone: string }> = {
  1: { label: 'Mute', tone: 'warning' },
  2: { label: 'Kick', tone: 'danger' },
  3: { label: 'Ban', tone: 'danger' },
};

export const ModerationSettings = component$(() => {
  const guild = useGuild();
  const { actions } = guild.value.settings.warning;

  return (
    <div class="settings-form">
      <header class="settings-head">
        <SectionIntro
          group="Moderation"
          title="Warns & automated actions"
          description="Let Beebot mute, kick or ban members when they collect too many warnings."
          command="/warn · /automatedaction"
        />
      </header>
      <section class="card card--flush" aria-labelledby="mod-actions">
        <div class="card__intro">
          <h2 id="mod-actions" class="heading heading--sm">Automated actions</h2>
          <p class="hint">Triggered by warnings given with <span class="mono">/warn</span>.</p>
        </div>
        {actions.length ? (
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">When a member reaches</th>
                  <th scope="col">Within</th>
                  <th scope="col">Action</th>
                  <th scope="col">Duration</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => {
                  const kind = ACTIONS[action.action];
                  const role = guild.value.roles.find((entry) => entry.id === action.roleId);
                  return (
                    <tr key={action.id}>
                      <td class="mono">{action.infractions} warns</td>
                      <td class="text-muted">{formatDuration(action.infractionsTime) ?? 'Ever'}</td>
                      <td>
                        <span class="table__cell-row">
                          <span class={['badge', kind && `badge--${kind.tone}`]}>{kind?.label ?? action.actionMessage}</span>
                          {role && (
                            <span class="chip">
                              <span class="role-dot" style={{ '--role-color': roleColor(role) }} />
                              {role.name}
                            </span>
                          )}
                        </span>
                      </td>
                      <td class="mono">{action.action === 2 ? '—' : formatDuration(action.actionTime) ?? 'Permanent'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p class="card__intro text-muted">No automated actions yet.</p>
        )}
      </section>
      <p class="callout callout--info">
        <Icon name="info" />
        <span>Add or remove automated actions in Discord with <span class="mono">/automatedaction</span>.</span>
      </p>
    </div>
  );
});
