import { Link } from '@qwik.dev/router';
import { Icon } from '../dashboard/icons';

interface PanelBarProps {
  kind: 'Sound' | 'Soundboard';
  closeHref: string;
  previousHref: string | null;
  nextHref: string | null;
}

export function revealPanel(element: HTMLElement | undefined) {
  const container = element?.closest('.catalog-panel');
  const aboveViewport = (container?.getBoundingClientRect().top ?? 0) < 0;
  aboveViewport && container?.scrollIntoView({ block: 'start' });
}

export function PanelBar({ kind, closeHref, previousHref, nextHref }: PanelBarProps) {
  return (
    <div class="catalog-panel__bar">
      <span class="catalog-panel__kind">
        <Icon name={kind === 'Sound' ? 'sounds' : 'soundboards'} />
        {kind}
      </span>
      <span class="catalog-panel__nav">
        {previousHref ? (
          <Link href={previousHref} class="button button--ghost button--sm" aria-label="Previous" scroll={false} prefetchData="off"><Icon name="back" /></Link>
        ) : (
          <button type="button" class="button button--ghost button--sm" aria-label="Previous" disabled><Icon name="back" /></button>
        )}
        {nextHref ? (
          <Link href={nextHref} class="button button--ghost button--sm catalog-panel__next" aria-label="Next" scroll={false} prefetchData="off"><Icon name="back" /></Link>
        ) : (
          <button type="button" class="button button--ghost button--sm catalog-panel__next" aria-label="Next" disabled><Icon name="back" /></button>
        )}
        <Link href={closeHref} class="button button--ghost button--sm" aria-label="Close" scroll={false}><Icon name="close" /></Link>
      </span>
    </div>
  );
}

export function neighbours<T>(items: T[], index: number, hrefOf: (item: T) => string) {
  const previous = index > 0 ? items[index - 1] : undefined;
  const next = index >= 0 ? items[index + 1] : undefined;
  return { previousHref: previous === undefined ? null : hrefOf(previous), nextHref: next === undefined ? null : hrefOf(next) };
}
