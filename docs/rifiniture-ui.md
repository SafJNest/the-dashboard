# Rifiniture UI — una scelta per asse

Obiettivo: togliere l'effetto "fatto con l'IA" senza cambiare stile. Ogni componente preso da solo va bene; il problema è che tra loro non concordano. Per esempio, nella card server convivevano quattro raggi diversi, tre stili di testo e un glow. La regola è: **un solo valore per asse** (raggio, badge, tipografia, colore, profondità, testi), applicato ovunque.

Questo è un lavoro **solo visivo e di testi**: niente nuove funzionalità, dati o API. Valgono le regole di `AGENTS.md`.

## Fonte

- Canvas "Beebot Dashboard": tutte le tavole sono già aggiornate. Riferimenti:
  - `system/tokens.css`, `system/components.css`, `system/finale.css`, `system/sounds.css`
  - Servers, Server admin, Leaderboard, Sounds, Explore, Design System
- Artifact "Beebot · Rifiniture": prima e dopo di Servers e Server admin, più la tavola "One choice per axis" con le regole.

## Regole

### 1. Raggio: 6 · 8 · 12

Nuovi token, da usare al posto di `sm/md/lg/pill` nei componenti:

- `--bb-radius-part: 0.375rem` (6px): badge, chip, opzioni dentro un menu, icona dentro un'opzione, pulsante interno di un controllo.
- `--bb-radius-control: 0.5rem` (8px): bottoni, input, select, combo, voce attiva della sidebar, righe cliccabili, like/dislike, copia comando, campo di ricerca piccolo.
- `--bb-radius-box: 0.75rem` (12px): card, menu e popover, save dock, toast, callout grandi, campo di ricerca grande.
- `--bb-radius-field` diventa uguale a `--bb-radius-control`.
- **Segmented:** contenitore `control + 2px`, elementi interni `part`. La regola è "raggio interno = raggio esterno meno il padding".
- **Restano tondi:** avatar delle persone, play button, switch, barre di progresso, scrollbar.
- **Server e guild:** quadrati con angolo 24%.
- **Niente pill altrove.** `--bb-radius-pill` resta solo per i casi tondi elencati sopra.

### 2. Badge solo per gli stati

- **Forma unica:** altezza 22px, padding 0 7px, `radius-part`, nessun bordo, font UI 12px medium, niente maiuscolo né letter-spacing.
- **Colori:** sfondo `bg-active` e testo `fg-muted`. Varianti accent, warning, danger, success con sfondo `*-muted` e testo `*-fg`. Nessuna variante ha il bordo.
- **Fatti, non stati:** ruolo, numero membri, numero ranked, livello, "N modules on" diventano testo semplice nella riga di dettaglio (`Owner · 1,284 members`).
- **Sidebar delle impostazioni:**
  - modulo attivo: nessun badge;
  - modulo spento: "Off" come testo `fg-subtle`, regular, senza sfondo;
  - conteggi (rewards, twitch) come testo semplice.
- **Livelli:** `LVL 5` diventa `Level 5`. Nelle tabelle si mette solo il numero, la colonna si chiama già "Level".
- **Restano badge:** Live, Mute, Kick, Ban, Fix, Linked, Public/Private/View only, Yours, APP del mockup Discord.

### 3. Mono solo per il codice

- **In Geist Mono restano:** comandi slash, ID, nomi di canale, durata audio, `kbd`.
- **Tornano al font UI**, 12px medium `fg-subtle`, maiuscole normali, senza letter-spacing:
  - eyebrow e overline
  - titoli dei gruppi (sidebar, listbox, combo)
  - intestazioni delle tabelle
  - etichette dei suggerimenti e dei facts
- **Eccezione, la landing:** l'eyebrow resta mono, maiuscolo e giallo (es. "500 WORKER NODES · ONE HIVE"). Serve una variante dedicata (nel canvas è `bb-eyebrow--mono`) usata solo lì.
- Il comando slash nell'intestazione delle impostazioni resta mono, ma in `fg-muted` invece che giallo.

### 4. Colore e profondità

- **Giallo solo per due cose:** azione primaria e stato acceso (switch, tab attivo, selezione). L'eyebrow non è più gialla, salvo nella landing.
- **Glow:**
  - nessun glow su bottoni primari, play hover (diventa `accent-hover`), switch, avatar, pallini dei ruoli, chip, barre "peak";
  - `--bb-btn-glow: none`;
  - `--bb-glow-*` restano definiti solo per la landing.
- **Card:** bordo più superficie, niente ombra. Il vetro (sfondo traslucido più blur) resta perché è lo stile scelto, ma senza `box-shadow`. Ombra solo per popover e menu (`shadow-overlay`).
- **Voce attiva della sidebar:** sfondo `bg-active`, senza contorno giallo.
- **Callout danger:** solo sfondo, senza riga interna.
- **Ring dell'avatar:** rimosso.
- **Sfumature gialle:** nessuna sfumatura gialla di sfondo nelle pagine della dashboard e di Explore. Restano solo nella landing.

