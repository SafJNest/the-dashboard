import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { LegalPage, type LegalSection } from '../../../components/legal/legal-page';

const sections: LegalSection[] = [
  { id: 'accept', label: 'Accepting these terms' },
  { id: 'use', label: 'Using Beebot' },
  { id: 'content', label: 'Your sounds and content' },
  { id: 'moderation', label: 'Moderation features' },
  { id: 'third-parties', label: 'Third-party services' },
  { id: 'availability', label: 'Availability' },
  { id: 'ending', label: 'Ending use' },
  { id: 'contact', label: 'Changes and contact' },
];

export default component$(() => (
  <LegalPage document="terms" title="Terms of service" sections={sections}>
    <section id="accept" class="legal-section">
      <h2 class="heading">1. Accepting these terms</h2>
      <p>
        By adding Beebot to a server or using its commands, dashboard or website, you agree to these terms. If you add Beebot to a server,
        you confirm you are allowed to do so by that server's owner. Beebot is run by <span class="legal-placeholder">[OPERATOR NAME]</span>.
      </p>
    </section>
    <section id="use" class="legal-section">
      <h2 class="heading">2. Using Beebot</h2>
      <p>
        You must follow Discord's Terms of Service and Community Guidelines while using Beebot. Don't use Beebot to spam, harass, evade bans,
        or overload the service.
      </p>
    </section>
    <section id="content" class="legal-section">
      <h2 class="heading">3. Your sounds and content</h2>
      <ul>
        <li>You keep the rights to sounds, images and text you upload. You give us permission to store, process and play them so Beebot can work.</li>
        <li>
          <strong>Public</strong> sounds can be found, played, liked and added to soundboards by anyone in any server. <strong>Private</strong>{' '}
          sounds are only available to you.
        </li>
        <li>Only upload content you have the right to share. We may remove content that breaks these terms or the law.</li>
      </ul>
    </section>
    <section id="moderation" class="legal-section">
      <h2 class="heading">4. Moderation features</h2>
      <p>
        Warns, automated actions and the blacklist help server staff. Server staff are responsible for how they use them. The blacklist shares
        how many servers have banned a user; it never shares reasons or server names.
      </p>
    </section>
    <section id="third-parties" class="legal-section">
      <h2 class="heading">5. Third-party services</h2>
      <p>Some commands use Riot Games, Spotify, Twitch and YouTube. Their own terms apply. Beebot isn't endorsed by Riot Games or Discord.</p>
    </section>
    <section id="availability" class="legal-section">
      <h2 class="heading">6. Availability</h2>
      <p>We try to keep the hive running, but Beebot is provided as is, without guarantees of uptime.</p>
    </section>
    <section id="ending" class="legal-section">
      <h2 class="heading">7. Ending use</h2>
      <p>You can remove Beebot from a server at any time. We may block access for anyone who breaks these terms.</p>
    </section>
    <section id="contact" class="legal-section">
      <h2 class="heading">8. Changes and contact</h2>
      <p>
        We'll announce important changes in the support server. Questions: <span class="legal-placeholder">[CONTACT EMAIL]</span>. These terms
        are governed by the laws of <span class="legal-placeholder">[JURISDICTION]</span>.
      </p>
    </section>
  </LegalPage>
));

export const head: DocumentHead = {
  title: 'Terms of service · Beebot',
  meta: [{ name: 'description', content: 'The terms for using Beebot, its commands, dashboard and website.' }],
};
