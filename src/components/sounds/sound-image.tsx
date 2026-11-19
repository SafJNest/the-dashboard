import { component$, useSignal } from '@qwik.dev/core';
import { Form } from '@qwik.dev/router';
import { IMAGE_TYPES } from '../../lib/catalog';
import { useRemoveSoundImage, useSetSoundImage, useSoundImage } from '../../routes/dashboard/me/sounds/[soundId]/edit/index';
import { Icon } from '../dashboard/icons';

export const SoundImage = component$<{ name: string }>(({ name }) => {
  const loaded = useSoundImage();
  const upload = useSetSoundImage();
  const remove = useRemoveSoundImage();
  const removed = useSignal(false);
  const uploaded = upload.value?.ok ? upload.value.imageUrl : null;
  const current = uploaded ?? (removed.value ? null : loaded.value.imageUrl);
  const message = upload.value?.message ?? remove.value?.message ?? loaded.value.message;

  return (
    <section class="card settings-card" aria-labelledby="sound-image">
      <h2 id="sound-image" class="chart-block__title">Image</h2>
      <div class="sound-image">
        <span class="sound-image__preview" aria-hidden="true">
          {current ? <img src={current} alt="" width={88} height={88} /> : <Icon name="sounds" />}
        </span>
        <div class="sound-image__body">
          <p class="hint">Shown in search, on your public profile and on the sound page. PNG, JPEG or GIF, up to 1 MB. Square works best.</p>
          <Form action={upload} enctype="multipart/form-data" class="sound-image__actions" onSubmitCompleted$={() => (removed.value = false)}>
            <label class="button button--secondary button--sm">
              <Icon name="plus" />
              <span>{current ? 'Replace image' : 'Upload image'}</span>
              <input type="file" name="file" accept={IMAGE_TYPES.join(',')} class="visually-hidden" aria-label={`Image for ${name}`} onChange$={(_, element) => element.form?.requestSubmit()} />
            </label>
          </Form>
          {current && (
            <Form action={remove} onSubmitCompleted$={() => (removed.value = remove.value?.ok === true)}>
              <button type="submit" class="button button--ghost button--sm" disabled={remove.isRunning}>Remove</button>
            </Form>
          )}
          {message && <p class="callout callout--danger" role="alert">{message}</p>}
        </div>
      </div>
    </section>
  );
});
