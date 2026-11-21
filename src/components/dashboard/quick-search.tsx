import { $, component$, noSerialize, useContext, useSignal, useStyles$, type NoSerialize } from '@qwik.dev/core';
import { useNavigate } from '@qwik.dev/router';
import { boardPath, QUERY_MAX, soundPath, SOUNDS_PATH, type Suggestions } from '../../lib/catalog';
import type { TagCount } from '../../lib/sounds';
import { BoardThumb } from '../catalog/board-items';
import { SearchContext } from '../catalog/catalog-context';
import { loadPopularTags, suggestSounds } from '../catalog/catalog-server';
import { Highlight, SoundThumb } from '../catalog/sound-items';
import { Icon } from './icons';
import styles from './header-menus.css?inline';

const QUICK_SOUNDS = 4;
const QUICK_BOARDS = 2;
const QUICK_TAGS = 3;
const SUGGEST_DELAY_MS = 180;
const POPOVER_ID = 'quick-search';

export const QuickSearch = component$(() => {
  useStyles$(styles);
  const search = useContext(SearchContext);
  const navigate = useNavigate();
  const popover = useSignal<HTMLElement>();
  const query = useSignal('');
  const found = useSignal<Suggestions | null>(null);
  const tags = useSignal<TagCount[] | null>(null);
  const timer = useSignal<number | null>(null);
  const request = useSignal<NoSerialize<AbortController>>();

  const opened = $(async () => {
    popover.value?.querySelector<HTMLInputElement>('input')?.focus();
    if ( tags.value ) { return; }
    tags.value = await loadPopularTags().catch(() => []);
  });

  const suggest = $((value: string) => {
    timer.value !== null && window.clearTimeout(timer.value);
    request.value?.abort();
    const typed = value.trim().replace(/^#/, '');
    if ( !typed ) { found.value = null; return; }
    timer.value = window.setTimeout(async () => {
      const controller = new AbortController();
      request.value = noSerialize(controller);
      const result = await suggestSounds(controller.signal, typed).catch(() => null);
      if ( controller.signal.aborted ) { return; }
      found.value = result?.ok ? result.data : null;
    }, SUGGEST_DELAY_MS);
  });

  const go = $(async (path: string) => {
    popover.value?.hidePopover();
    await navigate(path);
  });

  const explore = $(async (value: string) => {
    const typed = value.trim();
    const tag = typed.startsWith('#') ? typed.slice(1).trim() || null : null;
    search.query = typed;
    search.tag = tag;
    search.submitted = typed && !tag ? typed : tag ? '' : null;
    search.type = tag ? 'sounds' : 'all';
    await go(`${SOUNDS_PATH}/`);
  });

  const typed = query.value.trim().replace(/^#/, '');
  const results = found.value;

  return (
    <>
      <button type="button" class="appbar__link appbar__search" popovertarget={POPOVER_ID}>
        <Icon name="search" />
        <span>Explore sounds</span>
      </button>
      <div ref={popover} id={POPOVER_ID} popover="auto" class="pop quick-search" aria-label="Explore sounds" onToggle$={(event) => (event as ToggleEvent).newState === 'open' && opened()}>
        <form role="search" class="quick-search__field" preventdefault:submit onSubmit$={() => explore(query.value)}>
          <Icon name="search" />
          <input
            class="search-box__input"
            type="search"
            aria-label="Search sounds and soundboards"
            placeholder="Search sounds, boards or #tags"
            maxLength={QUERY_MAX}
            autocomplete="off"
            autofocus
            bind:value={query}
            onInput$={(_, element) => suggest(element.value)}
          />
        </form>
        {typed && results ? (
          <div class="quick-search__results" role="listbox" aria-label="Suggestions">
            {results.sounds.length > 0 && <p class="suggest__group">Sounds</p>}
            {results.sounds.slice(0, QUICK_SOUNDS).map((sound) => (
              <button key={sound.id} type="button" class="option" role="option" aria-selected="false" onClick$={() => go(soundPath(sound.id))}>
                <SoundThumb sound={sound} size="sm" />
                <Highlight text={sound.name} query={typed} />
              </button>
            ))}
            {results.boards.length > 0 && <p class="suggest__group">Soundboards</p>}
            {results.boards.slice(0, QUICK_BOARDS).map((board) => (
              <button key={board.id} type="button" class="option" role="option" aria-selected="false" onClick$={() => go(boardPath(board.id))}>
                <BoardThumb board={board} size="sm" />
                <Highlight text={board.name} query={typed} />
              </button>
            ))}
            {results.tags.length > 0 && <p class="suggest__group">Tags</p>}
            {results.tags.slice(0, QUICK_TAGS).map((tag) => (
              <button key={tag.id} type="button" class="option" role="option" aria-selected="false" onClick$={() => explore(`#${tag.name}`)}>
                <span class="suggest__hash" aria-hidden="true">#</span>
                <Highlight text={tag.name} query={typed} />
              </button>
            ))}
          </div>
        ) : (
          <div class="quick-search__results">
            {tags.value && tags.value.length > 0 && (
              <>
                <p class="suggest__group">Popular tags</p>
                <div class="catalog-filters__tags">
                  {tags.value.map((tag) => (
                    <button key={tag.id} type="button" class="catalog-chip" onClick$={() => explore(`#${tag.name}`)}>#{tag.name}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <button type="button" class="option quick-search__all" onClick$={() => explore(query.value)}>
          <span class="option__title">{typed ? `See all results for “${query.value.trim()}”` : 'Open Explore'}</span>
          <kbd class="kbd">↵</kbd>
        </button>
      </div>
    </>
  );
});
