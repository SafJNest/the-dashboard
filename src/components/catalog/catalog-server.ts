import { server$ } from '@qwik.dev/router';
import { CatalogClient } from '../../lib/beebot/catalog.server';
import type { BoardFilters, CatalogFilters, CatalogVote, CommentQuery, CommentTarget } from '../../lib/catalog';
import type { BoardVote } from '../../lib/soundboards';

export const searchSounds = server$(function (filters: CatalogFilters) {
  return new CatalogClient(this).sounds(filters);
});

export const searchBoards = server$(function (filters: BoardFilters) {
  return new CatalogClient(this).soundboards(filters);
});

export const loadPopularTags = server$(async function () {
  const result = await new CatalogClient(this).explore(true);
  return result.ok ? result.data.popularTags : [];
});

export const suggestSounds = server$(function (query: string) {
  return new CatalogClient(this).suggestions(query);
});

export const listMyBoards = server$(function () {
  return new CatalogClient(this).mySoundboards();
});

export const createBoard = server$(function (name: string, soundIds: string[]) {
  return new CatalogClient(this).createSoundboard(name, soundIds);
});

export const loadComments = server$(function (target: CommentTarget, query: CommentQuery) {
  return new CatalogClient(this).comments(target, query);
});

export const recordPlay = server$(function (soundId: string, playbackId: string, soundboardId: string | null) {
  return new CatalogClient(this).recordPlay(soundId, playbackId, soundboardId);
});

export const voteSound = server$(function (soundId: string, vote: CatalogVote) {
  return new CatalogClient(this).voteSound(soundId, vote);
});

export const voteBoard = server$(function (boardId: string, vote: BoardVote) {
  return new CatalogClient(this).voteSoundboard(boardId, vote);
});

export const createComment = server$(function (target: CommentTarget, text: string, parentId: string | null) {
  return new CatalogClient(this).createComment(target, text, parentId);
});

export const updateComment = server$(function (target: CommentTarget, commentId: string, patch: { text?: string; pinned?: boolean; hearted?: boolean }) {
  return new CatalogClient(this).updateComment(target, commentId, patch);
});

export const deleteComment = server$(function (target: CommentTarget, commentId: string) {
  return new CatalogClient(this).deleteComment(target, commentId);
});

export const voteComment = server$(function (target: CommentTarget, commentId: string, vote: CatalogVote) {
  return new CatalogClient(this).voteComment(target, commentId, vote);
});
