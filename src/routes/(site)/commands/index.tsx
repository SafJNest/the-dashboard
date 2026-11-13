import { $, component$, useStyles$ } from '@qwik.dev/core';
import { routeLoader$, type DocumentHead } from '@qwik.dev/router';
import { CommandEntryCard } from '../../../components/commands/command-entry';
import { Icon } from '../../../components/dashboard/icons';
import { EmptyState } from '../../../components/empty-state/empty-state';
import { getCommandSource } from '../../../lib/beebot/commands.server';
import { buildCommandCatalog, DEFAULT_PREFIX } from '../../../lib/commands';
import styles from './commands.css?inline';

export const useCommandCatalog = routeLoader$(() => buildCommandCatalog(getCommandSource()));

const KINDS = [
  { value: 'all', label: 'All' },
  { value: 'slash', label: '/ Slash' },
  { value: 'prefix', label: `${DEFAULT_PREFIX} Prefix` },
];

const setHidden = (element: HTMLElement, hidden: boolean) => {
  if (element.hidden !== hidden) element.hidden = hidden;
};

export default component$(() => {
  useStyles$(styles);
  const catalog = useCommandCatalog();

  const filter$ = $((_: Event, input: HTMLInputElement) => {
    const query = input.value.trim().toLowerCase();
    const root = input.closest('.commands');
    if (!root) return;
    let anyVisible = false;
    for (const section of root.querySelectorAll<HTMLElement>('.command-section')) {
      let sectionVisible = false;
      for (const entry of section.querySelectorAll<HTMLElement>('.command-entry')) {
        const entryHit = !query || (entry.dataset.search ?? '').includes(query);
        let entryVisible = false;
        for (const usage of entry.querySelectorAll<HTMLElement>('.command-usage')) {
          const visible = entryHit || (usage.dataset.search ?? '').includes(query);
          setHidden(usage, !visible);
          entryVisible ||= visible;
        }
        setHidden(entry, !entryVisible);
        sectionVisible ||= entryVisible;
      }
      setHidden(section, !sectionVisible);
      anyVisible ||= sectionVisible;
    }
    const empty = root.querySelector<HTMLElement>('.command-empty');
    if (empty) setHidden(empty, anyVisible);
  });

  return (
    <main class="commands">
      <section class="page-hero">
        <div class="container page-hero__inner">
          <p class="eyebrow">
            {catalog.value.total} commands · {catalog.value.categories.length} categories
          </p>
          <h1 class="display display--lg page-hero__title">Every command in the hive.</h1>
          <p class="lead page-hero__lead">Use Beebot with slash commands or with your server prefix. Here is how to read each card.</p>
          <div class="command-legend">
            <div class="command-legend__item">
              <div class="command-tags">
                <code class="command-line command-line--slash">
                  <span>
                    <span class="command-sigil">/</span>connect
                  </span>
                </code>
                <span class="badge badge--accent">Slash</span>
              </div>
              <p class="command-legend__text">
                Type <span class="mono text-accent">/</span> in a channel and pick the command from Discord’s menu.
              </p>
            </div>
            <div class="command-legend__item">
              <div class="command-tags">
                <code class="command-line command-line--prefix">
                  <span>
                    <span class="command-sigil">{DEFAULT_PREFIX}</span>connect
                  </span>
                </code>
                <span class="badge badge--info">Prefix</span>
              </div>
              <p class="command-legend__text">
                Type the server prefix (<span class="mono">{DEFAULT_PREFIX}</span> by default) and the name, or one of its aliases.
              </p>
            </div>
            <div class="command-legend__item">
              <div class="command-tags">
                <code class="command-line command-line--slash">
                  <span>
                    <span class="command-sigil">/</span>
                    <span class="command-parent">sound </span>upload
                  </span>
                </code>
                <span class="badge">Subcommand</span>
              </div>
              <p class="command-legend__text">Grouped under its parent command. Slash only, unless a prefix form is shown next to it.</p>
            </div>
            <div class="command-legend__item">
              <div class="command-tags">
                <span class="command-arg command-arg--required">&lt;required&gt;</span>
                <span class="command-arg command-arg--optional">[optional]</span>
                <span class="command-cooldown">
                  <Icon name="clock" />
                  2s
                </span>
              </div>
              <p class="command-legend__text">What the command expects, and how long to wait before using it again.</p>
            </div>
          </div>
        </div>
      </section>

      <div class="command-toolbar">
        <div class="container command-toolbar__inner">
          <label class="command-search">
            <Icon name="search" />
            <span class="visually-hidden">Search commands</span>
            <input type="search" class="input command-search__input" placeholder="Search commands or aliases" onInput$={filter$} />
          </label>
          <fieldset class="command-kind">
            <legend class="visually-hidden">Command type</legend>
            <div class="segmented">
              {KINDS.map((kind) => (
                <label key={kind.value} class="segmented__item">
                  <input type="radio" class="segmented__input" name="kind" value={kind.value} checked={kind.value === 'all'} />
                  {kind.label}
                </label>
              ))}
            </div>
          </fieldset>
          <nav class="command-jump" aria-label="Categories">
            {catalog.value.categories.map((category) => (
              <a key={category.id} href={`#${category.id}`} class="chip">
                {category.label}
                <span class="command-jump__count">{category.count}</span>
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div class="container command-list">
        <div class="card command-empty" hidden>
          <EmptyState icon="search" title="No command matches your search" flight="patrol">
            Try another name or switch to All.
          </EmptyState>
        </div>
        {catalog.value.categories.map((category) => (
          <section key={category.id} id={category.id} class="command-section" aria-labelledby={`${category.id}-title`}>
            <div class="command-section__head">
              <h2 class="heading" id={`${category.id}-title`}>
                {category.label}
              </h2>
              <span class="caption">{category.count} commands</span>
            </div>
            {category.entries.map((entry) => (
              <CommandEntryCard key={entry.name} entry={entry} />
            ))}
          </section>
        ))}
      </div>
    </main>
  );
});

export const head: DocumentHead = {
  title: 'Commands · Beebot',
  meta: [
    {
      name: 'description',
      content: 'Every Beebot command: slash commands, prefix commands, subcommands, arguments and aliases.',
    },
  ],
};
