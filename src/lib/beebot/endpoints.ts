const segment = (id: string) => encodeURIComponent(id);

export const ENDPOINTS = {
  me: '/me',
  meSettings: '/me/settings',
  guild: (guildId: string) => `/guilds/${segment(guildId)}`,
  guildSettings: (guildId: string) => `/guilds/${segment(guildId)}/settings`,
  twitchLookup: (guildId: string) => `/guilds/${segment(guildId)}/alerts/twitch/lookup`,
  guildSounds: (guildId: string) => `/guilds/${segment(guildId)}/sounds`,
  guildSoundAnalytics: (guildId: string) => `/guilds/${segment(guildId)}/sounds/analytics`,
  soundboards: (guildId: string) => `/guilds/${segment(guildId)}/soundboards`,
  soundboard: (guildId: string, boardId: string) => `/guilds/${segment(guildId)}/soundboards/${segment(boardId)}`,
  soundboardSound: (guildId: string, boardId: string, soundId: string) => `/guilds/${segment(guildId)}/soundboards/${segment(boardId)}/sounds/${segment(soundId)}`,
  soundboardThumbnail: (guildId: string, boardId: string) => `/guilds/${segment(guildId)}/soundboards/${segment(boardId)}/thumbnail`,
  mySounds: '/sounds/me',
  mySoundAnalytics: '/sounds/me/analytics',
  sounds: '/sounds',
  sound: (soundId: string) => `/sounds/${segment(soundId)}`,
  soundAnalytics: (soundId: string) => `/sounds/${segment(soundId)}/analytics`,
  soundVote: (soundId: string, vote: 'like' | 'dislike') => `/sounds/${segment(soundId)}/${vote}`,
  tags: '/tags',
  soundVoteValue: (soundId: string) => `/sounds/${segment(soundId)}/vote`,
  soundImage: (soundId: string) => `/sounds/${segment(soundId)}/image`,
  soundComments: (soundId: string) => `/sounds/${segment(soundId)}/comments`,
  soundComment: (soundId: string, commentId: string) => `/sounds/${segment(soundId)}/comments/${segment(commentId)}`,
  soundCommentVote: (soundId: string, commentId: string) => `/sounds/${segment(soundId)}/comments/${segment(commentId)}/vote`,
  publicExplore: '/public/sounds/explore',
  publicSounds: '/public/sounds',
  publicSuggestions: '/public/sounds/suggestions',
  publicSound: (soundId: string) => `/public/sounds/${segment(soundId)}`,
  publicComments: (soundId: string) => `/public/sounds/${segment(soundId)}/comments`,
  publicPlays: (soundId: string) => `/public/sounds/${segment(soundId)}/plays`,
  publicUser: (userId: string) => `/public/users/${segment(userId)}`,
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
