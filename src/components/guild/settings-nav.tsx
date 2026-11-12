import { component$ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import { useGuild } from '../../routes/dashboard/[guildId]/layout';
import { Icon } from '../dashboard/icons';
import { SETTINGS_GROUPS } from './sections';

export const SettingsNav = component$(() => {
  const guild = useGuild();
  const current = useLocation().params.section;
  const base = `/dashboard/${guild.value.id}/settings/`;

  return (
    <aside class="settings__side" aria-label="Server settings">
      <nav class="sidenav" aria-label="Settings sections">
        {SETTINGS_GROUPS.map((group) => (
          <div key={group.label}>
            <p class="sidenav__group" id={`sidenav-${group.label.toLowerCase()}`}>{group.label}</p>
            <ul class="sidenav__list" aria-labelledby={`sidenav-${group.label.toLowerCase()}`}>
              {group.sections.map((section) => {
                const badge = section.badge(guild.value.settings);
                return (
                  <li key={section.slug}>
                    <Link href={`${base}${section.slug}/`} class="sidenav__item" aria-current={current === section.slug ? 'page' : undefined}>
                      <Icon name={section.icon} />
                      <span>{section.label}</span>
                      {badge && <span class={['badge', badge.tone && `badge--${badge.tone}`]}>{badge.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
});
