import { $, component$, Slot, sync$, useOnDocument, useSignal, type Signal } from '@qwik.dev/core';
import { Icon } from '../dashboard/icons';

export function closeCombo(element: Element) {
  const details = element.closest('details');
  if (!details) return;
  details.open = false;
  details.querySelector('summary')?.focus();
}

export const closeOnPick = $((event: Event, element: Element) => {
  if ((event as MouseEvent).detail > 0) closeCombo(element);
});

interface ComboProps {
  id: string;
  labelId: string;
  query: Signal<string>;
  searchLabel: string;
}

export const Combo = component$<ComboProps>(({ id, labelId, query, searchLabel }) => {
  const menu = useSignal<HTMLDetailsElement>();

  useOnDocument('click', $((event) => {
    if (menu.value?.open && !menu.value.parentElement?.contains(event.target as Node)) menu.value.open = false;
  }));
  useOnDocument('keydown', $((event) => {
    if ((event as KeyboardEvent).key !== 'Escape' || !menu.value?.open) return;
    closeCombo(menu.value);
  }));

  return (
    <div class="combo">
      <details
        class="combo__menu"
        ref={menu}
        onToggle$={(_, details) => {
          if (details.open) details.querySelector<HTMLInputElement>('.combo__search input')?.focus();
          else query.value = '';
        }}
      >
        <summary class="combo__trigger" aria-labelledby={`${labelId} ${id}-value`} />
        <div class="combo__pop">
          <div class="combo__search">
            <Icon name="search" />
            <input
              type="search"
              class="input input--sm"
              placeholder={searchLabel}
              aria-label={searchLabel}
              autocomplete="off"
              bind:value={query}
              onKeyDown$={sync$((event: KeyboardEvent) => {
                if (event.key === 'Enter') event.preventDefault();
              })}
            />
          </div>
          <div class="combo__list" role="group" aria-labelledby={labelId}>
            <Slot />
          </div>
          <Slot name="footer" />
        </div>
      </details>
      <div class="combo__value" id={`${id}-value`}>
        <Slot name="value" />
      </div>
      <span class="combo__chevron">
        <Icon name="chevronDown" />
      </span>
    </div>
  );
});
