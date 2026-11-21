import type { DayPlays, GuildSoundLibrary, MySoundLibrary, Sound } from './sounds';

export type OwnerFilter = 'all' | 'mine' | 'others';
export type VisibilityFilter = 'all' | 'public' | 'private';
export type LibrarySort = 'plays' | 'newest' | 'name';

export interface LibraryEntry {
  sound: Sound;
  guildName: string | null;
}

export interface LibraryQuery {
  text: string;
  owner: OwnerFilter;
  visibility: VisibilityFilter;
  sort: LibrarySort;
}

export interface RankedSound {
  sound: Sound;
  plays: number;
}

export class SoundLibrary {
  static readonly MY_PATH = '/dashboard/me/sounds/';
  static readonly UPLOAD_PATH = '/dashboard/me/sounds/upload/';
  static readonly UNKNOWN_GUILD = 'Unavailable server';
  static readonly LOAD_ERROR = "Couldn't load this data. Check your connection and try again.";
  static readonly TOP_COUNT = 5;
  static readonly RECENT_DAYS = 14;
  static readonly OWNER_LABELS: Record<OwnerFilter, string> = { all: 'All', mine: 'Yours', others: 'Others' };
  static readonly VISIBILITY_LABELS: Record<VisibilityFilter, string> = { all: 'All', public: 'Public', private: 'Private' };
  static readonly SORT_LABELS: Record<LibrarySort, string> = { plays: 'Most played', newest: 'Newest', name: 'A–Z' };

  static guildPath(guildId: string, soundId?: string) {
    const base = `/dashboard/${guildId}/sounds/`;
    return soundId ? `${base}${soundId}/` : base;
  }

  static myPath(soundId?: string) {
    return soundId ? `${SoundLibrary.MY_PATH}${soundId}/` : SoundLibrary.MY_PATH;
  }

  static guildEntries(library: GuildSoundLibrary): LibraryEntry[] {
    return library.sounds.map((sound) => ({ sound, guildName: null }));
  }

  static myEntries(library: MySoundLibrary): LibraryEntry[] {
    return library.guilds.flatMap((group) => group.sounds.map((sound) => ({ sound, guildName: group.name ?? SoundLibrary.UNKNOWN_GUILD })));
  }

  static matches(entry: LibraryEntry, query: LibraryQuery) {
    const { sound } = entry;
    const text = query.text.trim().toLowerCase().replace(/^#/, '');
    const isOwnerMatch = query.owner === 'all' || sound.ownedByMe === (query.owner === 'mine');
    const isVisibilityMatch = query.visibility === 'all' || sound.public === (query.visibility === 'public');
    const isTextMatch = !text || sound.name.toLowerCase().includes(text) || sound.tags.some((tag) => tag.name.toLowerCase().includes(text));
    return isOwnerMatch && isVisibilityMatch && isTextMatch;
  }

  static filter(entries: LibraryEntry[], query: LibraryQuery) {
    const compare = {
      plays: (a: LibraryEntry, b: LibraryEntry) => b.sound.plays - a.sound.plays,
      newest: (a: LibraryEntry, b: LibraryEntry) => b.sound.createdAt.localeCompare(a.sound.createdAt),
      name: (a: LibraryEntry, b: LibraryEntry) => a.sound.name.localeCompare(b.sound.name, 'en'),
    }[query.sort];
    return entries.filter((entry) => SoundLibrary.matches(entry, query)).sort((a, b) => compare(a, b) || a.sound.id.localeCompare(b.sound.id));
  }

  static ranked(ranking: { soundId: string; value: number }[], sounds: Sound[]): RankedSound[] {
    const byId = new Map(sounds.map((sound) => [sound.id, sound]));
    const ranked: RankedSound[] = [];
    for (const entry of ranking) {
      const sound = byId.get(entry.soundId);
      if ( !sound || entry.value <= 0 ) { continue; }
      ranked.push({ sound, plays: entry.value });
    }
    return ranked.slice(0, SoundLibrary.TOP_COUNT);
  }

  static recentDays(days: DayPlays[]) {
    return days.slice(-SoundLibrary.RECENT_DAYS);
  }
}
