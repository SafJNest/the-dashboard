import { component$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';

interface HeroProps {
  inviteUrl: string | null;
}

type Point = [number, number];

const center = { x: 720, y: 980 };
const rings = [170, 290, 410];
const outerRing = 560;

const beams: Point[] = [
  [602, 715], [750, 692], [906, 758], [491, 801], [663, 574], [925, 625], [415, 706],
  [838, 1245], [690, 1268], [534, 1202], [949, 1159], [777, 1386], [515, 1335], [1025, 1254],
];

const litNodeGroups: { step: number; size: number; points: Point[] }[] = [
  { step: 1, size: 4.5, points: [[415, 706], [1025, 1254], [925, 625], [515, 1335], [777, 1386], [663, 574]] },
  { step: 2, size: 5, points: [[491, 801], [838, 1245], [906, 758], [534, 1202]] },
  { step: 3, size: 5, points: [[602, 715], [949, 1159], [750, 692], [690, 1268]] },
  {
    step: 4,
    size: 6,
    points: [[560, 922], [662, 820], [805, 833], [880, 922], [880, 1038], [778, 1140], [635, 1127], [560, 1038]],
  },
];

const idleNodes: [number, number, number][] = [
  [436, 920, 4.5], [981, 853, 4.5], [1007, 940, 4.5], [1004, 1040, 4.5], [459, 1107, 4.5], [433, 1020, 4.5],
  [335, 840, 4], [540, 611, 4], [819, 582, 4], [1043, 728, 4], [1105, 840, 4],
  [1105, 1120, 4], [900, 1349, 4], [621, 1378, 4], [397, 1232, 4], [335, 1120, 4],
  [200, 850, 3], [1250, 760, 3], [300, 600, 3], [1180, 560, 3],
  [1240, 1110, 3], [190, 1200, 3], [1140, 1360, 3], [260, 1400, 3],
];

const petals: Point[] = [[615.5, 799], [824.5, 799], [929, 980], [824.5, 1161], [615.5, 1161], [511, 980]];

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

const hexAt = ([x, y]: Point, size: number) => `translate(${x} ${y}) scale(${size})`;

export const Hero = component$<HeroProps>(({ inviteUrl }) => (
  <section class="hero">
    <div class="hero__flower" aria-hidden="true">
      <svg class="hero__flower-art" viewBox="-480 0 2400 1960">
        <defs>
          <radialGradient id="hero-honey" cx="50%" cy="35%" r="65%">
            <stop offset="0%" class="stop-honey-light" />
            <stop offset="45%" class="stop-honey" />
            <stop offset="100%" class="stop-honey-dark" />
          </radialGradient>
          <radialGradient id="hero-core" cx="42%" cy="36%" r="66%">
            <stop offset="0%" class="stop-honey-glint" />
            <stop offset="36%" class="stop-honey-bright" />
            <stop offset="76%" class="stop-honey" />
            <stop offset="100%" class="stop-honey-dark" />
          </radialGradient>
          <radialGradient id="hero-corona" cx="50%" cy="50%" r="50%">
            <stop offset="0%" class="stop-accent stop-accent--strong" />
            <stop offset="60%" class="stop-accent stop-accent--soft" />
            <stop offset="100%" class="stop-accent stop-accent--none" />
          </radialGradient>
          <radialGradient id="hero-atmosphere" gradientUnits="userSpaceOnUse" cx={center.x} cy={center.y} r="900">
            <stop offset="0%" class="stop-atmosphere" />
            <stop offset="100%" class="stop-canvas" />
          </radialGradient>
        </defs>

        <rect x="-480" width="2400" height="1960" fill="url(#hero-atmosphere)" />

        {rings.map((radius) => (
          <circle key={radius} class="hero__ring" cx={center.x} cy={center.y} r={radius} />
        ))}
        <circle class="hero__ring hero__ring--dashed" cx={center.x} cy={center.y} r={outerRing} />
        <circle class="hero__pulse" cx={center.x} cy={center.y} r="420" />

        <g class="hero__dim">
          {beams.map(([x, y]) => (
            <line key={`${x}-${y}`} class="hero__beam" x1={center.x} y1={center.y} x2={x} y2={y} />
          ))}
        </g>
        {litNodeGroups.map((group) => (
          <g key={group.step} class={`hero__nodes hero__nodes--off-${group.step}`}>
            {group.points.map((point) => (
              <use key={point.join('-')} href="#bb-hex" class="hero__node" transform={hexAt(point, group.size)} />
            ))}
          </g>
        ))}
        {idleNodes.map(([x, y, size]) => (
          <use key={`${x}-${y}`} href="#bb-hex" class="hero__node hero__node--idle" transform={hexAt([x, y], size)} />
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

        <circle class="hero__dim" cx={center.x} cy={center.y} r="300" fill="url(#hero-corona)" />
        {petals.map((point) => (
          <use key={point.join('-')} href="#bb-hex" class="hero__petal" transform={hexAt(point, 92)} />
        ))}
        <use href="#bb-hex" class="hero__core-outline" transform={hexAt([center.x, center.y], 140)} />
        <circle cx={center.x} cy={center.y} r="104" fill="url(#hero-core)" />
      </svg>
    </div>

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
        <Link href="/dashboard/" class="button button--secondary button--lg">
          Manage your hives
        </Link>
      </div>
    </div>
  </section>
));
