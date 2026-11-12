import { component$, Pending } from '@qwik.dev/core';
import { routeAction$, routeLoader$, useLocation, type DocumentHead } from '@qwik.dev/router';
import { DocumentRecovery } from '../../../../../../components/dashboard/document-recovery';
import { PageSkeleton } from '../../../../../../components/dashboard/page-skeleton';
import { SoundEditor } from '../../../../../../components/sounds/sound-editor';
import { apiError } from '../../../../../../lib/beebot.server';
import { BeebotClient } from '../../../../../../lib/beebot/client.server';
import { MAX_TAGS, SOUND_ID, type Sound, type SoundPatch, type SoundTag } from '../../../../../../lib/sounds';

const NOT_EDITABLE = 'You can only edit your own sounds.';

export const useSound = routeLoader$(async (event) => {
  const { soundId } = event.params;
  if (!SOUND_ID.test(soundId)) throw event.error(404, "This sound doesn't exist, or you can't see it.");
  const result = await new BeebotClient(event).sound(soundId);
  if (!result.ok) throw apiError(event, result);
  if (!result.data.canEdit && !result.data.canDelete) throw event.error(403, NOT_EDITABLE);
  return result.data;
}, { search: [] });

export interface UpdateResult {
  ok: boolean;
  sound: Sound | null;
  message: string | null;
}

function tagList(value: unknown) {
  const list = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return [...new Set(list.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean))];
}

export const useUpdateSound = routeAction$(async (form, event): Promise<UpdateResult> => {
  const { soundId } = event.params;
  const name = typeof form.name === 'string' ? form.name.trim() : '';
  const tags = tagList(form.tags);
  if (!SOUND_ID.test(soundId)) return { ok: false, sound: null, message: "This sound doesn't exist, or you can't see it." };
  if (!name) return { ok: false, sound: null, message: 'The name cannot be empty.' };
  if (tags.length > MAX_TAGS) return { ok: false, sound: null, message: `A sound can have up to ${MAX_TAGS} tags.` };
  const patch: SoundPatch = { name, public: form.public === 'true', tags };
  const result = await new BeebotClient(event).updateSound(soundId, patch);
  return result.ok ? { ok: true, sound: result.data, message: null } : { ok: false, sound: null, message: `${result.message} Your changes were not saved.` };
}, { invalidate: [] });

export const useDeleteSound = routeAction$(async (_, event): Promise<{ ok: boolean; message: string | null }> => {
  const { soundId } = event.params;
  if (!SOUND_ID.test(soundId)) return { ok: false, message: "This sound doesn't exist, or you can't see it." };
  const result = await new BeebotClient(event).deleteSound(soundId);
  return result.ok ? { ok: true, message: null } : { ok: false, message: `${result.message} The sound was not deleted.` };
}, { invalidate: [] });

export const useSearchTags = routeAction$(async (form, event): Promise<{ query: string; tags: SoundTag[]; failed: boolean }> => {
  const query = typeof form.q === 'string' ? form.q.trim().slice(0, 32) : '';
  if (!query) return { query, tags: [], failed: false };
  const result = await new BeebotClient(event).searchTags(query);
  return { query, tags: result.ok ? result.data : [], failed: !result.ok };
}, { invalidate: [] });

const EditorPage = component$(() => {
  const sound = useSound();
  const location = useLocation();
  if (sound.error) return <DocumentRecovery />;
  if (sound.value.id !== location.params.soundId) return <PageSkeleton />;
  return <SoundEditor key={sound.value.id} sound={sound.value} />;
});

export default component$(() => (
  <Pending fallback$={() => <PageSkeleton />}>
    <EditorPage />
  </Pending>
));

export const head: DocumentHead = ({ resolveValue }) => ({
  title: `${resolveValue(useSound).name} | Edit sound`,
});
