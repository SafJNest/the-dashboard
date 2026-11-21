import { component$, type QRL } from '@qwik.dev/core';
import { Bee } from '../bee/bee';
import { Skeleton } from '../skeleton/skeleton';

export { Skeleton };

const TILES = ['Plays', 'Listeners', 'Likes', 'Your plays'];

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

interface LoadErrorProps {
  message: string;
  retrying?: boolean;
  onRetry$?: QRL<() => void>;
}

export const LoadError = component$<LoadErrorProps>(({ message, retrying, onRetry$ }) => (
  <div class="callout callout--danger load-error" role="alert">
    <span class="load-error__bee bee-host" aria-hidden="true">
      <Bee flight="tile" size={26} dizzy />
    </span>
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
