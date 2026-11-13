import { component$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { settingsPath } from '../../lib/dashboard-path';
import { alertBadge } from '../../lib/guild';
import { useGuild } from '../../routes/dashboard/[guildId]/layout';
import { Icon } from '../dashboard/icons';
import { EmptyState } from '../empty-state/empty-state';
import { AlertSettings } from './alert-settings';
import { SectionIntro } from './settings-form';

const INTRO = {
  group: 'Integrations',
  title: 'Twitch alerts',
  description: 'Announce when linked streamers go live.',
  command: '/twitch link · /twitch menu',
};

export const TwitchSettings = component$<{ streamerId?: string }>(({ streamerId }) => {
  const guild = useGuild();
  const { twitch } = guild.value.settings;
  const streamers = Object.keys(twitch);
  const selected = streamerId ?? streamers[0];

  if (streamerId !== undefined && !twitch[streamerId]) {
    return (
      <div class="settings-form">
        <header class="settings-head">
          <SectionIntro {...INTRO} />
        </header>
        <div class="callout callout--danger" role="alert">
          <Icon name="warning" />
          <div class="load-error__body">
            <p>Streamer {streamerId} isn't linked to this server.</p>
            <Link href={settingsPath(guild.value.id, 'twitch')} class="button button--secondary button--sm">Show all streamers</Link>
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
          <EmptyState icon="twitch" title="No streamers linked yet">
            Link one in Discord with <span class="mono">/twitch link</span>, then edit the alert here.
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <AlertSettings kind="twitch" itemKey={selected} key={selected}>
      <section q:slot="lead" class="card settings-card" aria-labelledby="twitch-streamers">
        <h2 id="twitch-streamers" class="heading heading--sm">Streamers</h2>
        <ul class="item-picker">
          {streamers.map((streamer) => {
            const badge = alertBadge(twitch[streamer]);
            return (
              <li key={streamer}>
                <Link href={settingsPath(guild.value.id, 'twitch', streamer)} scroll={false} class="item-picker__link" aria-current={streamer === selected ? 'page' : undefined}>
                  <Icon name="twitch" />
                  <span class="item-picker__label mono">{streamer}</span>
                  <span class={['badge', badge.tone && `badge--${badge.tone}`]}>{badge.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p class="hint">Streamers are listed by Twitch ID.</p>
      </section>
    </AlertSettings>
  );
});
