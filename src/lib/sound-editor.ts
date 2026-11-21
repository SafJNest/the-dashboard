import { routeAction$, routeLoader$ } from '@qwik.dev/router';
import { BeebotClient, SOUND_NOT_FOUND } from './beebot/client.server';
import { CatalogClient } from './beebot/catalog.server';
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from './catalog';
import { DESCRIPTION_MAX, GUILD_ID, MAX_TAGS, SOUND_ID, type Sound, type SoundPatch, type TagCount } from './sounds';

export const NAME_MAX = 32;
export const UPLOAD_MAX_BYTES = 3_900_000;
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

export const useOwnedSoundCard = routeLoader$(async (event) => {
  const { soundId } = event.params;
  if ( !soundId || !SOUND_ID.test(soundId) ) { return { soundId: soundId ?? null, card: null, message: null }; }
  const result = await new CatalogClient(event).sound(soundId);
  return result.ok ? { soundId, card: result.data, message: null } : { soundId, card: null, message: result.message };
}, { search: [], blockSSR: false });

export const useUpdateSound = routeAction$(async (form, event): Promise<UpdateResult> => {
  const soundId = typeof form.soundId === 'string' ? form.soundId : '';
  const name = typeof form.name === 'string' ? form.name.trim() : '';
  const description = typeof form.description === 'string' ? form.description.trim() : '';
  const tags = tagList(form.tags);
  if ( !SOUND_ID.test(soundId) ) { return { ok: false, sound: null, message: SOUND_NOT_FOUND }; }
  if ( !name || [...name].length > NAME_MAX ) { return { ok: false, sound: null, message: `Enter a name up to ${NAME_MAX} characters.` }; }
  if ( tags.length > MAX_TAGS ) { return { ok: false, sound: null, message: `A sound can have up to ${MAX_TAGS} tags.` }; }
  if ( [...description].length > DESCRIPTION_MAX ) { return { ok: false, sound: null, message: `The description can be up to ${DESCRIPTION_MAX} characters.` }; }
  const patch: SoundPatch = { name, description: description || null, public: form.public === 'true', tags };
  const result = await new BeebotClient(event).updateSound(soundId, patch);
  return result.ok ? { ok: true, sound: result.data, message: null } : { ok: false, sound: null, message: `${result.message} Your changes were not saved.` };
});

export const useSetSoundImage = routeAction$(async (form, event): Promise<{ ok: boolean; imageUrl: string | null; message: string | null }> => {
  const soundId = typeof form.soundId === 'string' ? form.soundId : '';
  const file = form.file;
  const isImage = file instanceof Blob && IMAGE_TYPES.includes(file.type);
  if ( !SOUND_ID.test(soundId) ) { return { ok: false, imageUrl: null, message: SOUND_NOT_FOUND }; }
  if ( !isImage ) { return { ok: false, imageUrl: null, message: 'Choose a PNG, JPEG or GIF image.' }; }
  if ( file.size > IMAGE_MAX_BYTES ) { return { ok: false, imageUrl: null, message: 'The image must be 1 MB or smaller.' }; }
  const body = new FormData();
  body.append('file', file, file instanceof File ? file.name : 'image');
  const result = await new CatalogClient(event).setImage(soundId, body);
  return result.ok ? { ok: true, imageUrl: result.data, message: null } : { ok: false, imageUrl: null, message: result.message };
}, { invalidate: [useOwnedSoundCard] });

export const useRemoveSoundImage = routeAction$(async (form, event): Promise<{ ok: boolean; message: string | null }> => {
  const soundId = typeof form.soundId === 'string' ? form.soundId : '';
  if ( !SOUND_ID.test(soundId) ) { return { ok: false, message: SOUND_NOT_FOUND }; }
  const result = await new CatalogClient(event).removeImage(soundId);
  return result.ok ? { ok: true, message: null } : { ok: false, message: result.message };
}, { invalidate: [useOwnedSoundCard] });

export const useDeleteSound = routeAction$(async (form, event): Promise<{ ok: boolean; message: string | null }> => {
  const soundId = typeof form.soundId === 'string' ? form.soundId : '';
  if ( !SOUND_ID.test(soundId) ) { return { ok: false, message: SOUND_NOT_FOUND }; }
  const result = await new BeebotClient(event).deleteSound(soundId);
  return result.ok ? { ok: true, message: null } : { ok: false, message: `${result.message} The sound was not deleted.` };
});

export const useSearchTags = routeAction$(async (form, event): Promise<{ query: string; tags: TagCount[]; failed: boolean }> => {
  const query = typeof form.q === 'string' ? form.q.trim().slice(0, TAG_QUERY_MAX) : '';
  if ( !query ) { return { query, tags: [], failed: false }; }
  const result = await new CatalogClient(event).soundSuggestions(query);
  return { query, tags: result.ok ? result.data.tags : [], failed: !result.ok };
}, { invalidate: [] });

export const useUploadSound = routeAction$(async (form, event): Promise<{ message: string }> => {
  const guildId = typeof form.guildId === 'string' ? form.guildId : '';
  const file = form.file;
  const name = typeof form.name === 'string' ? form.name.trim() : '';
  const description = typeof form.description === 'string' ? form.description.trim() : '';
  const tags = tagList(typeof form.tags === 'string' ? form.tags.split(',') : form.tags).slice(0, MAX_TAGS);
  const isFile = file instanceof File && file.size > 0 && file.size <= UPLOAD_MAX_BYTES;
  const isName = name.length > 0 && [...name].length <= NAME_MAX;
  if ( !GUILD_ID.test(guildId) ) { return { message: 'Choose the server where Beebot will keep the sound.' }; }
  if ( !isFile || !isName ) { return { message: `Enter a name up to ${NAME_MAX} characters and choose an MP3 or Opus file up to 3.9 MB.` }; }
  if ( [...description].length > DESCRIPTION_MAX ) { return { message: `The description can be up to ${DESCRIPTION_MAX} characters.` }; }
  const metadata = { name, description: description || undefined, public: form.visibility !== 'private', tags };
  const body = new FormData();
  body.append('file', file);
  body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
  const uploaded = await new BeebotClient(event).uploadSound(guildId, body);
  if ( !uploaded.ok ) { return { message: uploaded.message }; }
  throw event.redirect(303, `/dashboard/me/sounds/${uploaded.data.id}/`);
});
