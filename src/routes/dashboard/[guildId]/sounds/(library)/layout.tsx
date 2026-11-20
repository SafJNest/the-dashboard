import { component$ } from '@qwik.dev/core';
import { Form, routeAction$, useLocation, type RequestHandler } from '@qwik.dev/router';
import { SoundLibrary } from '../../../../../components/sounds/sound-library';
import { apiError, awaitLoader, isDocumentRequest, loaderResolver } from '../../../../../lib/beebot.server';
import { BeebotClient, SOUND_NOT_FOUND } from '../../../../../lib/beebot/client.server';
import { useGuildSoundAnalytics, useGuildSoundLibrary } from '../../../../../lib/sound-loaders';
import { DESCRIPTION_MAX, GUILD_ID } from '../../../../../lib/sounds';
import { useAccount } from '../../../layout';
import { useGuild } from '../../layout';

export { useGuildSoundAnalytics, useGuildSoundLibrary };

export const onGet: RequestHandler = async (event) => {
  if (!isDocumentRequest(event)) return;
  if (event.url.search) throw event.redirect(301, event.url.pathname);
  const resolveValue = loaderResolver(event);
  resolveValue(useGuildSoundAnalytics).catch(() => undefined);
  resolveValue(useAccount).catch(() => undefined);
  resolveValue(useGuild).catch(() => undefined);
  const data = await awaitLoader(event, resolveValue(useGuildSoundLibrary));
  if (data.failed) throw apiError(event, data);
  const { soundId } = event.params;
  if (soundId && !data.library.sounds.some((sound) => sound.id === soundId)) throw event.error(404, SOUND_NOT_FOUND);
};

const MAX_UPLOAD_BYTES = 3_900_000;

export const useUploadSound = routeAction$(async (form, event): Promise<{ message: string }> => {
  const { guildId } = event.params;
  const file = form.file;
  const name = typeof form.name === 'string' ? form.name.trim() : '';
  const description = typeof form.description === 'string' ? form.description.trim() : '';
  const tags = typeof form.tags === 'string' ? form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [];

  if (!GUILD_ID.test(guildId) || !(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES || !name) {
    return { message: 'Enter a name and choose an MP3 or Opus file up to 3.9 MB.' };
  }
  if ( [...description].length > DESCRIPTION_MAX ) { return { message: `The description can be up to ${DESCRIPTION_MAX} characters.` }; }

  const body = new FormData();
  body.append('file', file);
  body.append('metadata', new Blob([JSON.stringify({ name, description: description || undefined, public: form.visibility === 'public', tags })],
    { type: 'application/json' }), 'metadata.json');

  const uploaded = await new BeebotClient(event).uploadSound(guildId, body);
  if (!uploaded.ok) return { message: uploaded.message };

  throw event.redirect(303, `/dashboard/${guildId}/sounds/${uploaded.data.id}/`);
}, { invalidate: [useGuildSoundLibrary, useGuildSoundAnalytics] });

export default component$(() => {
  const guild = useGuild();
  const location = useLocation();
  const library = useGuildSoundLibrary();
  const analytics = useGuildSoundAnalytics();
  const upload = useUploadSound();

  return (
    <>
      <details class="card settings-card" open={upload.value?.message ? true : undefined}>
        <summary>Upload sound</summary>
        <Form action={upload} enctype="multipart/form-data">
          <div class="field">
            <label class="label" for="sound-upload-name">Name</label>
            <input id="sound-upload-name" class="input" name="name" maxLength={255} required />
          </div>
          <div class="field">
            <label class="label" for="sound-upload-description">Description (optional)</label>
            <textarea id="sound-upload-description" class="textarea" name="description" rows={3} maxLength={DESCRIPTION_MAX} />
            <p class="hint">Shown on the sound page. Up to {DESCRIPTION_MAX} characters.</p>
          </div>
          <div class="field">
            <label class="label" for="sound-upload-file">MP3 or Opus</label>
            <input id="sound-upload-file" type="file" name="file" accept=".mp3,.opus" required
              onChange$={(_, input) => {
                const file = input.files?.[0];
                input.setCustomValidity(file && file.size > MAX_UPLOAD_BYTES ? 'Choose a file up to 3.9 MB.' : '');
              }} />
          </div>
          <div class="field">
            <label class="label" for="sound-upload-tags">Tags, separated by commas</label>
            <input id="sound-upload-tags" class="input" name="tags" />
          </div>
          <div class="field">
            <label class="label" for="sound-upload-visibility">Visibility</label>
            <select id="sound-upload-visibility" class="select" name="visibility">
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          <button type="submit" class="button button--secondary" disabled={upload.isRunning}>Upload</button>
          {upload.value?.message && <p role="alert">{upload.value.message}</p>}
        </Form>
      </details>
      <SoundLibrary source={{ scope: 'guild', guildId: location.params.guildId, guildName: guild.value.name, library, analytics }} />
    </>
  );
});
