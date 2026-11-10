import { component$ } from '@qwik.dev/core';

const soundboardTiles = [
  { name: 'airhorn', on: true }, { name: 'bruh', on: true }, { name: 'wow', on: true },
  { name: 'drumroll', on: true }, { name: 'gg', on: true }, { name: 'sad violin', on: true },
  { name: 'boom', on: true }, { name: 'ding', on: true }, { name: 'hello there', on: false },
  { name: 'oof', on: false }, { name: 'clap', on: false }, { name: 'laugh', on: false },
  { name: '', on: false }, { name: '', on: false }, { name: '', on: false },
];

const leaders = [
  { rank: 1, name: 'Luna', level: 42, progress: '74%', avatar: '' },
  { rank: 2, name: 'Kairo', level: 39, progress: '51%', avatar: 'avatar--violet' },
];

const sounds = [
  { name: 'airhorn', tag: 'meme', playing: true },
  { name: 'victory fanfare', tag: 'gaming', playing: false },
];

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);

const FeatureNumber = ({ value }: { value: string }) => (
  <span class="feature__number">
    <svg viewBox="0 0 30 34" aria-hidden="true">
      <polygon points="15,1 29,9 29,25 15,33 1,25 1,9" />
    </svg>
    {value}
  </span>
);

export const Features = component$(() => (
  <section id="features" class="container features">
    <div class="features__intro">
      <p class="eyebrow">The colony</p>
      <h2 class="display display--md">Four castes. One hive.</h2>
      <p class="lead">
        Every module is a caste with one job. Switch them on from the dashboard — setup is free, and anything
        premium is marked before you start, never after.
      </p>
    </div>

    <div class="features__grid">
      <article class="card feature">
        <header class="feature__header">
          <div class="feature__kicker">
            <FeatureNumber value="01" />
            <span class="overline">Guards · Welcome &amp; leave</span>
          </div>
          <h3 class="heading">Greet every bee that lands.</h3>
          <p class="text-muted">
            Channel, message, roles on join and a live Discord preview — with variables like{' '}
            <span class="mono text-accent">{'{user.mention}'}</span>.
          </p>
        </header>
        <div class="discord">
          <div class="discord__message">
            <span class="avatar avatar--lg">B</span>
            <div class="feature__message">
              <div class="discord__meta">
                <span class="discord__name">Beebot</span>
                <span class="badge badge--app">APP</span>
                <span class="discord__time">Today at 21:04</span>
              </div>
              <span>
                Hey <span class="discord__mention">@Luna</span>, welcome to the hive of <b>Night Shift</b>! You are
                bee #1,284.
              </span>
            </div>
          </div>
        </div>
      </article>

      <article class="card feature">
        <header class="feature__header">
          <div class="feature__kicker">
            <FeatureNumber value="02" />
            <span class="overline">Workers · Experience</span>
          </div>
          <h3 class="heading">From larva to queen.</h3>
          <p class="text-muted">
            XP per message with cooldowns, role rewards at any level, no-XP channels and a public leaderboard for
            the whole colony.
          </p>
        </header>
        <ol class="feature__leaders">
          {leaders.map((leader) => (
            <li key={leader.rank} class="feature__leader">
              <div class="feature__leader-row">
                <span class={['mono', leader.rank === 1 ? 'text-accent' : 'caption']}>{leader.rank}</span>
                <span class={['avatar', 'avatar--sm', leader.avatar]}>{leader.name[0]}</span>
                <span class="feature__leader-name">{leader.name}</span>
                <span class={['badge', { 'badge--accent': leader.rank === 1 }]}>LVL {leader.level}</span>
              </div>
              <div class="progress" style={{ '--progress': leader.progress }}>
                <div class="progress__bar" />
              </div>
            </li>
          ))}
        </ol>
      </article>

      <article class="card feature">
        <header class="feature__header">
          <div class="feature__kicker">
            <FeatureNumber value="03" />
            <span class="overline">Drones · Soundboards</span>
          </div>
          <h3 class="heading">25 cells, one comb.</h3>
          <p class="text-muted">
            Build as many soundboards as you like — for you or for the server — and post them as a 5×5 grid of
            buttons.
          </p>
        </header>
        <div class="feature__tiles" aria-hidden="true">
          {soundboardTiles.map((tile, index) => (
            <span
              key={index}
              class={['feature__tile', { 'feature__tile--on': tile.on, 'feature__tile--empty': !tile.name }]}
            >
              {tile.name}
            </span>
          ))}
        </div>
      </article>

      <article class="card feature">
        <header class="feature__header">
          <div class="feature__kicker">
            <FeatureNumber value="04" />
            <span class="overline">Foragers · Sound library</span>
          </div>
          <h3 class="heading">Nectar from every server.</h3>
          <p class="text-muted">
            Browse sounds gathered from every hive, like and tag them, and see what's buzzing across the swarm.
          </p>
        </header>
        <ul class="feature__sounds">
          {sounds.map((sound) => (
            <li key={sound.name} class="card card--raised feature__sound">
              <span class={['play', { 'play--ghost': !sound.playing }]}>
                <PlayIcon />
              </span>
              <span class="feature__sound-name">{sound.name}</span>
              <span class="badge">{sound.tag}</span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  </section>
));
