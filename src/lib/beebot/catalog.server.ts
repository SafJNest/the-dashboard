import type { RequestEventBase } from '@qwik.dev/router';
import { INVALID_RESPONSE, parseMe, publicFetch, type ApiFailure } from '../beebot.server';
import {
  boardQuery,
  BOARD_SUGGESTIONS,
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
  type BoardFilters,
  type CatalogFilters,
  type CatalogPage,
  type CatalogVote,
  type CommentChange,
  type CommentPage,
  type CommentQuery,
  type CommentRemoval,
  type CommentTarget,
  type CommentVoteResult,
  type Creator,
  type Explore,
  type SoundCard,
  type SoundComment,
  type SoundVoteResult,
  type Suggestions,
} from '../catalog';
import { Soundboards, type BoardPage, type BoardVote, type BoardVoteResult, type Soundboard, type SoundboardDetail } from '../soundboards';
import { parseGreets, parseMySoundLibrary, type MySoundLibrary, type Period } from '../sounds';
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
  globalGreetName: string | null;
}

export class CatalogClient {
  static readonly GLOBAL_GREET = '0';
  static readonly SOUND_NOT_FOUND = "This sound doesn't exist, or it's private.";
  static readonly CREATOR_NOT_FOUND = "This creator doesn't exist.";
  static readonly COMMENT_NOT_FOUND = 'This comment is no longer available.';
  static readonly BOARDS_UNAVAILABLE = "Soundboards aren't available right now.";
  static readonly INVALID: ApiFailure = { ok: false, status: 502, code: 'invalid_response', message: INVALID_RESPONSE, retryAfter: null };

  static notFound(message: string): ApiFailure {
    return { ok: false, status: NOT_FOUND_STATUS, code: 'not_found', message, retryAfter: null };
  }

  private static targetNotFound(target: CommentTarget) {
    return target.kind === 'sound' ? CatalogClient.SOUND_NOT_FOUND : Soundboards.NOT_FOUND;
  }

  private static commentsPath(target: CommentTarget) {
    return target.kind === 'sound' ? ENDPOINTS.soundComments(target.id) : ENDPOINTS.soundboardComments(target.id);
  }

  private static commentPath(target: CommentTarget, commentId: string) {
    return target.kind === 'sound' ? ENDPOINTS.soundComment(target.id, commentId) : ENDPOINTS.soundboardComment(target.id, commentId);
  }

