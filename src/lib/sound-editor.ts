import { routeAction$, routeLoader$ } from '@qwik.dev/router';
import { apiError } from './beebot.server';
import { BeebotClient, SOUND_NOT_FOUND } from './beebot/client.server';
import { CatalogClient } from './beebot/catalog.server';
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from './catalog';
import { DESCRIPTION_MAX, MAX_TAGS, SOUND_ID, type Sound, type SoundPatch, type SoundTag } from './sounds';

const NOT_EDITABLE = 'You can only edit your own sounds.';
const TAG_QUERY_MAX = 32;

interface UpdateResult {
  ok: boolean;
  sound: Sound | null;
  message: string | null;
}

function tagList(value: unknown) {
  const list = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return [...new Set(list.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean))];
}

export const useSound = routeLoader$(async (event) => {
  const { soundId, guildId } = event.params;
  if ( !SOUND_ID.test(soundId) ) { throw event.error(404, SOUND_NOT_FOUND); }
  const result = await new BeebotClient(event).sound(soundId);
  if ( !result.ok ) { throw apiError(event, result); }
  const sound = result.data;
  const inTree = guildId ? sound.guildId === guildId : sound.ownedByMe;
  if ( !inTree ) { throw event.error(404, SOUND_NOT_FOUND); }
  if ( !sound.canEdit && !sound.canDelete ) { throw event.error(403, NOT_EDITABLE); }
  return sound;
}, { search: [] });

export const useUpdateSound = routeAction$(async (form, event): Promise<UpdateResult> => {
  const { soundId } = event.params;
  const name = typeof form.name === 'string' ? form.name.trim() : '';
  const description = typeof form.description === 'string' ? form.description.trim() : '';
  const tags = tagList(form.tags);
  if ( !SOUND_ID.test(soundId) ) { return { ok: false, sound: null, message: SOUND_NOT_FOUND }; }
  if ( !name ) { return { ok: false, sound: null, message: 'The name cannot be empty.' }; }
  if ( tags.length > MAX_TAGS ) { return { ok: false, sound: null, message: `A sound can have up to ${MAX_TAGS} tags.` }; }
  if ( [...description].length > DESCRIPTION_MAX ) { return { ok: false, sound: null, message: `The description can be up to ${DESCRIPTION_MAX} characters.` }; }
  const patch: SoundPatch = { name, description: description || null, public: form.public === 'true', tags };
  const result = await new BeebotClient(event).updateSound(soundId, patch);
  return result.ok ? { ok: true, sound: result.data, message: null } : { ok: false, sound: null, message: `${result.message} Your changes were not saved.` };
}, { invalidate: [] });

export const useSoundImage = routeLoader$(async (event) => {
  const result = await new CatalogClient(event).sound(event.params.soundId);
  return result.ok ? { imageUrl: result.data.imageUrl, message: null } : { imageUrl: null, message: result.message };
}, { search: [], blockSSR: false });

export const useSetSoundImage = routeAction$(async (form, event): Promise<{ ok: boolean; imageUrl: string | null; message: string | null }> => {
  const file = form.file;
  const isImage = file instanceof Blob && IMAGE_TYPES.includes(file.type);
  if ( !isImage ) { return { ok: false, imageUrl: null, message: 'Choose a PNG, JPEG or GIF image.' }; }
  if ( file.size > IMAGE_MAX_BYTES ) { return { ok: false, imageUrl: null, message: 'The image must be 1 MB or smaller.' }; }
  const body = new FormData();
  body.append('file', file, file instanceof File ? file.name : 'image');
  const result = await new CatalogClient(event).setImage(event.params.soundId, body);
  return result.ok ? { ok: true, imageUrl: result.data, message: null } : { ok: false, imageUrl: null, message: result.message };
}, { invalidate: [] });

export const useRemoveSoundImage = routeAction$(async (_, event): Promise<{ ok: boolean; message: string | null }> => {
  const result = await new CatalogClient(event).removeImage(event.params.soundId);
  return result.ok ? { ok: true, message: null } : { ok: false, message: result.message };
}, { invalidate: [] });

export const useDeleteSound = routeAction$(async (_, event): Promise<{ ok: boolean; message: string | null }> => {
  const { soundId } = event.params;
  if ( !SOUND_ID.test(soundId) ) { return { ok: false, message: SOUND_NOT_FOUND }; }
  const result = await new BeebotClient(event).deleteSound(soundId);
  return result.ok ? { ok: true, message: null } : { ok: false, message: `${result.message} The sound was not deleted.` };
}, { invalidate: [] });

export const useSearchTags = routeAction$(async (form, event): Promise<{ query: string; tags: SoundTag[]; failed: boolean }> => {
  const query = typeof form.q === 'string' ? form.q.trim().slice(0, TAG_QUERY_MAX) : '';
  if ( !query ) { return { query, tags: [], failed: false }; }
  const result = await new BeebotClient(event).searchTags(query);
  return { query, tags: result.ok ? result.data : [], failed: !result.ok };
}, { invalidate: [] });
