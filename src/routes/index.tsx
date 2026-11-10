import { component$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';

export default component$(() => (
  <main>
    <h1>Beebot</h1>
    <p>Discord bot dashboard</p>
    <Link href="/dashboard/">Dashboard</Link>
  </main>
));
