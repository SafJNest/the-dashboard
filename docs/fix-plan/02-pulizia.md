# Fase 2 — Pulizia locale

Nessun cambio di architettura: costanti, duplicati, codice morto, nomi, CSS e token. Prima di eliminare o spostare qualcosa, controllare chi lo usa con CodeGraph.

## Lib e route

**Costanti con nome nella classe o nel modulo owner**
- Trasporto e sessione:
  - timeout `15000` (`src/lib/beebot.server.ts:118`);
  - byte dello state `32` (`:106`);
  - durata della sessione `8 * 60 * 60` (`src/routes/auth/callback/index.ts:24`);
  - limiti `512` (`:11`) e `1024` (`:22`).
- Libreria suoni:
  - tag `slice(0, 32)` (`src/routes/dashboard/me/sounds/[soundId]/edit/index.tsx:52`);
  - `slice(0, 5)` (`src/lib/sound-library.ts:119`).
- Statistiche (`src/lib/sound-stats.ts`):
  - `92`/`7` (`:143-151`) e `24` (`:127`);
  - la chiave `weekday * 100 + hour` (`:71-72, 121, 128`) va in una funzione.
- `'Europe/Rome'` diventa una costante (`src/lib/sounds.ts:430, 467, 482`).
- `sound-loaders.ts`: una costante per le opzioni dei loader e un helper per leggere il periodo dal cookie. La stessa costante di `maxAge` si usa in `src/routes/dashboard/layout.tsx:31` e in `[guildId]/layout.tsx:23`.

**Duplicati da unire**
- Regex snowflake:
  - `settings.ts:21` `ID` e `sounds.ts:9` `SOUND_ID` diventano un'unica costante;
  - `GUILD_ID` (`sounds.ts:10`) si sposta vicino alla guild.
- `SOUND_NOT_FOUND` va importata in `edit/index.tsx` (righe 14, 36, 46) invece di essere riscritta.
- Lettura dei form:
  - si riusano `settings.ts` `text()`/`ids()` in `dashboard/layout.tsx:40,56-58`, `[guildId]/layout.tsx:26-27`, `edit/index.tsx:34,52`;
  - `tagList` (`edit/index.tsx:27-30`) si fonde con `ids` (`settings.ts:42-47`).
- `FieldError` (`sounds.ts:206-210`) e `SettingsProblem` (`guild.ts:26-30`) diventano un solo tipo con un solo parser. Va scelto un unico default per `code`.
- `ApiResult` (`beebot.server.ts:52`) e `ClientResult<unknown>` (`client.server.ts:37`) sono lo stesso tipo; `SessionEvent` è dichiarato due volte.
- Loader dell'invito: `src/routes/index.tsx:12` e `src/routes/(site)/layout.tsx:9` diventano un solo loader in `src/lib/invite.ts`.
- `onGet` identici in `rewards/index.tsx:8-16` e `twitch/index.tsx:8-16` → un solo helper.
- `mySoundTitle` e l'head di `[guildId]/sounds/[soundId]/index.tsx:9-11` fanno la stessa ricerca.
- `PERIOD_LABELS` e `PERIOD_COOKIE` (`sounds.ts:4-5`) sono etichette di UI e nome di un cookie dentro il modulo di dominio: vanno spostati nel rispettivo owner.

**Log e segreti**
- Il login nasconde `BEEBOT_API_KEY` nei log, `sessionFetch` (`beebot.server.ts:150`) no. Il rischio è basso, perché registra solo nome, codice o messaggio dell'errore, ma la regola va resa uguale nei due punti.
- Gli `.catch(() => undefined)` del pre-avvio dei loader (`[guildId]/sounds/layout.tsx:16-18`, `me/sounds/(library)/layout.tsx:25-26`) sono intenzionali: gli errori ricompaiono nei loader (`README.md:110`). Vanno lasciati. Per la regola sui commenti non si aggiunge una nota nel codice: il motivo resta solo nel README.

**Codice morto** (verificare i consumer prima di eliminare)
- Da eliminare: `searchSounds` e `SoundSearch` (`client.server.ts:43-49, 111-113`), `parseSoundSearch` (`sounds.ts:495`), `Account` (`client.server.ts:39`).
- Da togliere dall'`export` se usati solo nel proprio file: `parseServers`, `ApiResult`, `ClientResult`, `SettingsInputError`, `bucketLabel`, `inBucket`, `guildLibraryModel`/`myLibraryModel`/`guildLibraryStats`/`myLibraryStats`, `guildSoundsPath`, `MY_SOUNDS_PATH`, `LibraryStats`, `LibraryState`.
- `PUBLIC_SITE_URL` in `.env.example`, se nessuno lo usa.

