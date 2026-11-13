import { component$, useStyles$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { HexMark } from '../hex-mark/hex-mark';
import styles from './site-footer.css?inline';

const columns = [
  {
    title: 'Product',
    links: [{ href: '/commands/', label: 'Commands' }],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms/', label: 'Terms of service' },
      { href: '/privacy/', label: 'Privacy policy' },
    ],
  },
];

const swarm = ['one', 'two', 'three', 'four'];

export const SiteFooter = component$(() => {
  useStyles$(styles);

  return (
    <footer class="site-footer">
      <div class="site-footer__swarm" aria-hidden="true">
        {swarm.map((name) => (
          <span key={name} class={`footer-bee footer-bee--${name}`}>
            <svg class="footer-bee__sprite" viewBox="-12 -12 24 18">
              <use href="#bb-bee" />
            </svg>
          </span>
        ))}
      </div>
      <div class="container site-footer__inner">
        <div class="site-footer__columns">
          <div class="site-footer__brand">
            <Link href="/" class="brand">
              <HexMark />
              Beebot
            </Link>
            <p class="caption">The hive every server orbits.</p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} class="site-footer__column" aria-label={column.title}>
              <span class="overline">{column.title}</span>
              {column.links.map((link) => (
                <Link key={link.href} href={link.href} class="site-footer__link">
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <hr class="site-footer__divider" />
        <p class="caption">© 2026 Beebot. Not affiliated with Discord Inc.</p>
      </div>
    </footer>
  );
});
