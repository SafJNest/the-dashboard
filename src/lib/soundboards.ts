import { count, list, number, object, parseUser, SOUND_ID, text, type SoundUser } from './sounds';

export const SORT_MODES = ['NAME_ASC', 'NAME_DESC', 'MANUAL'] as const;
export type SortMode = (typeof SORT_MODES)[number];
export type BoardVote = 'LIKE' | null;

export interface Soundboard {
  id: string;
  guildId: string | null;
  userId: string | null;
  name: string;
  thumbnailUrl: string | null;
  soundCount: number | null;
  canEdit: boolean;
  public: boolean;
  sortMode: SortMode;
  likes: number;
  plays: number;
  commentCount: number;
  vote: BoardVote;
}

export interface BoardSound {
  id: string;
  name: string;
  durationMs: number | null;
  audioUrl: string | null;
  imageUrl: string | null;
  uploader: SoundUser | null;
  public: boolean;
}

export interface SoundboardDetail {
  board: Soundboard;
  sounds: BoardSound[];
  hiddenIds: string[];
}

export interface BoardPage {
  items: Soundboard[];
  nextCursor: string | null;
}

export interface BoardVoteResult {
  likes: number;
  vote: BoardVote;
}

export interface BoardPatch {
  name?: string;
  public?: boolean;
  sortMode?: SortMode;
  soundIds?: string[];
}

export class Soundboards {
  static readonly MAX_SOUNDS = 25;
  static readonly NAME_MAX = 40;
  static readonly KEYS = 'QWERTYUIOPASDFGHJKLZXCVBN';
  static readonly ID = /^\d{1,20}$/;
  static readonly NUMERIC = /^\d+$/;
  static readonly COMMAND_PREFIX = '/soundboard play ';
  static readonly NOT_FOUND = "This soundboard doesn't exist anymore, or you can't see it.";
  static readonly SOUND_NOT_AVAILABLE = 'This soundboard or this sound is no longer available.';
  static readonly INVALID_NAME = `Enter a name up to ${Soundboards.NAME_MAX} characters that is not only numbers.`;
  static readonly FULL = 'This soundboard is full. Free a key first.';

  static myPath(boardId?: string) {
    const base = '/dashboard/me/soundboards/';
    return boardId ? `${base}${boardId}/` : base;
  }

  static placePath(boardId: string, soundId: string) {
    return `${Soundboards.myPath(boardId)}add/${soundId}/`;
  }

  static guildPath(guildId: string, boardId?: string) {
    const base = `/dashboard/${guildId}/soundboards/`;
    return boardId ? `${base}${boardId}/` : base;
  }

  static command(boardId: string) {
    return `${Soundboards.COMMAND_PREFIX}${boardId}`;
  }

  static keyOf(index: number) {
    return Soundboards.KEYS[index] ?? null;
  }

  static storedIds(detail: SoundboardDetail) {
    return [...detail.sounds.map((sound) => sound.id), ...detail.hiddenIds];
  }

  static readName(value: unknown) {
    const name = typeof value === 'string' ? value.trim() : '';
    const isTooLong = [...name].length > Soundboards.NAME_MAX;
    if ( !name || isTooLong || Soundboards.NUMERIC.test(name) ) { return null; }
    return name;
  }

  static readSoundIds(value: unknown) {
    const values = Array.isArray(value) ? value : [value];
    const soundIds = values.filter((item): item is string => typeof item === 'string' && SOUND_ID.test(item));
    return [...new Set(soundIds)];
  }

  static parse(value: unknown): Soundboard | null {
    const board = object(value);
    const id = text(board?.id);
    const name = text(board?.name);
    const sortMode = SORT_MODES.find((mode) => mode === board?.sortMode) ?? 'NAME_ASC';
    const vote = object(board?.viewer)?.vote === 'LIKE' ? 'LIKE' : null;
    if ( !board || !id || !name ) { return null; }
    return {
      id,
      guildId: text(board.guildId),
      userId: text(board.userId),
      name,
      thumbnailUrl: text(board.thumbnailUrl),
      soundCount: number(board.soundCount),
      canEdit: board.canEdit === true,
      public: board.public === true,
      sortMode,
      likes: count(board.likes),
      plays: count(board.plays),
      commentCount: count(board.commentCount),
      vote,
    };
  }

  static parseList(value: unknown) {
    return list(value, Soundboards.parse);
  }

  static parsePage(value: unknown): BoardPage | null {
    const page = object(value);
    const items = Soundboards.parseList(page?.items);
    if ( !page || !items ) { return null; }
    return { items, nextCursor: text(page.nextCursor) };
  }

  static parseSound(value: unknown): BoardSound | null {
    const sound = object(value);
    const id = text(sound?.id);
    const name = text(sound?.name);
    if ( !sound || !id || !name ) { return null; }
    return {
      id,
      name,
      durationMs: number(sound.durationMs),
      audioUrl: text(sound.audioUrl) ?? text(sound.url),
      imageUrl: text(sound.imageUrl),
      uploader: parseUser(sound.uploader),
      public: sound.public !== false,
    };
  }

  static parseDetail(value: unknown, boardId?: string): SoundboardDetail | null {
    const detail = object(value);
    const board = Soundboards.parse(detail?.board);
    const sounds = list(detail?.sounds, Soundboards.parseSound);
    const storedIds = list(detail?.soundIds, text);
    const isOtherBoard = boardId !== undefined && board?.id !== boardId;
    if ( !board || !sounds || !storedIds || isOtherBoard ) { return null; }
    if ( !storedIds.length ) { return { board, sounds, hiddenIds: [] }; }
    const byId = new Map(sounds.map((sound) => [sound.id, sound]));
    const ordered = storedIds.flatMap((id) => byId.get(id) ?? []);
    const listed = new Set(storedIds);
    const unlisted = sounds.filter((sound) => !listed.has(sound.id));
    return { board, sounds: [...ordered, ...unlisted], hiddenIds: storedIds.filter((id) => !byId.has(id)) };
  }

  static parseThumbnail(value: unknown) {
    return text(object(value)?.thumbnailUrl);
  }

  static parseVote(value: unknown): BoardVoteResult | null {
    const result = object(value);
    const isKnownVote = result?.vote === 'LIKE' || result?.vote === null;
    if ( !result || !isKnownVote ) { return null; }
    return { likes: count(result.likes), vote: result.vote === 'LIKE' ? 'LIKE' : null };
  }
}
