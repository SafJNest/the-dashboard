import type { DocumentHeadValue, DocumentMeta } from '@qwik.dev/router';

export interface PageMeta {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  indexed?: boolean;
}

export const NOINDEX: DocumentMeta = { key: 'robots', name: 'robots', content: 'noindex' };

export function pageHead(url: URL, page: PageMeta): DocumentHeadValue {
  const description: DocumentMeta = { key: 'description', name: 'description', content: page.description };
  if ( page.indexed === false ) { return { title: page.title, meta: [description, NOINDEX] }; }
  const canonical = new URL(page.path, url.origin).href;
  const meta: DocumentMeta[] = [
    description,
    { key: 'og:title', property: 'og:title', content: page.title },
    { key: 'og:description', property: 'og:description', content: page.description },
    { key: 'og:url', property: 'og:url', content: canonical },
  ];
  page.image && meta.push({ key: 'og:image', property: 'og:image', content: page.image });
  return { title: page.title, meta, links: [{ key: 'canonical', rel: 'canonical', href: canonical }] };
}
