import { component$ } from '@qwik.dev/core';

interface HeroProps {
  inviteUrl: string | null;
}

const center = { x: 720, y: 980 };
const rings = [170, 290, 410];
const outerRing = 560;

const litNodes = [
  [560, 922, 6], [662, 820, 6], [805, 833, 6], [880, 922, 6],
  [491, 801, 5], [602, 715, 5], [750, 692, 5], [906, 758, 5],
  [415, 706, 4.5], [663, 574, 4.5], [925, 625, 4.5],
];

const idleNodes = [
  [436, 920, 4.5], [981, 853, 4.5], [1007, 940, 4.5],
  [335, 840, 4], [540, 611, 4], [819, 582, 4], [1043, 728, 4], [1105, 840, 4],
  [200, 850, 3], [1250, 760, 3], [300, 600, 3], [1180, 560, 3],
];

const beams = [[602, 715], [750, 692], [906, 758], [491, 801], [663, 574], [925, 625], [415, 706]];

const bees = [
  { radius: 170, clockwise: true, duration: 18, delay: -4, scale: 1.1 },
  { radius: 170, clockwise: true, duration: 18, delay: -13, scale: 1.1 },
  { radius: 290, clockwise: false, duration: 30, delay: -6, scale: 1.15 },
  { radius: 290, clockwise: false, duration: 30, delay: -21, scale: 1.15 },
  { radius: 410, clockwise: true, duration: 44, delay: -10, scale: 1 },
  { radius: 410, clockwise: true, duration: 44, delay: -32, scale: 1 },
  { radius: 560, clockwise: false, duration: 66, delay: -20, scale: 0.9 },
  { radius: 560, clockwise: false, duration: 66, delay: -53, scale: 0.9 },
];

const trailPath = (radius: number, clockwise: boolean) => {
  const startX = center.x + (clockwise ? -radius / 2 : radius / 2);
  const startY = center.y - radius * Math.sin(Math.PI / 3);
  return `M${startX.toFixed(1)} ${startY.toFixed(1)}A${radius} ${radius} 0 0 ${clockwise ? 1 : 0} ${center.x} ${center.y - radius}`;
};

export const Hero = component$<HeroProps>(({ inviteUrl }) => (
  <section class="hero">
    <svg class="hero__art" viewBox="0 0 1440 960" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <radialGradient id="hero-honey" cx="50%" cy="35%" r="65%">
          <stop offset="0%" class="stop-honey-light" />
          <stop offset="45%" class="stop-honey" />
          <stop offset="100%" class="stop-honey-dark" />
        </radialGradient>
        <radialGradient id="hero-corona" cx="50%" cy="50%" r="50%">
          <stop offset="0%" class="stop-accent stop-accent--strong" />
          <stop offset="60%" class="stop-accent stop-accent--soft" />
          <stop offset="100%" class="stop-accent stop-accent--none" />
        </radialGradient>
        <radialGradient id="hero-atmosphere" cx="50%" cy="100%" r="70%">
          <stop offset="0%" class="stop-atmosphere" />
          <stop offset="100%" class="stop-canvas" />
        </radialGradient>
        <radialGradient id="hero-fade-gradient" cx="50%" cy="102%" r="62%">
          <stop offset="0%" class="stop-mask stop-mask--full" />
          <stop offset="55%" class="stop-mask stop-mask--half" />
          <stop offset="100%" class="stop-mask stop-mask--none" />
        </radialGradient>
        <mask id="hero-fade">
          <rect width="1440" height="960" fill="url(#hero-fade-gradient)" />
        </mask>
        <pattern id="hero-comb" width="34.64" height="60" patternUnits="userSpaceOnUse">
          <path class="hero__comb-cell" d="M17.32 0V10L34.64 20V40L17.32 50V60M17.32 10L0 20V40L17.32 50" />
        </pattern>
      </defs>

      <rect width="1440" height="960" fill="url(#hero-atmosphere)" />
      <rect width="1440" height="960" fill="url(#hero-comb)" mask="url(#hero-fade)" />

      {rings.map((radius) => (
        <circle key={radius} class="hero__ring" cx={center.x} cy={center.y} r={radius} />
      ))}
      <circle class="hero__ring hero__ring--dashed" cx={center.x} cy={center.y} r={outerRing} />
      <circle class="hero__pulse" cx={center.x} cy={center.y} r="420" />

      {beams.map(([x, y]) => (
        <line key={`${x}-${y}`} class="hero__beam" x1={center.x} y1={center.y} x2={x} y2={y} />
      ))}
      {litNodes.map(([x, y, size]) => (
        <use key={`${x}-${y}`} href="#bb-hex" class="hero__node" transform={`translate(${x} ${y}) scale(${size})`} />
      ))}
      {idleNodes.map(([x, y, size]) => (
        <use key={`${x}-${y}`} href="#bb-hex" class="hero__node hero__node--idle" transform={`translate(${x} ${y}) scale(${size})`} />
      ))}

      {bees.map((bee, index) => (
        <g
          key={index}
          class={['hero__orbit', { 'hero__orbit--reverse': !bee.clockwise }]}
          style={{ '--orbit-duration': `${bee.duration}s`, '--orbit-delay': `${bee.delay}s` }}
        >
          <path class="hero__trail" d={trailPath(bee.radius, bee.clockwise)} />
          <use
            href="#bb-bee"
            transform={`translate(${center.x} ${center.y - bee.radius}) scale(${bee.clockwise ? bee.scale : -bee.scale} ${bee.scale})`}
          />
        </g>
      ))}

      <circle cx={center.x} cy={center.y} r="280" fill="url(#hero-corona)" />
      <use href="#bb-hex" class="hero__cell" transform="translate(576 897) scale(92)" />
      <use href="#bb-hex" class="hero__cell" transform="translate(864 897) scale(92)" />
      <use href="#bb-hex" class="hero__core-outline" transform={`translate(${center.x} ${center.y}) scale(132)`} />
      <use href="#bb-hex" transform={`translate(${center.x} ${center.y}) scale(100)`} fill="url(#hero-honey)" />
    </svg>

    <div class="container hero__content">
      <p class="eyebrow">500 worker nodes · one hive</p>
      <h1 class="display display--xl hero__title">
        One <span class="text-accent">hive.</span> Every server.
      </h1>
      <p class="lead hero__lead">
        Beebot is the queen of your server: it welcomes every bee that lands, levels up the colony and fills
        the air with sounds — a swarm of 500 nodes working as one.
      </p>
      <div class="hero__actions">
        {inviteUrl ? (
          <a href={inviteUrl} class="button button--primary button--lg">
            Add Beebot to Discord
          </a>
        ) : (
          <button type="button" class="button button--primary button--lg" disabled>
            Add Beebot to Discord
          </button>
        )}
        <a href="/dashboard/" class="button button--secondary button--lg">
          Manage your hives
        </a>
      </div>
    </div>
  </section>
));
