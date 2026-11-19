import type { QueryValue } from './beebot/endpoints';
import { count, list, number, object, parseTag, parseTagCount, parseUser, text, type SoundTag, type SoundUser, type TagCount } from './sounds';

export const CATALOG_SORTS = ['relevance', 'popular', 'newest', 'mostLiked', 'mostDisliked'] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];
export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = { relevance: 'Relevance', popular: 'Most played', newest: 'Newest', mostLiked: 'Most liked', mostDisliked: 'Most disliked' };

export const COMMENT_SORTS = ['top', 'newest', 'oldest'] as const;
export type CommentSort = (typeof COMMENT_SORTS)[number] | 'mostDisliked';
export const COMMENT_SORT_LABELS: Record<(typeof COMMENT_SORTS)[number], string> = { top: 'Top', newest: 'Newest', oldest: 'Oldest' };

export const LENGTHS = {
  any: { label: 'Any length', minDurationMs: undefined, maxDurationMs: undefined },
  short: { label: 'Short', minDurationMs: undefined, maxDurationMs: 3000 },
  long: { label: 'Long', minDurationMs: 3001, maxDurationMs: undefined },
} as const;
export type LengthFilter = keyof typeof LENGTHS;

export const QUERY_MAX = 255;
export const COMMENT_MAX = 2000;
export const CATALOG_PAGE = 20;
export const IMAGE_MAX_BYTES = 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif'];
export const COMMAND_PREFIX = '/play ';
export const SOUNDS_PATH = '/sounds';
export const NOT_FOUND_STATUS = 404;
export const USER_ID = /^\d{1,20}$/;

export type CatalogVote = 'LIKE' | 'DISLIKE' | null;

export interface Viewer {
  ownedByMe: boolean;
  vote: CatalogVote;
}

export interface SoundCard {
  id: string;
  name: string;
  description: string | null;
  public: boolean;
  createdAt: string | null;
  durationMs: number | null;
  audioUrl: string | null;
  imageUrl: string | null;
  uploader: SoundUser;
  tags: SoundTag[];
  plays: number;
  listeners: number;
  likes: number;
  dislikes: number;
  commentCount: number;
  viewer: Viewer | null;
}

export interface CatalogPage {
  items: SoundCard[];
  mine: SoundCard[];
  nextCursor: string | null;
}

export interface Explore {
  popularTags: TagCount[];
  trending: SoundCard[];
  latest: SoundCard[];
}

export interface Suggestions {
  sounds: SoundCard[];
  tags: TagCount[];
}

export interface Creator {
  user: SoundUser;
  uploadingSince: string | null;
  soundCount: number;
  plays: number;
  likes: number;
  dislikes: number;
  commentCount: number;
}

export interface SoundComment {
  id: string;
  soundId: string;
  parentId: string | null;
  author: SoundUser | null;
  text: string | null;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  pinned: boolean;
  hearted: boolean;
  likes: number;
  replyCount: number;
  uploader: boolean;
  viewer: Viewer | null;
}

export interface CommentPage {
  items: SoundComment[];
  nextCursor: string | null;
}

export interface CommentChange {
  comment: SoundComment;
  commentCount: number;
  previousPinnedId: string | null;
}

export interface CommentRemoval {
  comment: SoundComment | null;
  commentCount: number;
}

export interface SoundVoteResult {
  likes: number;
  dislikes: number;
  vote: CatalogVote;
}

export interface CommentVoteResult {
  commentId: string;
  likes: number;
  vote: CatalogVote;
}

export interface CatalogFilters {
  q?: string;
  tag?: string | null;
  uploaderId?: string;
  length?: LengthFilter;
  sort?: CatalogSort | null;
  cursor?: string | null;
}

export interface CommentQuery {
  parentId?: string | null;
  sort?: CommentSort;
  cursor?: string | null;
}

export function catalogQuery(filters: CatalogFilters): Record<string, QueryValue> {
  const length = LENGTHS[filters.length ?? 'any'];
  return {
    q: filters.q?.trim().slice(0, QUERY_MAX),
    tag: filters.tag,
    uploaderId: filters.uploaderId,
    minDurationMs: length.minDurationMs,
    maxDurationMs: length.maxDurationMs,
    sort: filters.sort,
    cursor: filters.cursor,
  };
}

export function commentQuery(query: CommentQuery): Record<string, QueryValue> {
  return { parentId: query.parentId, sort: query.sort === 'top' ? null : query.sort, cursor: query.cursor };
}

export function playCommand(soundId: string) {
  return `${COMMAND_PREFIX}${soundId}`;
}

export function likeShare(likes: number, dislikes: number) {
  const total = likes + dislikes;
  return total ? Math.round((likes / total) * 100) : null;
}

function parseVote(value: unknown): CatalogVote | undefined {
  if ( value === null || value === undefined ) { return null; }
  return value === 'LIKE' || value === 'DISLIKE' ? value : undefined;
}

