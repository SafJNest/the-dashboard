import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { LegalPage, type LegalSection } from '../../../components/legal/legal-page';

const sections: LegalSection[] = [
  { id: 'data', label: 'What Beebot stores' },
  { id: 'sharing', label: 'Who we share it with' },
  { id: 'retention', label: 'How long we keep it' },
  { id: 'controls', label: 'Your controls' },
  { id: 'security', label: 'Security' },
  { id: 'age', label: 'Age' },
  { id: 'contact', label: 'Contact' },
];

const storedData = [
  { data: 'Discord IDs, name, avatar', reason: 'To know who you are and show you on leaderboards and in the dashboard.' },
  { data: 'Server settings', reason: 'Welcome, leave, boost, level-up and reward messages, prefix, TTS voice, alerts.' },
  { data: 'XP and message counts', reason: "Levels, rewards and leaderboards. We count messages; we don't store their content." },
  { data: 'Sounds you upload', reason: 'Audio file, name, tags, visibility, likes and plays, so sounds can be played and shown in analytics.' },
  { data: 'Soundboards, greets, playlists', reason: 'Saved so you can use them in any server.' },
  {
    data: 'Linked accounts',
    reason: 'League summoner and region; Spotify access token and the export you upload; Twitch streamers linked to a server.',
  },
  { data: 'Moderation records', reason: 'Warns with reason and moderator; ban counts used by the blacklist.' },
];

export default component$(() => (
  <LegalPage document="privacy" title="Privacy policy" sections={sections}>
    <section id="data" class="legal-section">
      <h2 class="heading">1. What Beebot stores</h2>
      <div class="table-wrap">
        <table class="table legal-table">
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Why</th>
            </tr>
          </thead>
          <tbody>
            {storedData.map((row) => (
              <tr key={row.data}>
                <td>{row.data}</td>
                <td>{row.reason}</td>
              </tr>
            ))}
            <tr>
              <td>Text for TTS</td>
              <td>
                Sent to <span class="legal-placeholder">[TTS PROVIDER]</span> to create the audio; not kept afterwards.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section id="sharing" class="legal-section">
      <h2 class="heading">2. Who we share it with</h2>
      <p>
        We don't sell data. We send only what's needed to Discord, Riot Games, Spotify, Twitch, YouTube,{' '}
        <span class="legal-placeholder">[TTS PROVIDER]</span> and our host <span class="legal-placeholder">[HOSTING PROVIDER]</span>.
      </p>
    </section>
    <section id="retention" class="legal-section">
      <h2 class="heading">3. How long we keep it</h2>
      <p>
        Server settings are kept while Beebot is in the server and deleted <span class="legal-placeholder">[N]</span> days after it's removed.
        Your sounds, playlists and linked accounts are kept until you delete them.
      </p>
    </section>
    <section id="controls" class="legal-section">
      <h2 class="heading">4. Your controls</h2>
      <ul>
        <li>
          Delete a sound with <span class="mono">/sound delete</span> or from the dashboard.
        </li>
        <li>
          Unlink accounts with <span class="mono">/summoner unlink</span> and from your profile.
        </li>
        <li>
          Remove your greet with <span class="mono">/greet unset</span>.
        </li>
        <li>
          Ask for a copy or full deletion of your data at <span class="legal-placeholder">[CONTACT EMAIL]</span>.
        </li>
      </ul>
    </section>
    <section id="security" class="legal-section">
      <h2 class="heading">5. Security</h2>
      <p>
        Access tokens are encrypted and the dashboard only asks Discord for the <span class="mono">identify</span> and{' '}
        <span class="mono">guilds</span> scopes — never your email.
      </p>
    </section>
    <section id="age" class="legal-section">
      <h2 class="heading">6. Age</h2>
      <p>Beebot follows Discord's minimum age. We don't knowingly collect data from anyone below it.</p>
    </section>
    <section id="contact" class="legal-section">
      <h2 class="heading">7. Contact</h2>
      <p>
        Data controller: <span class="legal-placeholder">[OPERATOR NAME]</span>, <span class="legal-placeholder">[ADDRESS]</span> ·{' '}
        <span class="legal-placeholder">[CONTACT EMAIL]</span>.
      </p>
    </section>
  </LegalPage>
));

export const head: DocumentHead = {
  title: 'Privacy policy · Beebot',
  meta: [{ name: 'description', content: 'What data Beebot stores, why, and how to control it.' }],
};
