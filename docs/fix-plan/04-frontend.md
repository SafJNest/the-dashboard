# Fase 4 — Frontend strutturale

Si eseguono solo dopo le fasi 0-3. Prima di unire componenti, controllare con CodeGraph chi li usa.

## Context della libreria suoni

- Oggi `source`, `view`, `playback`, `votes` e `onPlay$` attraversano SoundLibrary → LibraryWork → SoundDetail → SoundPanel e SoundList → SoundRows:
  - `src/components/sounds/sound-library.tsx:89,98,254`;
  - `sound-detail.tsx:356`;
  - `sound-list.tsx:189`.
- **Fix**: un context Qwik con ID e tipo chiari, con il provider in `SoundLibrary`. I valori che passano dal server al client devono restare serializzabili.

## Un solo componente per i menu

- Oggi ci sono quattro copie della chiusura su click esterno ed Esc, ognuna con il proprio listener sul document per istanza:
  - `src/components/guild/combo.tsx:25-31`;
  - `src/components/dashboard/guild-switcher.tsx:16-23`;
  - `src/components/sounds/greet-picker.tsx:24-31`;
  - `sound-list.tsx:27-34`.
- **Fix**: usare la Popover API nativa se l'anchor positioning è supportato dai browser target (verificarlo prima). Altrimenti un componente dropdown condiviso con un solo listener.

## Switcher di guild

`GuildPicker` (`sound-list.tsx:21-67`) ripete `GuildSwitcher`: diventano un solo componente, con le voci passate come props.

## Reward e Twitch

`reward-settings.tsx:23-74` e `twitch-settings.tsx:24-75` sono quasi identici: callout "non trovato", empty state e item-picker. Diventano un componente generico per le impostazioni con chiavi. I testi `INTRO` e `ALERTS` (`alert-settings.tsx:62-82`) vanno deduplicati.

## Componenti piccoli al posto del markup ripetuto

- **`StatTile`**, 6 copie:
  - `sound-library.tsx:37-56`;
  - `sound-detail.tsx:107-131, 162-182`;
  - `sound-editor.tsx:243-260`;
  - `library-states.tsx:15-19, 61-66`.
- **`Badge`** con tono, 4 copie:
  - `settings-nav.tsx:27`;
  - `settings/index.tsx:30`;
  - `experience-settings.tsx:83`;
  - `twitch-settings.tsx:68`.
- **`DiscordMessage`**, 2 copie: `features.tsx:60-74` e `alert-settings.tsx:292-314`.

## Controlli a pillole

- Oggi ce ne sono tre versioni:
  - `.filter-tabs` (`sounds.css:66-103`);
  - `.segmented`;
  - `.sound-tabs`.
- Periodo, owner, sort e tab usano button con `aria-pressed`.
- **Fix**:
  - unificare su `segmented` con radio nativi;
  - rinominare `sound-tabs`, perché non implementa delle vere tab.

## Da indagare prima di toccare

- La logica di navigazione in `src/routes/dashboard/layout.tsx:81-151`: listener globale sui click, `pending`, MutationObserver con timeout per il focus. Va verificato se `location.isNavigating` e il CSS bastano.
- Tocca `docs/claude-navigation-loading.md`: usare `nav-reviewer` e `nav-verifier`.

## Verifica della fase

- Le verifiche comuni del README.
- Navigazione Welcome → Leave, cambio guild, libreria ed editor.
- Tastiera e focus su menu e pillole.
- Accesso diretto e refresh con l'HTML SSR completo.
- Audio continuo tra i dettagli della stessa libreria, che si ferma uscendo.