### 5. Testi semplici

Dentro dashboard e pagine funzionali, le etichette descrivono il dato. Le metafore (hive, orbit, buzz) restano su landing, footer e titoli marketing.

- `servers.tsx`: eyebrow "Your hive" → toglierla, oppure "Dashboard".
- Profilo: eyebrow "Your hive" → "Profile".
- Leaderboard: "#1 · Queen of the hive" → "#1 this season".
- Stati ed errori:
  - "The hive is having a moment" → "Something went wrong" (`error.tsx` per il 500 e gli stati della dashboard);
  - "The hive didn't answer in time" → "Beebot didn't answer in time";
  - "We searched the whole hive" → "No results";
  - "Beebot will buzz the server" → "Beebot posts in the server".
- Card server: niente frasi decorative ("in orbit", "waiting", "bright ones").

### 6. Card server (`servers.tsx`)

- Su una riga: icona 44px quadrata (angolo 24%, senza ring), nome, riga di dettaglio `fg-subtle` (ruolo, e solo i dati che l'API dà già), azione Manage come bottone secondary small (`radius-control`).
- Nessun badge per il ruolo.
- Card con padding 16px e `radius-box`.
- Non inventare "modules on" o i server senza Beebot se l'API non li restituisce: si aggiungono quando arrivano i dati.

## File da toccare

| File | Cosa |
|---|---|
| `src/styles/tokens.css` | Nuovi `--bb-radius-part/control/box`; `field` = `control`; `--bb-btn-glow` a `none` dove è definito. |
| `src/styles/components/typography.css` | Eyebrow e overline nel font UI; variante mono per la landing. |
| `src/styles/components/badge.css` | Forma unica, senza bordo, senza mono e senza maiuscolo. |
| `src/styles/components/button.css` | `radius-control`, niente glow, primario medium. |
| `src/styles/components/segmented.css` | Contenitore `control + 2px`, elementi `part`. |
| `src/styles/components/chip.css` | `radius-part`. |
| `src/styles/components/combo.css` | `radius-control`, titoli gruppo nel font UI, opzioni `part`, popover `box`. |
| `src/styles/components/form.css` | Ricerca `radius-control`; mono solo dove c'è codice. |
| `src/styles/components/navigation.css` | Sidebar: voce attiva `bg-active` senza contorno, gruppi nel font UI, badge come testo, "On" nascosto. Header nav e pill utente invariati. |
| `src/styles/components/table.css` | Intestazioni nel font UI. |
| `src/styles/components/switch.css` | Niente glow da acceso; resta tondo. |
| `src/styles/components/audio.css` | Play hover senza glow. |
| `src/styles/components/card.css`, `callout.css`, `listbox.css`, `avatar.css` | Raggi `box` / `control` / `part`, niente ombre sulle card, niente ring. |
| `src/components/sounds/sounds.css` | Allineare ai raggi (righe `control`, popover `box`, chip `part`), via le pill e i glow, etichette nel font UI. |
| `src/routes/dashboard/dashboard.css` | Pill e glow → regole sopra; card server. |
| `src/components/dashboard/save-dock.css` | `radius-box`, pallino senza glow. |
| `src/components/guild/reward-settings.tsx`, `experience-settings.tsx`, `settings-nav.tsx` | `LVL` → `Level`, conteggi come testo, "On" non mostrato. |
| `src/components/dashboard/servers.tsx`, `src/routes/error.tsx` e altri testi della dashboard | Testi del punto 5. |
| `src/routes/(site)/commands/commands.css`, `src/components/legal/legal.css` | Etichette maiuscole e mono → font UI dove non sono codice. |
| `src/components/site-header/site-header.css`, `src/routes/landing.css`, `call-to-action.tsx` | **Non toccare** gli effetti della landing. Nell'header pubblico i bottoni seguono `radius-control`; i link di navigazione restano come sono. |

## Verifica

- `npx tsc --noEmit`, `node --test tests/*.test.mjs`, `npm run build`.
- Controllo visivo nel browser a 1440 e 390px:
  - lista server
  - impostazioni guild (sidebar, combo ruoli e canali, segmented, save dock)
  - leaderboard
  - sounds della guild e miei suoni
  - landing (deve restare identica, salvo i bottoni dell'header)
- Contrasto: le etichette `fg-subtle` a 12px devono restare leggibili nel tema attuale.
- `grep` finale: nessun `radius-pill` fuori da avatar, play, switch, barre e scrollbar; nessun `glow` fuori dalla landing; nessun `text-transform: uppercase` fuori da landing e `kbd`.

Nessun commit senza richiesta.
