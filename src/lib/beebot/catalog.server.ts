import type { RequestEventBase } from '@qwik.dev/router';
import { INVALID_RESPONSE, parseMe, publicFetch, type ApiFailure } from '../beebot.server';
import {
  catalogQuery,
  commentQuery,
  parseCatalogPage,
  parseCommentChange,
  parseCommentPage,
  parseCommentRemoval,
  parseCommentVoteResult,
  parseCreator,
  parseExplore,
  parseImageUrl,
  parseSoundCard,
  parseSoundVoteResult,
  parseSuggestions,
  NOT_FOUND_STATUS,
  QUERY_MAX,
  type CatalogFilters,
  type CatalogPage,
  type CatalogVote,
  type CommentChange,
  type CommentPage,
  type CommentQuery,
  type CommentRemoval,
  type CommentVoteResult,
  type Creator,
  type Explore,
  type SoundCard,
  type SoundComment,
  type SoundVoteResult,
  type Suggestions,
} from '../catalog';
import { parseGreets } from '../sounds';
import { ENDPOINTS, withQuery } from './endpoints';

type CatalogEvent = Pick<RequestEventBase, 'env' | 'url' | 'cookie'>;
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Access = 'public' | 'session';

export type CatalogResult<T> = { ok: true; data: T } | ApiFailure;

export interface CatalogViewer {
  id: string;
  name: string;
  avatarUrl: string | null;
  globalGreetId: string | null;
}

export class CatalogClient {
  static readonly GLOBAL_GREET = '0';
  static readonly SOUND_NOT_FOUND = "This sound doesn't exist, or it's private.";
  static readonly CREATOR_NOT_FOUND = "This creator doesn't exist.";
  static readonly COMMENT_NOT_FOUND = 'This comment is no longer available.';
  static readonly INVALID: ApiFailure = { ok: false, status: 502, code: 'invalid_response', message: INVALID_RESPONSE, retryAfter: null };

  static notFound(message: string): ApiFailure {
    return { ok: false, status: NOT_FOUND_STATUS, code: 'not_found', message, retryAfter: null };
  }

  private readonly event: CatalogEvent;

  constructor(event: CatalogEvent) {
    this.event = event;
  }

  viewer(): Promise<CatalogResult<CatalogViewer>> {
    return this.send('session', 'GET', ENDPOINTS.me, undefined, (data) => {
      const me = parseMe(data);
      if ( !me ) { return null; }
      const greets = parseGreets((data as { greets?: unknown }).greets);
      return {
        id: me.user.id,
        name: me.user.globalName ?? me.user.username,
        avatarUrl: me.user.avatarUrl,
        globalGreetId: greets?.[CatalogClient.GLOBAL_GREET]?.id ?? null,
      };
    });
  }

  explore(): Promise<CatalogResult<Explore>> {
    return this.send('public', 'GET', ENDPOINTS.publicExplore, undefined, parseExplore);
  }

  sounds(filters: CatalogFilters): Promise<CatalogResult<CatalogPage>> {
    return this.send('public', 'GET', withQuery(ENDPOINTS.publicSounds, catalogQuery(filters)), undefined, parseCatalogPage);
  }

  suggestions(query: string): Promise<CatalogResult<Suggestions>> {
    const q = query.trim().slice(0, QUERY_MAX);
    return this.send('public', 'GET', withQuery(ENDPOINTS.publicSuggestions, { q }), undefined, parseSuggestions);
  }

  sound(soundId: string): Promise<CatalogResult<SoundCard>> {
    return this.send('public', 'GET', ENDPOINTS.publicSound(soundId), undefined, (data) => {
      const card = parseSoundCard(data);
      return card?.id === soundId ? card : null;
    }, CatalogClient.SOUND_NOT_FOUND);
  }

