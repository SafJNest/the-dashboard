import { component$, Slot } from '@qwik.dev/core';
import { SettingsNav } from '../../../../components/guild/settings-nav';

export default component$(() => (
  <div class="container settings">
    <SettingsNav />
    <main class="settings__main">
      <Slot />
    </main>
  </div>
));
