import { createContextId } from '@qwik.dev/core';
import type { CatalogSort, LengthFilter, SoundCard } from '../../lib/catalog';

export interface SearchState {
  query: string;
  submitted: string | null;
  tag: string | null;
  sort: CatalogSort | null;
  length: LengthFilter;
  preview: SoundCard | null;
}

export const SearchContext = createContextId<SearchState>('beebot.catalog.search');

export function emptySearch(): SearchState {
  return { query: '', submitted: null, tag: null, sort: null, length: 'any', preview: null };
}
