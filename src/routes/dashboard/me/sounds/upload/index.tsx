import { component$, useStyles$ } from '@qwik.dev/core';
import { Form, Link, type DocumentHead } from '@qwik.dev/router';
import { Icon } from '../../../../../components/dashboard/icons';
import { NAME_MAX, UPLOAD_MAX_BYTES, useUploadSound } from '../../../../../lib/sound-editor';
import { SoundLibrary } from '../../../../../lib/sound-library';
import { DESCRIPTION_MAX, MAX_TAGS } from '../../../../../lib/sounds';
import { useAccount } from '../../../layout';
import soundStyles from '../../../../../components/sounds/sounds.css?inline';

export { useUploadSound };

export default component$(() => {
  useStyles$(soundStyles);
  const account = useAccount();
  const upload = useUploadSound();
  const { guilds } = account.value;

  return (
    <main class="container upload">
      <nav aria-label="Breadcrumb">
        <Link href={SoundLibrary.MY_PATH} class="crumb"><Icon name="back" /><span>My sounds</span></Link>
      </nav>
      <header class="settings-head__text">
        <p class="overline">Your profile</p>
        <h1 class="settings-head__title">Upload a sound</h1>
        <p class="text-muted">After the upload, change name, image, tags and visibility from My sounds.</p>
      </header>
      <div class="upload__grid">
        <Form action={upload} enctype="multipart/form-data" class="card settings-card upload__form">
          {upload.value?.message && (
            <div class="callout callout--danger" role="alert">
              <Icon name="warning" />
              <p>{upload.value.message}</p>
            </div>
          )}
          <div class="field">
            <label class="label" for="upload-file">File</label>
            <input id="upload-file" type="file" name="file" accept=".mp3,.opus,audio/mpeg,audio/ogg" required
              onChange$={(_, input) => {
                const file = input.files?.[0];
                input.setCustomValidity(file && file.size > UPLOAD_MAX_BYTES ? 'Choose a file up to 3.9 MB.' : '');
              }} />
          </div>
          <div class="field">
            <label class="label" for="upload-name">Name</label>
            <input id="upload-name" class="input" name="name" maxLength={NAME_MAX} required autocomplete="off" />
            <p class="hint">Up to {NAME_MAX} characters. Members find it by this name.</p>
          </div>
          <div class="field">
            <label class="label" for="upload-description">Description (optional)</label>
            <textarea id="upload-description" class="textarea" name="description" rows={3} maxLength={DESCRIPTION_MAX} />
          </div>
          <div class="field">
            <label class="label" for="upload-tags">Tags (optional)</label>
            <input id="upload-tags" class="input" name="tags" autocomplete="off" placeholder="meme, airhorn" />
            <p class="hint">Up to {MAX_TAGS}, separated by commas.</p>
          </div>
          <div class="field">
            <label class="label" for="upload-guild">Server</label>
            <select id="upload-guild" class="select" name="guildId" required>
              {guilds.map((guild) => <option key={guild.id} value={guild.id}>{guild.name}</option>)}
            </select>
            <p class="hint">Beebot must be in the server. A private sound plays only there.</p>
          </div>
          <div class="field">
            <span class="label" id="upload-visibility">Visibility</span>
            <div class="segmented" role="radiogroup" aria-labelledby="upload-visibility">
              <label class="segmented__item"><input type="radio" class="segmented__input" name="visibility" value="public" checked />Public</label>
              <label class="segmented__item"><input type="radio" class="segmented__input" name="visibility" value="private" />Private</label>
            </div>
          </div>
          <button type="submit" class="button button--primary" disabled={upload.isRunning || !guilds.length} aria-busy={upload.isRunning}>
            {upload.isRunning ? 'Uploading…' : 'Upload'}
          </button>
        </Form>
        <aside class="card settings-card upload__rules" aria-labelledby="upload-rules">
          <h2 id="upload-rules" class="chart-block__title">Rules</h2>
          <ul>
            <li>MP3 or Opus, up to 3.9 MB.</li>
            <li>Only sounds you have the right to share.</li>
            <li>Public sounds appear in Explore and on your creator page.</li>
          </ul>
        </aside>
      </div>
    </main>
  );
});

export const head: DocumentHead = {
  title: 'Upload a sound · Beebot',
};
