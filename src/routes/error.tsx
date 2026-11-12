import { component$, useStyles$ } from '@qwik.dev/core';
import { useHttpStatus, useLocation, type DocumentHead } from '@qwik.dev/router';
import styles from './error.css?inline';

export default component$(() => {
  useStyles$(styles);
  const { status, message } = useHttpStatus();
  const { url } = useLocation();
  const inDashboard = url.pathname.startsWith('/dashboard/');

  return (
    <main class="error-page">
      <p class="eyebrow">Error {status}</p>
      <h1 class="display display--md">{status === 404 ? 'Not found' : status === 403 ? 'Access denied' : 'Something went wrong'}</h1>
      <p class="lead">{message}</p>
      <div class="error-page__actions">
        {status >= 502 && <a href={url.href} class="button button--primary">Try again</a>}
        <a href={inDashboard ? '/dashboard/' : '/'} class="button button--secondary">{inDashboard ? 'All servers' : 'Home'}</a>
      </div>
    </main>
  );
});

export const head: DocumentHead = {
  title: 'Error · Beebot',
};
