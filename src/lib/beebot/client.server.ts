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
} from '../sounds';
import { Soundboards, type BoardPatch, type Soundboard, type SoundboardDetail } from '../soundboards';
import { ENDPOINTS, withQuery } from './endpoints';

type SessionEvent = Pick<RequestEvent, 'env' | 'url' | 'cookie' | 'headers' | 'redirect'>;
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ClientResult<T> = { ok: true; data: T } | ApiFailure;

export interface Account extends Me {
  greets: Greets;
}

export const SOUND_NOT_FOUND = "This sound doesn't exist, or you can't see it.";
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

  twitchStreamer(guildId: string, login: string): Promise<ClientResult<string>> {
    return this.read(withQuery(ENDPOINTS.twitchLookup(guildId), { login }), (data) => {
      const id = (data as { id?: unknown } | null)?.id;
      return typeof id === 'string' && /^[1-9][0-9]{0,31}$/.test(id) ? id : null;
    });
  }

  uploadSound(guildId: string, body: FormData): Promise<ClientResult<Sound>> {
    return this.send('POST', ENDPOINTS.guildSounds(guildId), body, parseSound);
  }

  guildSounds(guildId: string, period: Period): Promise<ClientResult<GuildSoundLibrary>> {
    return this.read(withQuery(ENDPOINTS.guildSounds(guildId), { period, overview: 'true' }), (data) => parseGuildSoundLibrary(data, guildId));
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

  soundAnalytics(soundId: string, period: Period): Promise<ClientResult<SoundAnalytics>> {
    return this.read(withQuery(ENDPOINTS.soundAnalytics(soundId), { period }), parseSoundAnalytics);
  }

  updateSound(soundId: string, patch: SoundPatch): Promise<ClientResult<Sound>> {
    return this.send('PATCH', ENDPOINTS.sound(soundId), patch, parseSound, SOUND_NOT_FOUND);
  }

  deleteSound(soundId: string): Promise<ClientResult<null>> {
    return this.send('DELETE', ENDPOINTS.sound(soundId), undefined, () => null, SOUND_NOT_FOUND);
  }

  guildSoundboards(guildId: string): Promise<ClientResult<Soundboard[]>> {
    return this.read(ENDPOINTS.guildSoundboards(guildId), Soundboards.parseList);
  }

  guildSoundboard(guildId: string, boardId: string): Promise<ClientResult<SoundboardDetail>> {
    const parse = (data: unknown) => Soundboards.parseDetail(data, boardId);
    return this.send('GET', ENDPOINTS.guildSoundboard(guildId, boardId), undefined, parse, Soundboards.NOT_FOUND);
  }

  soundboard(boardId: string): Promise<ClientResult<SoundboardDetail>> {
    const parse = (data: unknown) => Soundboards.parseDetail(data, boardId);
    return this.send('GET', ENDPOINTS.soundboard(boardId), undefined, parse, Soundboards.NOT_FOUND);
  }

  updateSoundboard(boardId: string, patch: BoardPatch): Promise<ClientResult<SoundboardDetail>> {
    const parse = (data: unknown) => Soundboards.parseDetail(data, boardId);
    return this.send('PATCH', ENDPOINTS.soundboard(boardId), patch, parse, Soundboards.NOT_FOUND);
  }

  addSoundboardSound(boardId: string, soundId: string): Promise<ClientResult<true>> {
    return this.send('PUT', ENDPOINTS.soundboardSound(boardId, soundId), undefined, () => true, Soundboards.SOUND_NOT_AVAILABLE);
  }

  removeSoundboardSound(boardId: string, soundId: string): Promise<ClientResult<null>> {
    return this.send('DELETE', ENDPOINTS.soundboardSound(boardId, soundId), undefined, () => null, Soundboards.SOUND_NOT_AVAILABLE);
  }

  setSoundboardThumbnail(boardId: string, body: FormData): Promise<ClientResult<string>> {
    return this.send('PUT', ENDPOINTS.soundboardThumbnail(boardId), body, Soundboards.parseThumbnail, Soundboards.NOT_FOUND);
  }

  deleteSoundboard(boardId: string): Promise<ClientResult<null>> {
    return this.send('DELETE', ENDPOINTS.soundboard(boardId), undefined, () => null, Soundboards.NOT_FOUND);
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
