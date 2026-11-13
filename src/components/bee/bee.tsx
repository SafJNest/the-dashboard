import { component$, useStyles$ } from '@qwik.dev/core';
import styles from './bee.css?inline';

export type BeeFlight = 'save' | 'tile' | 'stage' | 'digit';

interface BeeProps {
  flight?: BeeFlight;
  patrol?: boolean;
  dizzy?: boolean;
  enter?: boolean;
  size?: number;
}

export const Bee = component$<BeeProps>(({ flight, patrol = false, dizzy = false, enter = false, size = 28 }) => {
  useStyles$(styles);
  const svg = (
    <svg class="bee" width={size} height={Math.round((size * 19) / 22)} viewBox="-11 -13 22 19" aria-hidden="true">
      <g transform="rotate(-20 -2 -6)">
        <ellipse class="bee-wing bee-wing--front" cx="-2" cy="-6" rx="3.6" ry="5.5" />
      </g>
      <g transform="rotate(20 2.5 -6)">
        <ellipse class="bee-wing bee-wing--back" cx="2.5" cy="-6" rx="3.6" ry="5.5" />
      </g>
      <ellipse class="bee-body" cx="0" cy="0" rx="7" ry="4.6" />
      <path class="bee-stripes" d="M-2.2 -4.3V4.3M1.8 -4.4V4.4" />
      <circle class="bee-head" cx="7.4" cy="-0.4" r="2.8" />
      <circle class="bee-eye" cx="8.2" cy="-1.3" r="0.75" />
      <path class="bee-sting" d="M-7 0L-9.5 .6" />
    </svg>
  );
  const body = dizzy ? <span class="bee-dizzy">{svg}</span> : svg;
  if (patrol) return <span class="bee-patrol">{body}</span>;
  if (!flight) return body;
  const orbit = <span class={['bee-orbit', `bee-orbit--${flight}`]}>{body}</span>;
  return enter ? <span class="bee-enter">{orbit}</span> : orbit;
});
