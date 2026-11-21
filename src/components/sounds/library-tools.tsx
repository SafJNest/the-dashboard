import { component$ } from '@qwik.dev/core';
import { SoundLibrary, type LibraryQuery, type LibrarySort } from '../../lib/sound-library';
import { Icon } from '../dashboard/icons';

interface LibraryToolsProps {
  query: LibraryQuery;
  label: string;
  field: 'owner' | 'visibility';
  filters: { value: string; label: string; count?: number }[];
  placeholder?: string;
  sorts?: LibrarySort[];
}

const SORTS: LibrarySort[] = ['plays', 'newest', 'name'];

export const LibraryTools = component$<LibraryToolsProps>(({ query, label, field, filters, placeholder = 'Search by name or #tag', sorts = SORTS }) => (
  <div class="catalog-filters library__tools">
    <label class="sound-list__search">
      <Icon name="search" />
      <span class="visually-hidden">Search</span>
      <input type="search" class="input input--sm" placeholder={placeholder} autocomplete="off" value={query.text} onInput$={(_, input) => (query.text = input.value)} />
    </label>
    <div class="filter-tabs" role="group" aria-label={label}>
      {filters.map((filter) => (
        <button key={filter.value} type="button" class="filter-tabs__item" aria-pressed={query[field] === filter.value} onClick$={() => Object.assign(query, { [field]: filter.value })}>
          {filter.label}
          {filter.count !== undefined && <span class="filter-tabs__count">{filter.count}</span>}
        </button>
      ))}
    </div>
    {sorts.length > 1 && (
      <>
        <label class="visually-hidden" for={`library-sort-${field}`}>Sort</label>
        <select id={`library-sort-${field}`} class="catalog-select" onChange$={(_, select) => (query.sort = select.value as LibrarySort)}>
          {sorts.map((sort) => <option key={sort} value={sort} selected={query.sort === sort}>{SoundLibrary.SORT_LABELS[sort]}</option>)}
        </select>
      </>
    )}
  </div>
));
