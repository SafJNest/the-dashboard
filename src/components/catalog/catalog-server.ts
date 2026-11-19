import { server$ } from '@qwik.dev/router';
import { CatalogClient } from '../../lib/beebot/catalog.server';
import type { CatalogFilters, CatalogVote, CommentQuery } from '../../lib/catalog';

export const searchSounds = server$(function (filters: CatalogFilters) {
  return new CatalogClient(this).sounds(filters);
});

export const suggestSounds = server$(function (query: string) {
  return new CatalogClient(this).suggestions(query);
});

export const loadComments = server$(function (soundId: string, query: CommentQuery) {
  return new CatalogClient(this).comments(soundId, query);
});

export const recordPlay = server$(function (soundId: string, playbackId: string) {
  return new CatalogClient(this).recordPlay(soundId, playbackId);
});

export const voteSound = server$(function (soundId: string, vote: CatalogVote) {
  return new CatalogClient(this).voteSound(soundId, vote);
});

export const createComment = server$(function (soundId: string, text: string, parentId: string | null) {
  return new CatalogClient(this).createComment(soundId, text, parentId);
});

export const updateComment = server$(function (soundId: string, commentId: string, patch: { text?: string; pinned?: boolean; hearted?: boolean }) {
  return new CatalogClient(this).updateComment(soundId, commentId, patch);
});

export const deleteComment = server$(function (soundId: string, commentId: string) {
  return new CatalogClient(this).deleteComment(soundId, commentId);
});

export const voteComment = server$(function (soundId: string, commentId: string, vote: CatalogVote) {
  return new CatalogClient(this).voteComment(soundId, commentId, vote);
});
