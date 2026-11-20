import { guildSoundsPath } from './sound-library';
import { count, list, object, parseSound, SOUND_ID, text, type Sound } from './sounds';

export interface Soundboard {
  id: string;
  guildId: string;
  userId: string;
  name: string;
  thumbnailUrl: string | null;
  soundCount: number;
  canEdit: boolean;
}

export interface SoundboardDetail {
  board: Soundboard;
  sounds: Sound[];
}

export class Soundboards {
  static readonly MAX_SOUNDS = 25;
  static readonly NAME_MAX = 255;
  static readonly ID = /^\d{1,20}$/;
  static readonly NUMERIC = /^\d+$/;
  static readonly NOT_FOUND = "This soundboard doesn't exist anymore, or you can't see it.";
  static readonly SOUND_NOT_AVAILABLE = 'This soundboard or this sound is no longer available.';
  static readonly INVALID_NAME = `Enter a name up to ${Soundboards.NAME_MAX} characters that is not only numbers.`;

  static path(guildId: string, boardId?: string) {
    const base = `/dashboard/${guildId}/soundboards/`;
    return boardId ? `${base}${boardId}/` : base;
  }

  static guildSoundPath(sound: Sound, guildId: string) {
    const isGuildSound = sound.guildId === guildId;
    const isListed = sound.public || sound.ownedByMe;
    if ( !isGuildSound || !isListed ) { return null; }
    return `${guildSoundsPath(guildId)}${sound.id}/`;
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

  static parse(value: unknown, guildId: string): Soundboard | null {
    const board = object(value);
    const id = text(board?.id);
    const userId = text(board?.userId);
    const name = text(board?.name);
    const isOtherGuild = text(board?.guildId) !== guildId;
    if ( !board || !id || !userId || !name || isOtherGuild ) { return null; }
    return {
      id,
      guildId,
      userId,
      name,
      thumbnailUrl: text(board.thumbnailUrl),
      soundCount: count(board.soundCount),
      canEdit: board.canEdit === true,
    };
  }

  static parseList(value: unknown, guildId: string) {
    return list(value, (item) => Soundboards.parse(item, guildId));
  }

  static parseDetail(value: unknown, guildId: string, boardId?: string): SoundboardDetail | null {
    const detail = object(value);
    const board = Soundboards.parse(detail?.board, guildId);
    const sounds = list(detail?.sounds, parseSound);
    const isOtherBoard = boardId !== undefined && board?.id !== boardId;
    if ( !board || !sounds || isOtherBoard ) { return null; }
    return { board, sounds };
  }

  static parseThumbnail(value: unknown) {
    return text(object(value)?.thumbnailUrl);
  }
}
