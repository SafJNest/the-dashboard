import { alertBadge, type GuildSettings } from '../../lib/guild';
import type { IconName } from '../dashboard/icons';

interface SettingsSection {
  slug: string;
  label: string;
  description: string;
  icon: IconName;
  badge: (settings: GuildSettings) => { label: string; tone: string } | null;
}

const toggleBadge = (enabled: boolean) => (enabled ? { label: 'On', tone: 'accent' } : { label: 'Off', tone: '' });
const countBadge = (count: number) => ({ label: String(count), tone: '' });

export const SETTINGS_GROUPS: { label: string; sections: SettingsSection[] }[] = [
  {
    label: 'Messages',
    sections: [
      { slug: 'welcome', label: 'Welcome', description: 'Greet new members and give them roles.', icon: 'welcome', badge: (settings) => alertBadge(settings.welcome) },
      { slug: 'leave', label: 'Leave', description: 'Say goodbye when someone leaves.', icon: 'leave', badge: (settings) => alertBadge(settings.leave) },
      { slug: 'boost', label: 'Boost', description: 'Thank members who boost the server.', icon: 'boost', badge: (settings) => alertBadge(settings.boost) },
    ],
  },
  {
    label: 'Leveling',
    sections: [
      { slug: 'experience', label: 'Experience', description: 'Where members earn XP and how much.', icon: 'experience', badge: (settings) => toggleBadge(settings.general.experienceEnabled) },
      { slug: 'level-up', label: 'Level-up', description: 'Message sent on every new level.', icon: 'levelUp', badge: (settings) => alertBadge(settings.levelUp) },
      { slug: 'rewards', label: 'Rewards', description: 'Roles given at each level.', icon: 'rewards', badge: (settings) => countBadge(Object.keys(settings.reward).length) },
    ],
  },
  {
    label: 'Moderation',
    sections: [
      { slug: 'moderation', label: 'Warns & actions', description: 'Automatic mutes, kicks and bans.', icon: 'moderation', badge: (settings) => countBadge(settings.warning.actions.length) },
      { slug: 'blacklist', label: 'Blacklist', description: 'Alerts for users banned elsewhere.', icon: 'blacklist', badge: (settings) => toggleBadge(settings.blacklist.enabled) },
    ],
  },
  {
    label: 'Integrations',
    sections: [
      { slug: 'twitch', label: 'Twitch alerts', description: 'Announce linked streamers going live.', icon: 'twitch', badge: (settings) => countBadge(Object.keys(settings.twitch).length) },
    ],
  },
  {
    label: 'Server',
    sections: [{ slug: 'general', label: 'Prefix & voice', description: 'Command prefix, voice and League region.', icon: 'general', badge: () => null }],
  },
];

export const SETTINGS_SECTIONS = SETTINGS_GROUPS.flatMap((group) => group.sections);

export function findSection(slug: string | undefined) {
  return SETTINGS_SECTIONS.find((section) => section.slug === slug);
}