  comments(soundId: string, query: CommentQuery): Promise<CatalogResult<CommentPage>> {
    return this.send('public', 'GET', withQuery(ENDPOINTS.publicComments(soundId), commentQuery(query)), undefined, parseCommentPage, CatalogClient.SOUND_NOT_FOUND);
  }

  creator(userId: string): Promise<CatalogResult<Creator>> {
    return this.send('public', 'GET', ENDPOINTS.publicUser(userId), undefined, parseCreator, CatalogClient.CREATOR_NOT_FOUND);
  }

  recordPlay(soundId: string, playbackId: string): Promise<CatalogResult<null>> {
    return this.send('public', 'POST', ENDPOINTS.publicPlays(soundId), { playbackId }, () => null, CatalogClient.SOUND_NOT_FOUND);
  }

  voteSound(soundId: string, vote: CatalogVote): Promise<CatalogResult<SoundVoteResult>> {
    return this.send('session', 'PUT', ENDPOINTS.soundVoteValue(soundId), { vote }, parseSoundVoteResult, CatalogClient.SOUND_NOT_FOUND);
  }

  createComment(soundId: string, text: string, parentId: string | null): Promise<CatalogResult<CommentChange>> {
    const body = parentId ? { text, parentId } : { text };
    return this.send('session', 'POST', ENDPOINTS.soundComments(soundId), body, parseCommentChange, CatalogClient.SOUND_NOT_FOUND);
  }

  updateComment(soundId: string, commentId: string, patch: Partial<Pick<SoundComment, 'text' | 'pinned' | 'hearted'>>): Promise<CatalogResult<CommentChange>> {
    return this.send('session', 'PATCH', ENDPOINTS.soundComment(soundId, commentId), patch, parseCommentChange, CatalogClient.COMMENT_NOT_FOUND);
  }

  deleteComment(soundId: string, commentId: string): Promise<CatalogResult<CommentRemoval>> {
    return this.send('session', 'DELETE', ENDPOINTS.soundComment(soundId, commentId), undefined, parseCommentRemoval, CatalogClient.COMMENT_NOT_FOUND);
  }

  voteComment(soundId: string, commentId: string, vote: CatalogVote): Promise<CatalogResult<CommentVoteResult>> {
    return this.send('session', 'PUT', ENDPOINTS.soundCommentVote(soundId, commentId), { vote }, parseCommentVoteResult, CatalogClient.COMMENT_NOT_FOUND);
  }

  setImage(soundId: string, body: FormData): Promise<CatalogResult<string>> {
    return this.send('session', 'PUT', ENDPOINTS.soundImage(soundId), body, parseImageUrl, CatalogClient.SOUND_NOT_FOUND);
  }

  removeImage(soundId: string): Promise<CatalogResult<null>> {
    return this.send('session', 'DELETE', ENDPOINTS.soundImage(soundId), undefined, () => null, CatalogClient.SOUND_NOT_FOUND);
  }

  setGlobalGreet(soundId: string | null): Promise<CatalogResult<boolean>> {
    return this.send('session', 'POST', ENDPOINTS.meSettings, { greets: { [CatalogClient.GLOBAL_GREET]: soundId } }, (data) => {
      const result = (data as { greets?: Record<string, { status?: unknown }> } | null)?.greets?.[CatalogClient.GLOBAL_GREET];
      return result ? result.status === 'ok' : null;
    });
  }

  private async send<T>(access: Access, method: Method, path: string, body: unknown, parse: (data: unknown) => T | null, notFound?: string): Promise<CatalogResult<T>> {
    const result = await publicFetch(this.event, path, { method, body, session: access === 'session' });
    if ( !result.ok ) { return result.status === 404 && notFound ? { ...result, message: notFound } : result; }
    const data = parse(result.data);
    const expectsData = method !== 'DELETE' && result.data !== null;
    if (data === null && expectsData) {
      console.error(`[Beebot] ${method} ${path.split('?')[0]}: unexpected response shape`);
      return CatalogClient.INVALID;
    }
    return { ok: true, data: data as T };
  }
}

