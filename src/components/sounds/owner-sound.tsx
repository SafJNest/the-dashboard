import { $, component$, Pending, sync$, useComputed$, useSignal, useTask$ } from '@qwik.dev/core';
import { Form, useNavigate } from '@qwik.dev/router';
import { IMAGE_TYPES, toSoundCard } from '../../lib/catalog';
import { NAME_MAX, useDeleteSound, useOwnedSoundCard, useRemoveSoundImage, useSearchTags, useSetSoundImage, useUpdateSound } from '../../lib/sound-editor';
import { SoundLibrary } from '../../lib/sound-library';
import { useSoundAnalytics } from '../../lib/sound-loaders';
import { formatCount } from '../../lib/sound-stats';
import { DESCRIPTION_MAX, MAX_TAGS, type Sound } from '../../lib/sounds';
import { SoundPanel } from '../catalog/sound-panel';
import { Icon } from '../dashboard/icons';
import { SaveDock } from '../dashboard/save-dock';
import { DayBars } from './sound-charts';
import { GreetPicker } from './greet-picker';
import { Skeleton } from './library-states';

interface OwnerSoundProps {
  sound: Sound;
  guildName: string | null;
}

const RecentPlays = component$<{ soundId: string; name: string }>(({ soundId, name }) => {
  const analytics = useSoundAnalytics();
  const data = analytics.error ? null : analytics.value;
  const stats = data && !data.failed ? data.analytics : null;
  if ( stats?.soundId !== soundId ) { return <p class="caption">Daily plays are unavailable right now.</p>; }
  return <DayBars days={SoundLibrary.recentDays(stats.totals.playsPerDay)} label={`Plays of ${name} in the last ${SoundLibrary.RECENT_DAYS} days`} />;
});

