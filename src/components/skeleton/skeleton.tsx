import { component$, useStyles$ } from '@qwik.dev/core';
import styles from './skeleton.css?inline';

interface SkeletonProps {
  width?: string;
  height?: string;
}

export const Skeleton = component$<SkeletonProps>(({ width, height }) => {
  useStyles$(styles);
  const style: Record<string, string> = {};
  if (width) style['--skeleton-width'] = width;
  if (height) style['--skeleton-height'] = height;
  return (
    <span class="skeleton" style={style} aria-hidden="true">
      <span class="skeleton__honey">
        <span class="skeleton__wave" />
        <span class="skeleton__wave" />
        <span class="skeleton__wave" />
      </span>
    </span>
  );
});
