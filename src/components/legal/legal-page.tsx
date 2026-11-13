import { component$, Slot, useStyles$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { Icon } from '../dashboard/icons';
import styles from './legal.css?inline';

export interface LegalSection {
  id: string;
  label: string;
}

interface LegalPageProps {
  document: 'terms' | 'privacy';
  title: string;
  sections: LegalSection[];
}

const documents = [
  { id: 'terms', href: '/terms/', label: 'Terms of service' },
  { id: 'privacy', href: '/privacy/', label: 'Privacy policy' },
] as const;

export const LegalPage = component$<LegalPageProps>(({ document, title, sections }) => {
  useStyles$(styles);

  return (
    <main class="legal">
      <section class="page-hero">
        <div class="container page-hero__inner legal__hero">
          <p class="eyebrow">Legal</p>
          <h1 class="display display--lg page-hero__title">{title}</h1>
          <p class="text-muted">
            Effective <span class="legal-placeholder">[EFFECTIVE DATE]</span> · Last updated <span class="legal-placeholder">[DATE]</span>
          </p>
          <nav class="legal-tabs" aria-label="Legal documents">
            {documents.map((item) => (
              <Link key={item.id} href={item.href} class="legal-tabs__link" aria-current={item.id === document ? 'page' : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
      <div class="container legal__shell">
        <nav class="legal-toc" aria-label="On this page">
          <span class="overline legal-toc__title">On this page</span>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} class="legal-toc__link">
              {section.label}
            </a>
          ))}
        </nav>
        <article class="legal__body">
          <div class="callout callout--info" role="note">
            <Icon name="info" />
            <span>
              Template text. Fill the <span class="legal-placeholder">[PLACEHOLDERS]</span> and have it reviewed before publishing.
            </span>
          </div>
          <Slot />
        </article>
      </div>
    </main>
  );
});
