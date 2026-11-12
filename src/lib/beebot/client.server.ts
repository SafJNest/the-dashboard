import type { RequestEvent } from '@qwik.dev/router';
import { INVALID_RESPONSE, parseMe, sessionFetch, type ApiFailure, type Me } from '../beebot.server';
import { parseGuild, type Guild } from '../guild';
import {
  parseGreetResults,
  parseGreets,
  parseGuildSoundAnalytics,
  parseGuildSoundLibrary,
  parseMySoundAnalytics,
  parseMySoundLibrary,
  parseSound,
  parseSoundAnalytics,
  parseSoundSearch,
  parseTags,
  parseVoteState,
  type GreetChanges,
  type GreetResults,
  type Greets,
  type GuildSoundAnalytics,
  type GuildSoundLibrary,
  type MySoundAnalytics,
  type MySoundLibrary,
  type Period,
  type Sound,
  type SoundAnalytics,
  type SoundPatch,
  type SoundSort,
  type SoundTag,
  type Vote,
  type VoteState,
} from '../sounds';
import { ENDPOINTS, withQuery, type QueryValue } from './endpoints';

type SessionEvent = Pick<RequestEvent, 'env' | 'url' | 'cookie' | 'headers' | 'redirect'>;
type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type ClientResult<T> = { ok: true; data: T } | ApiFailure;

export interface Account extends Me {
  greets: Greets;
}

export interface SoundSearch {
  q?: string;
  tag?: string;
  sort?: SoundSort;
  order?: 'asc' | 'desc';
  limit?: number;
}

const SOUND_NOT_FOUND = "This sound doesn't exist, or you can't see it.";
const INVALID: ApiFailure = { ok: false, status: 502, code: 'invalid_response', message: INVALID_RESPONSE, retryAfter: null };

export class BeebotClient {
  private readonly event: SessionEvent;

  constructor(event: SessionEvent) {
    this.event = event;
  }

  account() {
    return this.read(ENDPOINTS.me, (data) => {
      const me = parseMe(data);
      const greets = parseGreets((data as { greets?: unknown } | null)?.greets);
      return me && greets ? { ...me, greets } : null;
    });
  }

  saveGreets(greets: GreetChanges): Promise<ClientResult<GreetResults>> {
    return this.send('POST', ENDPOINTS.meSettings, { greets }, parseGreetResults);
  }

  guild(guildId: string): Promise<ClientResult<Guild>> {
    return this.read(ENDPOINTS.guild(guildId), (data) => parseGuild(data, guildId));
  }

  saveGuildSettings(guildId: string, body: unknown): Promise<ClientResult<unknown>> {
    return this.send('POST', ENDPOINTS.guildSettings(guildId), body, (data) => data);
  }

  guildSounds(guildId: string, period: Period): Promise<ClientResult<GuildSoundLibrary>> {
    return this.read(withQuery(ENDPOINTS.guildSounds(guildId), { period }), (data) => parseGuildSoundLibrary(data, guildId));
  }

  guildSoundAnalytics(guildId: string, period: Period): Promise<ClientResult<GuildSoundAnalytics>> {
    return this.read(withQuery(ENDPOINTS.guildSoundAnalytics(guildId), { period }), (data) => parseGuildSoundAnalytics(data, guildId));
  }

  mySounds(period: Period): Promise<ClientResult<MySoundLibrary>> {
    return this.read(withQuery(ENDPOINTS.mySounds, { period }), parseMySoundLibrary);
  }

  mySoundAnalytics(period: Period): Promise<ClientResult<MySoundAnalytics>> {
    return this.read(withQuery(ENDPOINTS.mySoundAnalytics, { period }), parseMySoundAnalytics);
  }

  sound(soundId: string): Promise<ClientResult<Sound>> {
    return this.send('GET', ENDPOINTS.sound(soundId), undefined, (data) => {
      const sound = parseSound(data);
      return sound?.id === soundId ? sound : null;
    }, SOUND_NOT_FOUND);
  }

  soundAnalytics(soundId: string, options: { period: Period; guildId?: string }): Promise<ClientResult<SoundAnalytics>> {
    return this.send('GET', withQuery(ENDPOINTS.soundAnalytics(soundId), options), undefined, (data) => {
      const analytics = parseSoundAnalytics(data);
      return analytics?.soundId === soundId ? analytics : null;
    }, SOUND_NOT_FOUND);
  }

  searchSounds(search: SoundSearch): Promise<ClientResult<Sound[]>> {
    return this.read(withQuery(ENDPOINTS.sounds, search as Record<string, QueryValue>), parseSoundSearch);
  }

  searchTags(prefix: string): Promise<ClientResult<SoundTag[]>> {
    return this.read(withQuery(ENDPOINTS.tags, { q: prefix }), parseTags);
  }

  updateSound(soundId: string, patch: SoundPatch): Promise<ClientResult<Sound>> {
    return this.send('PATCH', ENDPOINTS.sound(soundId), patch, parseSound, SOUND_NOT_FOUND);
  }

  deleteSound(soundId: string): Promise<ClientResult<null>> {
    return this.send('DELETE', ENDPOINTS.sound(soundId), undefined, () => null, SOUND_NOT_FOUND);
  }

  setVote(soundId: string, vote: Vote, enabled: boolean): Promise<ClientResult<VoteState>> {
    return this.send('PATCH', ENDPOINTS.soundVote(soundId, vote), { enabled }, (data) => parseVoteState(data, soundId), SOUND_NOT_FOUND);
  }

  private read<T>(path: string, parse: (data: unknown) => T | null): Promise<ClientResult<T>> {
    return this.send('GET', path, undefined, parse);
  }

  private async send<T>(method: Method, path: string, body: unknown, parse: (data: unknown) => T | null, notFound?: string): Promise<ClientResult<T>> {
    const result = await sessionFetch(this.event, path, { method, body });
    if (!result.ok) return result.status === 404 && notFound ? { ...result, message: notFound } : result;
    const data = parse(result.data);
    if (data === null && method !== 'DELETE') {
      console.error(`[Beebot] ${method} ${path.split('?')[0]}: unexpected response shape`);
      return INVALID;
    }
    return { ok: true, data: data as T };
  }
}
