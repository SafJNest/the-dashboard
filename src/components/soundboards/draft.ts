import { createContextId } from '@qwik.dev/core';

export interface SoundboardDraft {
  path: string | null;
  name: string;
  soundIds: string[];
}

export const SoundboardDraftContext = createContextId<SoundboardDraft>('beebot.soundboard-draft');

export const openDraft = (draft: SoundboardDraft, path: string, name = '', soundIds: string[] = []) => {
  draft.path = path;
  draft.name = name;
  draft.soundIds = soundIds;
};

export const closeDraft = (draft: SoundboardDraft) => {
  draft.path = null;
  draft.name = '';
  draft.soundIds = [];
};