function parseViewer(value: unknown): Viewer | null | undefined {
  if ( value === undefined || value === null ) { return null; }
  const viewer = object(value);
  const vote = parseVote(viewer?.vote);
  if ( !viewer || vote === undefined || typeof viewer.ownedByMe !== 'boolean' ) { return undefined; }
  return { ownedByMe: viewer.ownedByMe, vote };
}

export function parseSoundCard(value: unknown): SoundCard | null {
  const card = object(value);
  const id = text(card?.id);
  const name = text(card?.name);
  const uploader = parseUser(card?.uploader);
  const tags = list(card?.tags, parseTag);
  const viewer = parseViewer(card?.viewer);
  if ( !card || !id || !name || !uploader || !tags || viewer === undefined ) { return null; }
  return {
    id,
    name,
    description: text(card.description) || null,
    public: card.public !== false,
    createdAt: text(card.createdAt),
    durationMs: number(card.durationMs),
    audioUrl: text(card.audioUrl),
    imageUrl: text(card.imageUrl),
    uploader,
    tags,
    plays: count(card.plays),
    listeners: count(card.listeners),
    likes: count(card.likes),
    dislikes: count(card.dislikes),
    commentCount: count(card.commentCount),
    viewer,
  };
}

export function parseCatalogPage(value: unknown): CatalogPage | null {
  const page = object(value);
  const items = list(page?.items, parseSoundCard);
  const mine = list(page?.mine, parseSoundCard);
  if ( !page || !items || !mine ) { return null; }
  return { items, mine, nextCursor: text(page.nextCursor) };
}

export function parseExplore(value: unknown): Explore | null {
  const explore = object(value);
  const popularTags = list(explore?.popularTags, parseTagCount);
  const trending = list(explore?.trending, parseSoundCard);
  const latest = list(explore?.latest, parseSoundCard);
  if ( !popularTags || !trending || !latest ) { return null; }
  return { popularTags, trending, latest };
}

export function parseSuggestions(value: unknown): Suggestions | null {
  const suggestions = object(value);
  const sounds = list(suggestions?.sounds, parseSoundCard);
  const tags = list(suggestions?.tags, parseTagCount);
  if ( !sounds || !tags ) { return null; }
  return { sounds, tags };
}

export function parseCreator(value: unknown): Creator | null {
  const creator = object(value);
  const user = parseUser(creator?.user);
  if ( !creator || !user ) { return null; }
  return {
    user,
    uploadingSince: text(creator.uploadingSince),
    soundCount: count(creator.soundCount),
    plays: count(creator.plays),
    likes: count(creator.likes),
    dislikes: count(creator.dislikes),
    commentCount: count(creator.commentCount),
  };
}

export function parseComment(value: unknown): SoundComment | null {
  const comment = object(value);
  const id = text(comment?.id);
  const soundId = text(comment?.soundId);
  const createdAt = text(comment?.createdAt);
  const author = comment?.author === null || comment?.author === undefined ? null : parseUser(comment.author);
  const viewer = parseViewer(comment?.viewer);
  const brokenAuthor = comment?.author !== null && comment?.author !== undefined && !author;
  if ( !comment || !id || !soundId || !createdAt || brokenAuthor || viewer === undefined ) { return null; }
  return {
    id,
    soundId,
    parentId: text(comment.parentId),
    author,
    text: text(comment.text),
    createdAt,
    editedAt: text(comment.editedAt),
    deleted: comment.deleted === true,
    pinned: comment.pinned === true,
    hearted: comment.hearted === true,
    likes: count(comment.likes),
    replyCount: count(comment.replyCount),
    uploader: comment.uploader === true,
    viewer,
  };
}

export function parseCommentPage(value: unknown): CommentPage | null {
  const page = object(value);
  const items = list(page?.items, parseComment);
  if ( !page || !items ) { return null; }
  return { items, nextCursor: text(page.nextCursor) };
}

export function parseCommentChange(value: unknown): CommentChange | null {
  const change = object(value);
  const comment = parseComment(change?.comment);
  if ( !change || !comment ) { return null; }
  return { comment, commentCount: count(change.commentCount), previousPinnedId: text(change.previousPinnedId) };
}

export function parseCommentRemoval(value: unknown): CommentRemoval | null {
  const removal = object(value);
  if ( !removal ) { return null; }
  const comment = removal.comment === null || removal.comment === undefined ? null : parseComment(removal.comment);
  return { comment, commentCount: count(removal.commentCount) };
}

export function parseSoundVoteResult(value: unknown): SoundVoteResult | null {
  const result = object(value);
  const vote = parseVote(result?.vote);
  if ( !result || vote === undefined ) { return null; }
  return { likes: count(result.likes), dislikes: count(result.dislikes), vote };
}

export function parseCommentVoteResult(value: unknown): CommentVoteResult | null {
  const result = object(value);
  const commentId = text(result?.commentId);
  const vote = parseVote(result?.vote);
  if ( !result || !commentId || vote === undefined ) { return null; }
  return { commentId, likes: count(result.likes), vote };
}

export function parseImageUrl(value: unknown): string | null {
  return text(object(value)?.imageUrl);
}
