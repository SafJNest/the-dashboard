import { component$ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { alertBadge } from '../../lib/guild';
import { useGuild } from '../../routes/dashboard/[guildId]/layout';
import { Icon } from '../dashboard/icons';
import { AlertSettings } from './alert-settings';
import { SectionIntro } from './settings-form';

const INTRO = {
  group: 'Integrations',
  title: 'Twitch alerts',
  description: 'Announce when linked streamers go live.',
  command: '/twitch link · /twitch menu',
};

export const TwitchSettings = component$(() => {
  const guild = useGuild();
  const location = useLocation();
  const { twitch } = guild.value.settings;
  const streamers = Object.keys(twitch);
  const requested = location.url.searchParams.get('streamer');
  const selected = requested && twitch[requested] ? requested : streamers[0];

  if (!selected) {
    return (
      <div class="settings-form">
        <header class="settings-head">
          <SectionIntro {...INTRO} />
        </header>
        <p class="callout callout--info">
          <Icon name="info" />
          <span>No streamers linked yet. Link one in Discord with <span class="mono">/twitch link</span>, then edit the alert here.</span>
        </p>
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
                <Link href={`?streamer=${streamer}`} class="item-picker__link" aria-current={streamer === selected ? 'true' : undefined}>
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
