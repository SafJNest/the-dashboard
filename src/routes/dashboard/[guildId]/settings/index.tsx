import { component$ } from '@qwik.dev/core';
import { Link, type DocumentHead } from '@qwik.dev/router';
import { Icon } from '../../../../components/dashboard/icons';
import { SETTINGS_GROUPS } from '../../../../components/guild/sections';
import { useGuild } from '../layout';

export default component$(() => {
  const guild = useGuild();
  const base = `/dashboard/${guild.value.id}/settings/`;

  return (
    <div class="settings-form">
      <header class="settings-head__text">
        <p class="overline">{guild.value.name}</p>
        <h1 class="settings-head__title">Settings</h1>
        <p class="text-muted">Choose what Beebot does in this server.</p>
      </header>
      {SETTINGS_GROUPS.map((group) => (
        <section class="settings-overview" key={group.label} aria-labelledby={`overview-${group.label.toLowerCase()}`}>
          <h2 class="overline" id={`overview-${group.label.toLowerCase()}`}>{group.label}</h2>
          <ul class="settings-overview__grid">
            {group.sections.map((section) => {
              const badge = section.badge(guild.value.settings);
              return (
                <li key={section.slug}>
                  <Link href={`${base}${section.slug}/`} class="card settings-overview__card">
                    <span class="settings-overview__head">
                      <Icon name={section.icon} />
                      <strong>{section.label}</strong>
                      {badge && <span class={['badge', badge.tone && `badge--${badge.tone}`]}>{badge.label}</span>}
                    </span>
                    <span class="caption">{section.description}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => ({
  title: `${resolveValue(useGuild).name} | Settings`,
});
