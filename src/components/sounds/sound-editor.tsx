import { $, component$, sync$, useSignal, useStyles$, useTask$ } from '@qwik.dev/core';
import { Form, Link } from '@qwik.dev/router';
import { useAccount } from '../../routes/dashboard/layout';
import { useDeleteSound, useSearchTags, useUpdateSound } from '../../routes/dashboard/me/sounds/[soundId]/edit/index';
import { formatAdded, formatCount, formatLength } from '../../lib/sound-stats';
import { MAX_TAGS, type Sound } from '../../lib/sounds';
import { Icon } from '../dashboard/icons';
import { SaveDock } from '../dashboard/save-dock';
import { GreetPicker } from './greet-picker';
import { Toast } from '../toast/toast';
import styles from './sounds.css?inline';

export const SoundEditor = component$<{ sound: Sound }>(({ sound: initial }) => {
  useStyles$(styles);
  const account = useAccount();
  const update = useUpdateSound();
  const remove = useDeleteSound();
  const search = useSearchTags();
  const sound = update.value?.ok && update.value.sound ? update.value.sound : initial;
  const dialog = useSignal<HTMLDialogElement>();
  const audio = useSignal<HTMLAudioElement>();
  const playing = useSignal(false);
  const dirty = useSignal(false);
  const name = useSignal(sound.name);
  const isPublic = useSignal(sound.public);
  const tags = useSignal(sound.tags.map((tag) => tag.name));
  const query = useSignal('');
  const guildName = account.value.guilds.find((guild) => guild.id === sound.guildId)?.name ?? 'Another server';
  const typed = query.value.trim();
  const suggestions = search.value?.query === typed ? search.value.tags.filter((tag) => !tags.value.includes(tag.name)).slice(0, 6) : [];
  const listOpen = typed.length > 0 && suggestions.length > 0 && tags.value.length < MAX_TAGS;
  const result = update.value;
  const saved = result?.ok === true;
  const detailHref = `/dashboard/me/sounds/${sound.id}/`;

  useTask$(({ track, cleanup }) => {
    const value = track(() => query.value.trim());
    if (!value) return;
    const timer = setTimeout(() => search.submit({ q: value }), 200);
    cleanup(() => clearTimeout(timer));
  });

  const addTag = $((value: string) => {
    const tag = value.trim();
    query.value = '';
    if (!tag || tags.value.includes(tag) || tags.value.length >= MAX_TAGS) return;
    tags.value = [...tags.value, tag];
    dirty.value = true;
  });

  const removeTag = $((value: string) => {
    tags.value = tags.value.filter((tag) => tag !== value);
    dirty.value = true;
  });

  const reset = $(() => {
    name.value = sound.name;
    isPublic.value = sound.public;
    tags.value = sound.tags.map((tag) => tag.name);
    query.value = '';
    dirty.value = false;
  });

  const togglePlay = $(async () => {
    const element = audio.value;
    if (!element || !sound.url) return;
    if (playing.value) {
      element.pause();
      playing.value = false;
      return;
    }
    playing.value = true;
    try {
      await element.play();
    } catch {
      playing.value = false;
    }
  });

  return (
    <div class="container sound-editor">
      <nav class="sound-editor__crumbs" aria-label="Breadcrumb">
        {saved ? (
          <a href={detailHref} class="crumb">
            <Icon name="back" />
            <span>My sounds</span>
          </a>
        ) : (
          <Link href={detailHref} class="crumb">
            <Icon name="back" />
            <span>My sounds</span>
          </Link>
        )}
        <span class="crumb-sep" aria-hidden="true">/</span>
        <span>{sound.name}</span>
      </nav>
      <header class="settings-head__text">
        <p class="overline">{sound.canEdit ? 'Your sound' : guildName}</p>
        <h1 class="settings-head__title">{sound.canEdit ? 'Edit sound' : 'Manage sound'}</h1>
      </header>

      <div class="sound-editor__grid">
        <div class="sound-editor__stack">
          <section class={['card card--raised sound-head', sound.ownedByMe && 'sound-head--mine']} aria-label="Player">
            <div class="sound-head__top">
              <button type="button" class="play sound-head__play" aria-label={`${playing.value ? 'Pause' : 'Play'} ${sound.name}`} disabled={!sound.url} onClick$={togglePlay}>
                <Icon name={playing.value ? 'pause' : 'play'} />
              </button>
              <div class="sound-editor__identity">
                <h2 class="sound-head__title">{sound.name}</h2>
                <span class="caption">
                  {guildName} · <span class="mono">{formatLength(sound.durationMs)}</span> · added {formatAdded(sound.createdAt)}
                </span>
              </div>
            </div>
          </section>

          {sound.canEdit ? (
            <Form
              action={update}
              class="card settings-card sound-editor__form"
              onInput$={(event) => {
                if ((event.target as HTMLInputElement).name) dirty.value = true;
              }}
              onSubmitCompleted$={(event) => {
                if (event.detail.value?.ok) dirty.value = false;
              }}
            >
              <h2 class="chart-block__title">Details</h2>
              {result && !result.ok && (
                <div class="callout callout--danger" role="alert">
                  <Icon name="warning" />
                  <p>{result.message}</p>
                </div>
              )}
              <div class="field">
                <label class="label" for="sound-name">Name</label>
                <input id="sound-name" class="input" name="name" bind:value={name} required autocomplete="off" />
                <p class="hint">How members find it with /play sound and search.</p>
              </div>
              <div class="field">
                <span class="label" id="sound-visibility">Visibility</span>
                <div class="segmented" role="radiogroup" aria-labelledby="sound-visibility">
                  <label class="segmented__item">
                    <input type="radio" class="segmented__input" name="public" value="true" checked={isPublic.value} onChange$={() => (isPublic.value = true)} />
                    Public
                  </label>
                  <label class="segmented__item">
                    <input type="radio" class="segmented__input" name="public" value="false" checked={!isPublic.value} onChange$={() => (isPublic.value = false)} />
                    Private
                  </label>
                </div>
                <p class="hint">Public sounds can be found and played from any server. Private sounds stay in the server they were uploaded to.</p>
              </div>
              <div class="field">
                <div class="field-row">
                  <span class="label" id="sound-tags">Tags</span>
                  <span class="caption">{tags.value.length} / {MAX_TAGS}</span>
                </div>
                <div class="tag-box">
                  <div class="tag-box__field" role="group" aria-labelledby="sound-tags">
                    {tags.value.map((tag) => (
                      <span class="chip" key={tag}>
                        {tag}
                        <input type="hidden" name="tags[]" value={tag} />
                        <button type="button" class="chip__remove" aria-label={`Remove tag ${tag}`} onClick$={() => removeTag(tag)}>
                          <Icon name="close" />
                        </button>
                      </span>
                    ))}
                    {tags.value.length < MAX_TAGS && (
                      <input
                        class="tag-box__input"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-controls="sound-tag-list"
                        aria-expanded={listOpen}
                        aria-label="Add tag"
                        placeholder="Add tag"
                        autocomplete="off"
                        bind:value={query}
                        onKeyDown$={[
                          sync$((event: KeyboardEvent) => {
                            if (event.key === 'Enter') event.preventDefault();
                          }),
                          $((event: KeyboardEvent) => {
                            if (event.key === 'Enter') addTag(suggestions[0]?.name ?? query.value);
                            if (event.key === 'Escape') query.value = '';
                            if (event.key === 'Backspace' && !query.value && tags.value.length) removeTag(tags.value[tags.value.length - 1]);
                          }),
                        ]}
                      />
                    )}
                  </div>
                  {listOpen && (
                    <div id="sound-tag-list" class="listbox tag-box__list" role="listbox" aria-label="Suggested tags">
                      {suggestions.map((tag) => {
                        const at = tag.name.toLowerCase().indexOf(typed.toLowerCase());
                        return (
                          <button type="button" role="option" aria-selected="false" class="option tag-box__option" key={tag.id} onClick$={() => addTag(tag.name)}>
                            {at < 0 ? (
                              tag.name
                            ) : (
                              <span>
                                {tag.name.slice(0, at)}
                                <mark>{tag.name.slice(at, at + typed.length)}</mark>
                                {tag.name.slice(at + typed.length)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p class="hint" role="status">
                  {typed && search.value?.query === typed && search.value.failed
                    ? 'Tag suggestions are unavailable right now. You can still add tags.'
                    : typed && search.isRunning
                      ? 'Looking for tags…'
                      : 'Type to see existing tags. Press Enter to add.'}
                </p>
              </div>
              {result?.ok && !dirty.value && (
                <Toast class="settings-status" title="Changes saved" />
              )}
              <SaveDock dirty={dirty} action={update} onReset$={reset} />
            </Form>
          ) : (
            <div class="callout callout--info" role="note">
              <Icon name="info" />
              <p>Only the uploader can edit this sound. As an administrator of the server it was uploaded to, you can delete it.</p>
            </div>
          )}
        </div>

        <div class="sound-editor__stack">
          <section class="card settings-card" aria-labelledby="sound-stats">
            <div class="chart-block__head">
              <h2 id="sound-stats" class="chart-block__title">Stats</h2>
              <span class="caption">All time · every server</span>
            </div>
            <div class="stat-tiles">
              <div class="stat-tile">
                <span class="overline">Plays</span>
                <strong>{formatCount(sound.plays)}</strong>
              </div>
              <div class="stat-tile">
                <span class="overline">Listeners</span>
                <strong>{formatCount(sound.listeners)}</strong>
              </div>
              <div class="stat-tile">
                <span class="overline">Likes</span>
                <strong>{formatCount(sound.likes)}</strong>
              </div>
              <div class="stat-tile">
                <span class="overline">Dislikes</span>
                <strong>{formatCount(sound.dislikes)}</strong>
              </div>
            </div>
            {saved ? (
              <a href={detailHref} class="button button--secondary button--sm sound-editor__stats-link">
                Full analytics
              </a>
            ) : (
              <Link href={detailHref} class="button button--secondary button--sm sound-editor__stats-link">
                Full analytics
              </Link>
            )}
          </section>

          <section class="card settings-card" aria-labelledby="sound-actions">
            <h2 id="sound-actions" class="chart-block__title">Actions</h2>
            <div class="field">
              <span class="label">Greet</span>
              <GreetPicker soundId={sound.id} soundName={sound.name} variant="field" />
              <p class="hint">Plays when you join a voice channel. A server greet wins over the global one.</p>
            </div>
            <div class="sound-editor__buttons">
              {sound.url && (
                <a href={sound.url} class="button button--secondary button--sm" download>
                  <Icon name="download" />
                  <span>Download</span>
                </a>
              )}
              {sound.canDelete && (
                <button type="button" class="button button--danger button--sm" onClick$={() => dialog.value?.showModal()}>
                  <Icon name="trash" />
                  <span>Delete sound</span>
                </button>
              )}
            </div>
            {sound.canDelete && <p class="hint">Deleting also removes it from any greet that uses it. This can't be undone.</p>}
          </section>
        </div>
      </div>

      {sound.canDelete && (
        <dialog ref={dialog} class="card card--raised confirm" aria-labelledby="delete-title">
          <Form
            action={remove}
            class="confirm__body"
            onSubmitCompleted$={(event) => {
              if (event.detail.value?.ok) window.location.assign('/dashboard/me/sounds/');
            }}
          >
            <h2 id="delete-title" class="chart-block__title">Delete “{sound.name}”?</h2>
            <p class="text-muted">It will stop working everywhere, including greets. This can't be undone.</p>
            {remove.value?.ok && <p class="caption" role="status">Sound deleted. Opening your library…</p>}
            {remove.value?.message && (
              <p class="callout callout--danger" role="alert">
                {remove.value.message}
              </p>
            )}
            <div class="confirm__actions">
              <button type="button" class="button button--ghost button--sm" disabled={remove.isRunning || remove.value?.ok} onClick$={() => dialog.value?.close()}>
                Cancel
              </button>
              <button type="submit" class="button button--danger button--sm" disabled={remove.isRunning || remove.value?.ok}>
                {remove.isRunning ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </Form>
        </dialog>
      )}

      {sound.url && (
        <audio
          ref={audio}
          src={sound.url}
          preload="none"
          onEnded$={() => {
            playing.value = false;
          }}
        />
      )}
    </div>
  );
});
