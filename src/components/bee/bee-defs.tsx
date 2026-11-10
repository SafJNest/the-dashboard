import { component$ } from '@qwik.dev/core';

export const BeeDefs = component$(() => (
  <svg width="0" height="0" class="visually-hidden" aria-hidden="true">
    <defs>
      <polygon id="bb-hex" points="0,-1 .866,-.5 .866,.5 0,1 -.866,.5 -.866,-.5" />
      <g id="bb-bee">
        <g transform="rotate(-20 -2 -6)">
          <ellipse class="bee-wing bee-wing--front" cx="-2" cy="-6" rx="3.6" ry="5.5" />
        </g>
        <g transform="rotate(20 2.5 -6)">
          <ellipse class="bee-wing bee-wing--back" cx="2.5" cy="-6" rx="3.6" ry="5.5" />
        </g>
        <ellipse class="bee-body" cx="0" cy="0" rx="7" ry="4.6" />
        <path class="bee-stripes" d="M-2.2 -4.3V4.3M1.8 -4.4V4.4" />
        <circle class="bee-head" cx="7.4" cy="-0.4" r="2.8" />
        <path class="bee-sting" d="M-7 0L-9.5 .6" />
      </g>
    </defs>
  </svg>
));