**Nomi senza abbreviazioni**
- Campi dei form `orig:`/`xp:`/`mod:` → `original:`/`experience:`/`modifier:`, cambiati insieme in `experience-settings.tsx` e `settings.ts`, con i test aggiornati.
- Classi CSS: `ctxtabs`/`ctxtab`, `crumb-sep`, `cta`, `dist`, `sidenav`.
- Testi della UI "LVL" e "Avg": chiedere all'utente prima di cambiarli.
- `view: options`, rinominato in `src/components/sounds/sound-detail.tsx:76`.
- Nomi in `src/lib`: `ids` (`settings.ts`), `Json`, `sub` (`commands.ts:144`).

**Stile**
- `src/components/guild/role-picker.tsx:30`: `forEach` → `selected.value = []`.
- `formatDuration` (`guild.ts:227-234`): `for...of` invece di una variabile modificata dentro `map`.
- `ownerCounts` (`sound-library.ts:138`) calcolato in una sola passata.
- L'icona orologio scritta inline in `sound-charts.tsx:39-42` → `<Icon name="clock">`.

## CSS e token

`src/styles/tokens.css` resta l'unica fonte.

**Stato che il CSS può già leggere**
- `nav-progress--active` (`app-header.tsx:66`, `dashboard/layout.tsx:157`) → `.dashboard[aria-busy="true"] .nav-progress`, eliminando la prop `navigating`.
- `data-saving` (`settings-form.tsx:49`, `dashboard.css:630,635`) → `.settings-form:has(.save-dock__submit[aria-busy="true"])`.

**Duplicati**
- `.page-skeleton` è definito sia in `dashboard.css:578-585` sia in `page-skeleton.css:1-8`.
- Le keyframe `pop-in` (`sounds.css:1275`) e `combo-in` (`combo.css:367`) diventano una sola.
- Una classe di superficie per i popover: `greet__pop`, `combo__pop`, `listbox`, `tag-box__list`.
- SVG dell'ape: `bee/bee.tsx:17-29` diventa `<use href="#bb-bee">` (già definito in `bee-defs.tsx`); un solo foglio `bee.css`.

**Token nuovi, solo dove servono**
- Anello di focus `0 0 0 3px var(--bb-accent-subtle)` (`combo.css:25`, `sounds.css:653,1209`).
- `#fff` (`badge.css:35`, `bee/bee.css:8`) → `--bb-fg-on-blurple` o un nome equivalente.
- Backdrop `rgb(0 0 0 / 0.6)` (`sounds.css:1256`).
- Raggi 2px/3px/0.375rem/0.1875rem → `--bb-radius-2xs` (e passi vicini se servono); dimensioni di testo 0.625rem/0.9375rem → `--bb-text-3xs` o la scala esistente.
- Durate ed easing scritti a mano: `bee.css`, `save-dock.css:75`, `dashboard.css:618`, `toast.css:13`, `skeleton.css:26,30`, `landing.css:269`.
- Spaziature fuori scala (0.375/0.625/0.875/0.125/0.1875rem): allinearle alla scala esistente o aggiungere i passi mancanti.
- I valori esadecimali diretti del tema chiaro (`tokens.css:222-236`) passano a primitivi della palette.

**Token da rimuovere** (dopo aver controllato chi li usa)
- Inutilizzati: `--bb-yellow-4`, `--bb-yellow-11`, `--bb-violet-4`, `--bb-blue-9`, `--bb-orange-9`, `--bb-discord-embed`, `--bb-bg-skeleton-pulse`.
- Con lo stesso valore: `--bb-honey-2` = `--bb-yellow-9`, `--bb-bee-stripe` = `--bb-fg-on-accent`, `--bb-honey-bright` = `--bb-accent-hover`, `--bb-role-default` = `--bb-fg-subtle`.

## Verifica della fase

Le verifiche comuni del README. Poi un controllo visivo delle pagine toccate, nel tema implementato: contrasto, focus, hover e reduced motion invariati.
