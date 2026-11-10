import { component$ } from '@qwik.dev/core';

export const HexMark = component$(() => (
  <svg class="brand__mark" viewBox="0 0 22 24" aria-hidden="true">
    <polygon class="hex-mark__outline" points="11,1 20.5,6.5 20.5,17.5 11,23 1.5,17.5 1.5,6.5" />
    <polygon class="hex-mark__core" points="11,6.5 15.8,9.25 15.8,14.75 11,17.5 6.2,14.75 6.2,9.25" />
  </svg>
));
