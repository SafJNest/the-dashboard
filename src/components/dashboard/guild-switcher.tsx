import { $, component$, useOnDocument, useSignal } from '@qwik.dev/core';
import { GuildAvatar } from './guild-avatar';
import { Icon } from './icons';
import type { DashboardGuild } from './servers';

interface GuildSwitcherProps {
  current: { id: string; name: string; iconUrl: string | null };
  guilds: DashboardGuild[];
  path: string;
}

export const GuildSwitcher = component$<GuildSwitcherProps>(({ current, guilds, path }) => {
  const menu = useSignal<HTMLDetailsElement>();

  useOnDocument('click', $((event) => {
    if (menu.value?.open && !menu.value.contains(event.target as Node)) menu.value.open = false;
  }));
  useOnDocument('keydown', $((event) => {
    if ((event as KeyboardEvent).key !== 'Escape' || !menu.value?.open) return;
    menu.value.open = false;
    menu.value.querySelector('summary')?.focus();
  }));

  return (
    <details class="switcher" ref={menu}>
      <summary class="switcher__toggle" aria-label={`Switch server, current ${current.name}`}>
        <GuildAvatar name={current.name} iconUrl={current.iconUrl} />
        <span>{current.name}</span>
        <Icon name="chevrons" />
      </summary>
      <ul class="listbox switcher__menu">
        {guilds.map((guild) => (
          <li key={guild.id}>
            <a href={`/dashboard/${guild.id}/${path}`} class="option" aria-current={guild.id === current.id ? 'page' : undefined}>
              <GuildAvatar name={guild.name} iconUrl={guild.iconUrl} size="sm" />
              <span class="option__title">{guild.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
});