  private static commentVotePath(target: CommentTarget, commentId: string) {
    return target.kind === 'sound' ? ENDPOINTS.soundCommentVote(target.id, commentId) : ENDPOINTS.soundboardCommentVote(target.id, commentId);
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
        globalGreetName: greets?.[CatalogClient.GLOBAL_GREET]?.name ?? null,
      };
    });
  }

  explore(tagsOnly = false): Promise<CatalogResult<Explore>> {
    const path = tagsOnly ? withQuery(ENDPOINTS.publicExplore, { tagsOnly: 'true' }) : ENDPOINTS.publicExplore;
    return this.send('public', 'GET', path, undefined, parseExplore);
  }

  sounds(filters: CatalogFilters): Promise<CatalogResult<CatalogPage>> {
    return this.send('public', 'GET', withQuery(ENDPOINTS.publicSounds, catalogQuery(filters)), undefined, parseCatalogPage);
  }

  soundboards(filters: BoardFilters): Promise<CatalogResult<BoardPage>> {
    return this.send('public', 'GET', withQuery(ENDPOINTS.publicSoundboards, boardQuery(filters)), undefined, Soundboards.parsePage, CatalogClient.BOARDS_UNAVAILABLE);
  }

  soundSuggestions(query: string): Promise<CatalogResult<Omit<Suggestions, 'boards'>>> {
    const q = query.trim().slice(0, QUERY_MAX);
    return this.send('public', 'GET', withQuery(ENDPOINTS.publicSuggestions, { q }), undefined, parseSuggestions);
  }

  async suggestions(query: string): Promise<CatalogResult<Suggestions>> {
    const [sounds, boards] = await Promise.all([
      this.soundSuggestions(query),
      this.soundboards({ q: query, limit: BOARD_SUGGESTIONS }),
    ]);
    if ( !sounds.ok ) { return sounds; }
    !boards.ok && console.error(`[Beebot] Soundboard suggestions unavailable: ${boards.code}`);
    return { ok: true, data: { ...sounds.data, boards: boards.ok ? boards.data.items : [] } };
  }

  sound(soundId: string): Promise<CatalogResult<SoundCard>> {
    return this.send('public', 'GET', ENDPOINTS.publicSound(soundId), undefined, (data) => {
      const card = parseSoundCard(data);
      return card?.id === soundId ? card : null;
    }, CatalogClient.SOUND_NOT_FOUND);
  }

  soundboard(boardId: string): Promise<CatalogResult<SoundboardDetail>> {
    const parse = (data: unknown) => Soundboards.parseDetail(data, boardId);
    return this.send('public', 'GET', ENDPOINTS.publicSoundboard(boardId), undefined, parse, Soundboards.NOT_FOUND);
  }

  mySounds(period: Period): Promise<CatalogResult<MySoundLibrary>> {
    return this.send('session', 'GET', withQuery(ENDPOINTS.mySounds, { period }), undefined, parseMySoundLibrary);
  }

  mySoundboards(): Promise<CatalogResult<Soundboard[]>> {
    return this.send('session', 'GET', ENDPOINTS.mySoundboards, undefined, Soundboards.parseList);
  }

  createSoundboard(name: string, soundIds: string[]): Promise<CatalogResult<SoundboardDetail>> {
    return this.send('session', 'POST', ENDPOINTS.mySoundboards, { name, soundIds }, (data) => Soundboards.parseDetail(data));
  }

  comments(target: CommentTarget, query: CommentQuery): Promise<CatalogResult<CommentPage>> {
    const base = target.kind === 'sound' ? ENDPOINTS.publicComments(target.id) : ENDPOINTS.publicSoundboardComments(target.id);
    return this.send('public', 'GET', withQuery(base, commentQuery(query)), undefined, parseCommentPage, CatalogClient.targetNotFound(target));
  }

  creator(userId: string): Promise<CatalogResult<Creator>> {
    return this.send('public', 'GET', ENDPOINTS.publicUser(userId), undefined, parseCreator, CatalogClient.CREATOR_NOT_FOUND);
  }

  recordPlay(soundId: string, playbackId: string, soundboardId: string | null): Promise<CatalogResult<null>> {
    const body = soundboardId ? { playbackId, soundboardId } : { playbackId };
    return this.send('public', 'POST', ENDPOINTS.publicPlays(soundId), body, () => null, CatalogClient.SOUND_NOT_FOUND);
  }

  voteSound(soundId: string, vote: CatalogVote): Promise<CatalogResult<SoundVoteResult>> {
    return this.send('session', 'PUT', ENDPOINTS.soundVote(soundId), { vote }, parseSoundVoteResult, CatalogClient.SOUND_NOT_FOUND);
  }

  voteSoundboard(boardId: string, vote: BoardVote): Promise<CatalogResult<BoardVoteResult>> {
    return this.send('session', 'PUT', ENDPOINTS.soundboardVote(boardId), { vote }, Soundboards.parseVote, Soundboards.NOT_FOUND);
  }

  createComment(target: CommentTarget, text: string, parentId: string | null): Promise<CatalogResult<CommentChange>> {
    const body = parentId ? { text, parentId } : { text };
    return this.send('session', 'POST', CatalogClient.commentsPath(target), body, parseCommentChange, CatalogClient.targetNotFound(target));
  }

  updateComment(target: CommentTarget, commentId: string, patch: Partial<Pick<SoundComment, 'text' | 'pinned' | 'hearted'>>): Promise<CatalogResult<CommentChange>> {
    return this.send('session', 'PATCH', CatalogClient.commentPath(target, commentId), patch, parseCommentChange, CatalogClient.COMMENT_NOT_FOUND);
  }

  deleteComment(target: CommentTarget, commentId: string): Promise<CatalogResult<CommentRemoval>> {
    return this.send('session', 'DELETE', CatalogClient.commentPath(target, commentId), undefined, parseCommentRemoval, CatalogClient.COMMENT_NOT_FOUND);
  }

  voteComment(target: CommentTarget, commentId: string, vote: CatalogVote): Promise<CatalogResult<CommentVoteResult>> {
    return this.send('session', 'PUT', CatalogClient.commentVotePath(target, commentId), { vote }, parseCommentVoteResult, CatalogClient.COMMENT_NOT_FOUND);
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
