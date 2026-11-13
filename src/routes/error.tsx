import { component$, useStyles$ } from '@qwik.dev/core';
import { useHttpStatus, useLocation, type DocumentHead } from '@qwik.dev/router';
import { Bee } from '../components/bee/bee';
import styles from './error.css?inline';

export default component$(() => {
  useStyles$(styles);
  const { status, message } = useHttpStatus();
  const { url } = useLocation();
  const inDashboard = url.pathname.startsWith('/dashboard/');

  return (
    <main class="error-page">
      {status === 404 ? (
        <div class="error-page__digits" aria-hidden="true">
          <span>4</span>
          <span class="error-page__zero bee-host">
            <span class="bee-host__target">0</span>
            <Bee flight="digit" size={44} />
          </span>
          <span>4</span>
        </div>
      ) : (
        <span class="error-page__bee bee-host" aria-hidden="true">
          <Bee flight="tile" size={30} dizzy />
        </span>
      )}
      <p class="eyebrow">Error {status}</p>
      <h1 class="display display--md">{status === 404 ? 'This page flew off' : status === 403 ? 'Access denied' : 'The hive is having a moment'}</h1>
      <p class="lead">{message}</p>
      <div class="error-page__actions">
        {status >= 502 && <a href={url.href} class="button button--primary">Try again</a>}
        <a href={inDashboard ? '/dashboard/' : '/'} class={['button', status >= 502 ? 'button--secondary' : 'button--primary']}>{inDashboard ? 'All servers' : 'Home'}</a>
      </div>
    </main>
  );
});

export const head: DocumentHead = {
  title: 'Error · Beebot',
};
