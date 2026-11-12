const segment = (id: string) => encodeURIComponent(id);

export const ENDPOINTS = {
  me: '/me',
  meSettings: '/me/settings',
  guild: (guildId: string) => `/guilds/${segment(guildId)}`,
  guildSettings: (guildId: string) => `/guilds/${segment(guildId)}/settings`,
  guildSounds: (guildId: string) => `/guilds/${segment(guildId)}/sounds`,
  guildSoundAnalytics: (guildId: string) => `/guilds/${segment(guildId)}/sounds/analytics`,
  mySounds: '/sounds/me',
  mySoundAnalytics: '/sounds/me/analytics',
  sounds: '/sounds',
  sound: (soundId: string) => `/sounds/${segment(soundId)}`,
  soundAnalytics: (soundId: string) => `/sounds/${segment(soundId)}/analytics`,
  soundVote: (soundId: string, vote: 'like' | 'dislike') => `/sounds/${segment(soundId)}/${vote}`,
  tags: '/tags',
} as const;

export type QueryValue = string | number | null | undefined;

export function withQuery(path: string, query: Record<string, QueryValue>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
