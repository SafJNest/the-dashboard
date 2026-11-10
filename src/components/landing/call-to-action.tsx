import { component$ } from '@qwik.dev/core';

interface CallToActionProps {
  inviteUrl: string | null;
}

const cells = [
  [720, 260], [928, 260], [512, 260], [824, 80], [616, 80], [824, 440], [616, 440],
];

export const CallToAction = component$<CallToActionProps>(({ inviteUrl }) => (
  <section class="cta">
    <svg class="cta__art" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="cta-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" class="stop-accent stop-accent--strong" />
          <stop offset="100%" class="stop-accent stop-accent--none" />
        </radialGradient>
      </defs>
      <circle cx="720" cy="260" r="300" fill="url(#cta-glow)" />
      {cells.map(([x, y]) => (
        <use key={`${x}-${y}`} href="#bb-hex" class="cta__cell" transform={`translate(${x} ${y}) scale(120)`} />
      ))}
      <use href="#bb-hex" class="cta__cell cta__cell--core" transform="translate(720 260) scale(120)" />
      <use href="#bb-bee" transform="translate(1010 150) rotate(-18) scale(1.3)" />
      <use href="#bb-bee" transform="translate(430 380) rotate(14) scale(-1.1 1.1)" />
    </svg>
    <div class="container cta__content">
      <h2 class="display display--lg cta__title">Let Beebot into your hive.</h2>
      <p class="lead cta__lead">Add the bot, pick a server, switch the castes on. The swarm takes it from there.</p>
      {inviteUrl ? (
        <a href={inviteUrl} class="button button--primary button--lg">
          Add Beebot to Discord
        </a>
      ) : (
        <button type="button" class="button button--primary button--lg" disabled>
          Add Beebot to Discord
        </button>
      )}
    </div>
  </section>
));