export const OwnerSound = component$<OwnerSoundProps>(({ sound, guildName }) => {
  const navigate = useNavigate();
  const card = useOwnedSoundCard();
  const update = useUpdateSound();
  const setImage = useSetSoundImage();
  const removeImage = useRemoveSoundImage();
  const remove = useDeleteSound();
  const search = useSearchTags();
  const dialog = useSignal<HTMLDialogElement>();
  const name = useSignal(sound.name);
  const description = useSignal(sound.description ?? '');
  const isPublic = useSignal(sound.public);
  const tags = useSignal(sound.tags.map((tag) => tag.name));
  const tagQuery = useSignal('');
  const formId = `sound-edit-${sound.id}`;
  const inForm = { form: formId };
  const withTagList = { list: `${formId}-tag-list` };
  const live = card.value.soundId === sound.id ? card.value.card : null;
  const imageMessage = setImage.value?.message ?? removeImage.value?.message ?? (live ? null : card.value.message);
  const typed = tagQuery.value.trim();
  const suggestions = search.value?.query === typed ? search.value.tags.filter((tag) => !tags.value.includes(tag.name)) : [];

  const dirty = useComputed$(() => {
    const sameTags = tags.value.join('\n') === sound.tags.map((tag) => tag.name).join('\n');
    const sameText = name.value === sound.name && description.value === (sound.description ?? '');
    return !sameText || isPublic.value !== sound.public || !sameTags;
  });

  useTask$(({ track, cleanup }) => {
    const value = track(() => tagQuery.value.trim());
    if ( !value ) { return; }
    const timer = setTimeout(() => search.submit({ q: value }), 200);
    cleanup(() => clearTimeout(timer));
  });

  const addTag = $((value: string) => {
    const tag = value.trim();
    tagQuery.value = '';
    const isNew = tag && !tags.value.includes(tag);
    isNew && tags.value.length < MAX_TAGS && (tags.value = [...tags.value, tag]);
  });

  const reset = $(() => {
    name.value = sound.name;
    description.value = sound.description ?? '';
    isPublic.value = sound.public;
    tags.value = sound.tags.map((tag) => tag.name);
    tagQuery.value = '';
  });

  return (
    <SoundPanel sound={{ ...toSoundCard(sound), imageUrl: live?.imageUrl ?? null }} live={live} mode="owner" signedIn loginHref="/auth/login/" uploadedIn={guildName} comments="lazy">
      <div q:slot="title" class="owner-title">
        <label class="visually-hidden" for={`${formId}-name`}>Name</label>
        <input id={`${formId}-name`} class="input owner-title__input" name="name" {...inForm} maxLength={NAME_MAX} required autocomplete="off" bind:value={name} />
      </div>
      <GreetPicker q:slot="greet" soundId={sound.id} soundName={sound.name} variant="button" />
      <div q:slot="owner" class="owner-blocks">
        {update.value && !update.value.ok && <p class="callout callout--danger" role="alert">{update.value.message}</p>}
        <section class="owner-block" aria-labelledby={`${formId}-image`}>
          <h3 id={`${formId}-image`} class="chart-block__title">Image</h3>
          <div class="sound-image__actions">
            <Form action={setImage} enctype="multipart/form-data">
              <input type="hidden" name="soundId" value={sound.id} />
              <label class="button button--secondary button--sm">
                <Icon name="plus" />
                <span>{setImage.isRunning ? 'Uploading…' : live?.imageUrl ? 'Replace image' : 'Upload image'}</span>
                <input type="file" name="file" accept={IMAGE_TYPES.join(',')} class="visually-hidden" aria-label={`Image for ${sound.name}`} onChange$={(_, input) => input.form?.requestSubmit()} />
              </label>
            </Form>
            {live?.imageUrl && (
              <Form action={removeImage}>
                <input type="hidden" name="soundId" value={sound.id} />
                <button type="submit" class="button button--ghost button--sm" disabled={removeImage.isRunning}>Remove</button>
              </Form>
            )}
          </div>
          <p class="hint">PNG, JPEG or GIF, up to 1 MB. Square works best.</p>
          {imageMessage && <p class="callout callout--danger" role="alert">{imageMessage}</p>}
        </section>
        <section class="owner-block">
          <div class="field-row">
            <label class="label" for={`${formId}-description`}>Description</label>
            <span class="caption">{[...description.value].length} / {DESCRIPTION_MAX}</span>
          </div>
          <textarea id={`${formId}-description`} class="textarea" name="description" {...inForm} rows={3} maxLength={DESCRIPTION_MAX} bind:value={description} />
        </section>
        <section class="owner-block">
          <span class="label" id={`${formId}-visibility`}>Visibility</span>
          <div class="segmented" role="radiogroup" aria-labelledby={`${formId}-visibility`}>
            <label class="segmented__item">
              <input type="radio" class="segmented__input" name="public" value="true" {...inForm} checked={isPublic.value} onChange$={() => (isPublic.value = true)} />
              Public
            </label>
            <label class="segmented__item">
              <input type="radio" class="segmented__input" name="public" value="false" {...inForm} checked={!isPublic.value} onChange$={() => (isPublic.value = false)} />
              Private
            </label>
          </div>
          <p class="hint">{isPublic.value ? 'Anyone can find it in Explore, play it from any server and open its page.' : 'Only you can see it. It plays only in the server it was uploaded to and has no public page.'}</p>
        </section>
        <section class="owner-block">
          <div class="field-row">
            <span class="label" id={`${formId}-tags`}>Tags</span>
            <span class="caption">{tags.value.length} / {MAX_TAGS}</span>
          </div>
          <div class="tag-box">
            <div class="tag-box__field" role="group" aria-labelledby={`${formId}-tags`}>
              {tags.value.map((tag) => (
                <span class="chip" key={tag}>
                  #{tag}
                  <input type="hidden" name="tags[]" value={tag} {...inForm} />
                  <button type="button" class="chip__remove" aria-label={`Remove tag ${tag}`} onClick$={() => (tags.value = tags.value.filter((item) => item !== tag))}>
                    <Icon name="close" />
                  </button>
                </span>
              ))}
              {tags.value.length < MAX_TAGS && (
                <input
                  class="tag-box__input"
                  {...withTagList}
                  aria-label="Add tag"
                  placeholder="Add tag"
                  autocomplete="off"
                  bind:value={tagQuery}
                  onKeyDown$={[
                    sync$((event: KeyboardEvent) => event.key === 'Enter' && event.preventDefault()),
                    $((event: KeyboardEvent) => {
                      event.key === 'Enter' && addTag(tagQuery.value);
                      const removesLast = event.key === 'Backspace' && !tagQuery.value && tags.value.length > 0;
                      removesLast && (tags.value = tags.value.slice(0, -1));
                    }),
                  ]}
                />
              )}
            </div>
            <datalist id={`${formId}-tag-list`}>
              {suggestions.map((tag) => <option key={tag.id} value={tag.name} />)}
            </datalist>
          </div>
          <p class="hint">Press Enter to add a tag.</p>
        </section>
        <section class="owner-block owner-block--wide" aria-labelledby={`${formId}-stats`}>
          <h3 id={`${formId}-stats`} class="chart-block__title">How it's doing</h3>
          <dl class="catalog-facts">
            <div><dt>Plays</dt><dd>{formatCount(sound.plays)}</dd></div>
            <div><dt>Listeners</dt><dd>{formatCount(sound.listeners)}</dd></div>
            <div><dt>Likes</dt><dd>{formatCount(sound.likes)}</dd></div>
            <div><dt>On soundboards</dt><dd>{formatCount(sound.soundboardCount)}</dd></div>
          </dl>
          <Pending fallback$={() => <Skeleton width="100%" height="5rem" />}>
            <RecentPlays soundId={sound.id} name={sound.name} />
          </Pending>
          <p class="privacy-note"><Icon name="lock" />Only you can see these numbers.</p>
        </section>
        <section class="owner-block owner-block--row">
          {sound.url && (
            <a href={sound.url} class="button button--secondary button--sm" download>
              <Icon name="download" />Download
            </a>
          )}
          {sound.canDelete && (
            <button type="button" class="button button--danger button--sm" onClick$={() => dialog.value?.showModal()}>
              <Icon name="trash" />Delete sound
            </button>
          )}
        </section>
        <Form id={formId} action={update} class="owner-form">
          <input type="hidden" name="soundId" value={sound.id} />
          <SaveDock dirty={dirty} action={update} onReset$={reset} />
        </Form>
        {sound.canDelete && (
          <dialog ref={dialog} class="card card--raised confirm" aria-labelledby={`${formId}-delete`}>
            <Form
              action={remove}
              class="confirm__body"
              onSubmitCompleted$={async (event) => {
                if ( !event.detail.value?.ok ) { return; }
                dialog.value?.close();
                await navigate(SoundLibrary.myPath());
              }}
            >
              <input type="hidden" name="soundId" value={sound.id} />
              <h2 id={`${formId}-delete`} class="chart-block__title">Delete “{sound.name}”?</h2>
              <p class="text-muted">It stops working everywhere, including greets and soundboards. This can't be undone.</p>
              {remove.value?.message && <p class="callout callout--danger" role="alert">{remove.value.message}</p>}
              <div class="confirm__actions">
                <button type="button" class="button button--ghost button--sm" disabled={remove.isRunning} onClick$={() => dialog.value?.close()}>Cancel</button>
                <button type="submit" class="button button--danger button--sm" disabled={remove.isRunning}>{remove.isRunning ? 'Deleting…' : 'Delete'}</button>
              </div>
            </Form>
          </dialog>
        )}
      </div>
    </SoundPanel>
  );
});
