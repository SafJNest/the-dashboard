import { component$, type QRL } from '@qwik.dev/core';
import { Icon } from '../dashboard/icons';

const TILES = ['Plays', 'Listeners', 'Likes', 'Your plays'];
const ROWS = Array.from({ length: 8 }, (_, index) => index);

export function Skeleton({ width, height }: { width?: string; height?: string }) {
  const style: Record<string, string> = {};
  if (width) style['--skeleton-width'] = width;
  if (height) style['--skeleton-height'] = height;
  return <span class="skeleton" style={style} aria-hidden="true" />;
}

export function SummarySkeleton() {
  return (
    <div class="sounds__strip" aria-busy="true">
      <span class="visually-hidden" role="status">Loading summary</span>
      {TILES.map((label) => (
        <div key={label} class="stat-tile">
          <span class="overline">{label}</span>
          <Skeleton width="5ch" height="2.2rem" />
          <Skeleton width="60%" />
        </div>
      ))}
    </div>
  );
}

export function RowsSkeleton() {
  return (
    <>
      {ROWS.map((row) => (
        <div key={row} class="sound-row" aria-hidden="true">
          <Skeleton width="1.75rem" height="1.75rem" />
          <span class="sound-row__main">
            <Skeleton width={`${50 + ((row * 17) % 40)}%`} />
            <Skeleton width="35%" height="0.5rem" />
          </span>
        </div>
      ))}
    </>
  );
}

export function ListSkeleton() {
  return (
    <aside class="card card--flush sound-list" aria-label="Sounds" aria-busy="true">
      <span class="visually-hidden" role="status">Loading sounds</span>
      <div class="sound-list__tools" aria-hidden="true">
        <Skeleton width="100%" height="var(--bb-control-sm)" />
        <Skeleton width="60%" height="var(--bb-control-xs)" />
      </div>
      <div class="sound-list__body">
        <RowsSkeleton />
      </div>
    </aside>
  );
}

export function PanelSkeleton() {
  return (
    <div class="sound-panel__body" aria-busy="true">
      <span class="visually-hidden" role="status">Loading statistics</span>
      <div class="stat-tiles" aria-hidden="true">
        {TILES.map((label) => (
          <div key={label} class="stat-tile">
            <Skeleton width="50%" height="0.625rem" />
            <Skeleton width="4ch" height="1.75rem" />
          </div>
        ))}
      </div>
      <Skeleton width="100%" height="8rem" />
      <Skeleton width="100%" height="10rem" />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <section class="sound-detail" aria-label="Sound" aria-busy="true">
      <div class="card card--raised sound-head" aria-hidden="true">
        <div class="sound-head__top">
          <Skeleton width="var(--bb-control-lg)" height="var(--bb-control-lg)" />
          <Skeleton width="45%" height="2rem" />
        </div>
        <Skeleton width="80%" />
        <Skeleton width="60%" />
      </div>
      <div class="card sound-panel">
        <PanelSkeleton />
      </div>
    </section>
  );
}

export function WorkSkeleton() {
  return (
    <div class="sounds__work">
      <ListSkeleton />
      <DetailSkeleton />
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div class="sounds__charts" aria-busy="true">
      <span class="visually-hidden" role="status">Loading overview</span>
      <div class="card chart-block" aria-hidden="true">
        <Skeleton width="30%" height="1rem" />
        <Skeleton width="100%" height="12.5rem" />
      </div>
      <div class="chart-pair" aria-hidden="true">
        <div class="card chart-block">
          <Skeleton width="40%" height="1rem" />
          <Skeleton width="100%" height="8rem" />
        </div>
        <div class="card chart-block">
          <Skeleton width="40%" height="1rem" />
          <Skeleton width="100%" height="8rem" />
        </div>
      </div>
    </div>
  );
}

interface LoadErrorProps {
  message: string;
  retrying?: boolean;
  onRetry$?: QRL<() => void>;
}

export const LoadError = component$<LoadErrorProps>(({ message, retrying, onRetry$ }) => (
  <div class="callout callout--danger load-error" role="alert">
    <Icon name="warning" />
    <div class="load-error__body">
      <p>{message}</p>
      {onRetry$ && (
        <button type="button" class="button button--secondary button--sm" disabled={retrying} onClick$={() => onRetry$()}>
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
    </div>
  </div>
));
