import { component$, useStyles$ } from '@qwik.dev/core';
import { Skeleton } from '../skeleton/skeleton';
import styles from './page-skeleton.css?inline';

const SIDE_ROWS = Array.from({ length: 8 }, (_, index) => index);

export const PageSkeleton = component$(() => {
  useStyles$(styles);
  return (
    <div class="container page-skeleton" aria-busy="true">
      <span class="visually-hidden" role="status">Loading</span>
      <div class="card page-skeleton__side" aria-hidden="true">
        {SIDE_ROWS.map((row) => (
          <div key={row} class="page-skeleton__row">
            <Skeleton width="1.125rem" height="1.125rem" />
            <Skeleton width={`${50 + ((row * 13) % 35)}%`} />
          </div>
        ))}
      </div>
      <div class="page-skeleton__main" aria-hidden="true">
        <Skeleton width="30%" height="2rem" />
        <Skeleton width="55%" />
        <div class="card page-skeleton__card">
          <Skeleton width="25%" />
          <Skeleton height="2.5rem" />
          <Skeleton width="20%" />
          <Skeleton height="2.5rem" />
          <Skeleton width="30%" />
          <Skeleton height="7rem" />
        </div>
      </div>
    </div>
  );
});
