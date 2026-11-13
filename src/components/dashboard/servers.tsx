import { component$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { EmptyState } from '../empty-state/empty-state';
import { GuildAvatar } from './guild-avatar';

export interface DashboardUser {
  name: string;
  avatarUrl: string | null;
}

export interface DashboardGuild {
  id: string;
  name: string;
  iconUrl: string | null;
  owner: boolean;
}

interface ServersProps {
  guilds: DashboardGuild[];
}

export const Servers = component$<ServersProps>(({ guilds }) => (
  <main class="dashboard__main">
    <div class="dashboard__intro">
      <p class="eyebrow">Your hive</p>
      <h1 class="display display--md">Your servers</h1>
      <p class="lead">Servers you own or can manage.</p>
    </div>
    {guilds.length ? (
      <ul class="dashboard__guilds">
        {guilds.map((guild) => (
          <li key={guild.id}>
            <Link href={`/dashboard/${guild.id}/settings/`} class="card dashboard__guild">
              <GuildAvatar name={guild.name} iconUrl={guild.iconUrl} size="lg" />
              <div class="dashboard__guild-text">
                <strong class="dashboard__guild-name">{guild.name}</strong>
                <p class="caption">{guild.owner ? 'Owner' : 'Manager'}</p>
              </div>
              <span class="dashboard__manage">Manage</span>
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <div class="card">
        <EmptyState icon="servers" title="No servers to manage yet">
          Beebot lists the servers you own or where you have Manage Server.
        </EmptyState>
      </div>
    )}
  </main>
));
