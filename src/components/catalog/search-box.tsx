import { $, component$, noSerialize, useContext, useSignal, useTask$, type NoSerialize, type QRL } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { QUERY_MAX, type SoundCard, type Suggestions } from '../../lib/catalog';
import { formatCompact, formatLength } from '../../lib/sound-stats';
import { Icon } from '../dashboard/icons';
import { SearchContext } from './catalog-context';
import { suggestSounds } from './catalog-server';
import { Highlight, PersonAvatar, SoundThumb } from './sound-items';

const SUGGEST_DELAY_MS = 180;
const SUGGEST_MIN_LENGTH = 2;

interface SearchBoxProps {
  base: string;
  compact: boolean;
  onSearch$: QRL<(query: string) => void>;
  onTag$: QRL<(tag: string) => void>;
  onPlay$: QRL<(sound: SoundCard) => void>;
}

export const SearchBox = component$<SearchBoxProps>(({ base, compact, onSearch$, onTag$, onPlay$ }) => {
  const search = useContext(SearchContext);
  const suggestions = useSignal<Suggestions | null>(null);
  const open = useSignal(false);
  const timer = useSignal<number | null>(null);
  const request = useSignal<NoSerialize<AbortController>>();
  const input = useSignal<HTMLInputElement>();

  const cancel = $(() => {
    timer.value !== null && window.clearTimeout(timer.value);
    timer.value = null;
    request.value?.abort();
    request.value = undefined;
  });

  const suggest = $(async (value: string) => {
    await cancel();
    const query = value.trim().replace(/^#/, '');
    if ( query.length < SUGGEST_MIN_LENGTH ) { suggestions.value = null; return; }
    timer.value = window.setTimeout(async () => {
      timer.value = null;
      if ( !input.value?.isConnected ) { return; }
      const controller = new AbortController();
      request.value = noSerialize(controller);
      const result = await suggestSounds(controller.signal, query).catch(() => null);
      if ( controller.signal.aborted ) { return; }
      request.value = undefined;
      suggestions.value = result?.ok ? result.data : null;
    }, SUGGEST_DELAY_MS);
  });

  const close = $(async () => {
    open.value = false;
    await cancel();
  });

  useTask$(({ track }) => {
    track(() => search.tag);
    close();
  });

  const submit = $(async () => {
    await close();
    onSearch$(search.query.trim());
  });

  const typed = search.query.trim().replace(/^#/, '');
  const hasSuggestions = !!suggestions.value && (suggestions.value.sounds.length > 0 || suggestions.value.tags.length > 0);

  return (
    <form
      class={['search-box', compact && 'search-box--compact']}
      role="search"
      preventdefault:submit
      onSubmit$={submit}
    >
      <div class="search-box__field">
        <Icon name="search" />
        <input
          ref={input}
          class="search-box__input"
          type="search"
          name="q"
          role="combobox"
          aria-label="Search sounds"
          aria-autocomplete="list"
          aria-controls="catalog-suggest"
          aria-expanded={open.value && hasSuggestions}
          placeholder="Search by name or #tag"
          maxLength={QUERY_MAX}
          autoComplete="off"
          value={search.query}
          onInput$={(_, element) => {
            search.query = element.value;
            open.value = true;
            suggest(element.value);
          }}
          onFocus$={() => {
            open.value = true;
          }}
          onKeyDown$={(event) => {
            event.key === 'Escape' && close();
          }}
        />
        <button type="submit" class="button button--primary button--sm search-box__submit">Search</button>
      </div>
      {open.value && typed && hasSuggestions && (
        <>
          <button type="button" class="catalog-scrim" aria-label="Close suggestions" onClick$={close} />
          <div id="catalog-suggest" class="suggest" role="listbox" aria-label="Suggestions">
            {suggestions.value!.sounds.length > 0 && <p class="suggest__group">Sounds</p>}
            {suggestions.value!.sounds.map((sound) => (
              <div key={sound.id} class="suggest__item" role="option" aria-selected="false">
                <button type="button" class="play catalog-row__play" aria-label={`Play ${sound.name}`} onClick$={async () => {
                  await close();
                  onPlay$(sound);
                }}>
                  <Icon name="play" />
                </button>
                <SoundThumb sound={sound} size="sm" />
                <Link href={`${base}/${sound.id}/`} class="catalog-row__link" aria-label={`Open ${sound.name}`} prefetchData="off" scroll={false} onClick$={async () => {
                  search.preview = sound;
                  await close();
                }} />
                <span class="catalog-row__main">
                  <Highlight text={sound.name} query={typed} />
                  <span class="catalog-who">
                    <PersonAvatar user={sound.uploader} size={16} />
                    <span>{sound.uploader.name}</span>
                  </span>
                </span>
                <span class="caption catalog-length">{formatLength(sound.durationMs)}</span>
              </div>
            ))}
            {suggestions.value!.tags.length > 0 && <p class="suggest__group">Tags</p>}
            {suggestions.value!.tags.map((tag) => (
              <button key={tag.id} type="button" class="suggest__tag" role="option" aria-selected="false" onClick$={async () => {
                await close();
                onTag$(tag.name);
              }}>
                <span class="suggest__hash" aria-hidden="true">#</span>
                <Highlight text={tag.name} query={typed} />
                <span class="caption">{formatCompact(tag.soundCount)} sounds</span>
              </button>
            ))}
            <p class="suggest__foot">Press Enter to see every result for “{search.query.trim()}”</p>
          </div>
        </>
      )}
    </form>
  );
});
