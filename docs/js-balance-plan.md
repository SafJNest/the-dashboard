# Piano bilanciamento JavaScript e HTML/CSS first

Handoff per Codex, redatto il 2026-11-21 dopo un'analisi senza modifiche al codice. Vale insieme ad `AGENTS.md`, che ha la precedenza su stile e struttura.

## Obiettivo

Trovare il miglior equilibrio tra JavaScript, fetch e prefetch:

- niente ricarica completa della pagina a ogni link (l'estremo iniziale del progetto);
- niente codice eseguito o scaricato senza motivo (l'estremo "stile Next");
- il codice di ogni tipo di pagina scaricato **una volta**, **prima del click**, e al click soltanto i dati (Qwik → Beebot → Qwik);
- tutto ciò che può vivere nel DOM vive in HTML e CSS. JavaScript solo per comportamento, dati e accessibilità non coperta dai controlli nativi.

## Stato misurato (Qwik 2.0.0-rc.5)

- Installati `@qwik.dev/core` e `@qwik.dev/router` 2.0.0-rc.5, che è anche l'ultima versione pubblicata su npm. La documentazione dell'MCP Qwik è allineata (`matchesProject: true`).
- Strategia di produzione `smart` (default). In dev la strategia è sempre `segment` e Vite serve moduli non bundlati: le misure si fanno **solo** sulla build.
- Build client: **470 chunk, 637 KB raw, 242 KB brotli**. 256 file sono sotto i 300 byte, quasi tutti stub client di `routeLoader$`, `routeAction$` e `server$` (per esempio `var e=null;export{e as s_…}`) oppure singoli handler.
- Pesi principali in brotli: core 34 KB, router 6 KB, qwikloader 2 KB, preloader 1,7 KB, `wavesurfer` 51 KB raw (`import()` dinamico).
- Landing `/` in preview di produzione: circa 10 file subito, poi circa 135 `modulepreload` a bassa priorità per le route dei `Link` visibili (`/sounds`, `/dashboard`, `/commands`, `/terms`, `/privacy`).
- Il prefetch è **per template di route**: su `/sounds/` i 20 link ai suoni hanno tutti `data-q-route="/sounds/[soundId]"` e il codice si scarica una volta sola. Funziona già come desiderato.
- Produzione: i file `/build/` rispondono `cache-control: public, max-age=31536000, s-maxage=31536000, immutable` (verificato su safjnest.com). In `vite preview` locale invece c'è `no-cache`: le revalidation da circa 300 byte in locale non sono un problema reale.
- Navigazione landing → `/commands/` (dopo 10 s sulla landing): il codice della route Commands era già in cache. Sono però partiti **dalla rete, al click**:
  - `@qwik-router-config` (2,5 KB raw);
  - `useQwikRouter_goto` (13 KB raw, circa 5 KB brotli).

  Misura fatta con il browser pane **nascosto** (timer rallentati): va confermata.
- Strategie di bundling a confronto (build temporanee):

  | Strategia | File | Sotto 300 B | Brotli |
  |---|---|---|---|
  | `smart` (attuale) | 470 | 256 | 242 KB |
  | `component` | 338 | 143 | 226 KB |
  | `single` | 213 | 130 | 180 KB, ma un unico bundle app da 64 KB brotli che include la dashboard |

## Come misurare (prima e dopo ogni fix)

1. Build di preview, senza modificare la repo (`dist/` e `server/` sono in `.gitignore`):

   ```bash
   npx vite build && npx vite build --ssr src/entry.preview.tsx
   ```

   ```bash
   npx vite preview --port 4173 --strictPort
   ```

2. Usare un browser **visibile** (pane in primo piano). Con il pane nascosto i timer sono rallentati e i tempi non sono affidabili.
3. In locale `/sounds/` e le route che chiamano Beebot rispondono 503 senza backend: misurare su `/`, `/commands/`, `/terms/` e `/privacy/`, oppure con l'env reale.
4. Contare le risorse al caricamento (dalla console della pagina):

   ```js
   const entries = performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/build/'));
   ({ count: entries.length, list: entries.map((entry) => `${Math.round(entry.startTime)}ms ${entry.name.split('/').pop()}`) });
   ```

5. Navigazione: dopo 10 s salvare `performance.getEntriesByType('resource').length`, cliccare un `Link`, attendere 3 s e leggere solo le risorse nuove. Atteso: **solo** `q-loader-*.json`, nessun `/build/*.js` con `transferSize` maggiore di qualche centinaio di byte.
6. Analisi della build: `dist/q-manifest.json` contiene per ogni bundle `size`, `symbols` e `origins`. I campi `core`, `preloader` e `bundleGraphAsset` identificano i file di sistema.
7. Header in produzione:

   ```bash
   curl -sI https://safjnest.com/build/<file>.js
   ```

## Criteri di "bilanciato"

- **Pagine statiche** (`/`, `/commands/`, `/terms/`, `/privacy/`): nessuna esecuzione di Qwik prima di un'interazione. Restano solo qwikloader, preloader e bundle graph, più i preload a bassa priorità.
- **Prima navigazione** via `Link`: zero JavaScript dalla rete, solo dati.
- **Stesso tipo di pagina** (un altro suono, un'altra board): nessun codice nuovo, solo dati.
- Nessuna regressione di SSR, accesso diretto, `SaveDock` e `usePreventNavigate$`, focus e tastiera.

## Fix concordati, in ordine

### 1. Navigazione pronta prima del primo click

- **Problema**: `@qwik-router-config` e `useQwikRouter_goto` si scaricano al click (vedi Stato misurato).
- **Prima**: rimisurare con il pane visibile, ripetendo il passo 5 di "Come misurare". Se dopo 10 s sono già in cache, chiudere il punto senza modifiche.
- **Se confermato**: capire perché il preloader non li ha presi in tempo. Ipotesi principale: finiscono in coda dietro i circa 135 bundle delle route visibili (`maxIdlePreloads` 25, bassa priorità); il fix 3 riduce quella coda. Consultare `PreloaderOptions` in `node_modules/@qwik.dev/core/dist/server.d.ts` e la pagina `/docs/advanced/modules-prefetching/` dell'MCP Qwik. Non alzare `ssrPreloads` senza misurare l'LCP: la documentazione avverte che lo peggiora.
- **Codice osservato**: `node_modules/@qwik.dev/router/lib/index.qwik.mjs`. `prefetchRoute` e `preloadRouteBundles` chiamano `_requestPreload(routeName, 0.8)`. L'observer dei link parte su `q-d:qcinit` (`linkPrefetchInit`), cioè subito dopo `qinit`.

### 2. Analytics fuori da `useVisibleTask$`

- **Dove**: [src/root.tsx:12](../src/root.tsx).
- **Problema**: `useVisibleTask$` con `document-idle` obbliga **ogni pagina** a scaricare ed eseguire core, router e serializer solo per chiamare `inject()` e `injectSpeedInsights()`. È l'unica ragione per cui le pagine statiche eseguono Qwik al load.
- **Fix**: caricare Vercel Analytics e Speed Insights come normali `<script defer>` nell'`head` di `root.tsx`. **Verificare prima sulla documentazione Vercel attuale** lo snippet HTML supportato e gli URL (`/_vercel/insights/script.js`, `/_vercel/speed-insights/script.js`). Se non c'è uno snippet ufficiale, fermarsi e riferire.
- **Conseguenza**: se gli import da `@vercel/analytics` e `@vercel/speed-insights` non servono più, rimuoverli e valutare le dipendenze, controllando prima tutti i consumatori.
- **Verifica**: sulla landing, il core (`q-manifest.json` → `core`) deve arrivare solo come preload a bassa priorità, senza esecuzione prima di un'interazione. Gli eventi analytics devono continuare a partire in produzione.

### 3. Prefetch su intento per i link poco probabili

- **Problema**: il default di `Link` è `prefetchBundles="visible"`. I link del footer (`/terms`, `/privacy`) e quelli secondari mettono in coda il codice di pagine che quasi nessuno apre.
- **Fix**: `prefetchBundles="intent"` sui link del footer (`site-footer`) e sugli altri link a bassa probabilità. I link principali (`/sounds`, `/dashboard`, liste di suoni e board) restano `visible`.
- **Da non confondere**: `prefetchData` (dati) è un'altra cosa. Le liste hanno già `prefetchData="off"` (vedi README), e la regola resta.
- **Verifica**: la landing passa da circa 145 a molti meno file. Il fix 1 deve migliorare, o almeno non peggiorare.

### 4. Menu con `popover` nativo al posto di `useOnDocument`

Regola: un menu non blocca la pagina, quindi si usa `popover="auto"`. La chiusura al click esterno e con Escape la fa il browser, senza JavaScript.

| File | Oggi | Fix |
|---|---|---|
| [src/routes/dashboard/layout.tsx:69](../src/routes/dashboard/layout.tsx) | `useOnDocument('click')` | capire cosa chiude o intercetta; se è un menu → popover |
| [src/components/dashboard/guild-switcher.tsx:16](../src/components/dashboard/guild-switcher.tsx) | `details` + `useOnDocument('click'/'keydown')` | `popovertarget` + `popover="auto"` |
| [src/components/guild/combo.tsx:25](../src/components/guild/combo.tsx) | `details` + `useOnDocument('click'/'keydown')` | popover; `sync$` solo se resta necessario |
| [src/components/sounds/greet-picker.tsx:24](../src/components/sounds/greet-picker.tsx) | `details` + `useOnDocument('click'/'keydown')` | popover |

- Riferimenti già corretti nella repo: `account-menu.tsx`, `quick-search.tsx`, `add-to-board.tsx` usano già `popover="auto"` e `popovertarget`. `src/styles/components/popover.css` gestisce `:popover-open`.
- Mantenere label, `aria-*`, focus visibile e ritorno del focus al trigger. Lo stile dello stato aperto passa da `:popover-open`, non da signal.
- **Da lasciare**: i `useOnDocument('keydown'/'keyup')` e `useOnWindow('blur')` di `board-keys.tsx` sono scorciatoie da tastiera reali. Verificare comunque che non siano registrati su pagine che non mostrano la tastiera. `useOnWindow` per `NAVIGATION_CANCELLED` e `popstate` in `dashboard/layout.tsx:81-86` va capito prima di toccarlo.

### 5. `useVisibleTask$` dei pannelli

- **Dove**: [src/components/catalog/sound-panel.tsx:120](../src/components/catalog/sound-panel.tsx), [src/components/catalog/board-panel.tsx:92](../src/components/catalog/board-panel.tsx), [src/components/soundboards/owner-board.tsx:119](../src/components/soundboards/owner-board.tsx).
- **Problema**: `revealPanel` con `document-ready` fa eseguire Qwik al load su ogni accesso diretto a un suono o a una board.
- **Fix**: verificare se HTML e CSS ottengono lo stesso risultato (ancora/`:target`, `scroll-margin`, `scroll-snap`, `autofocus` sull'heading del pannello). Se sì, eliminare il task. Se serve davvero JavaScript, giustificarlo vicino al codice o nel README. Rispettare la regola del README: aprire un suono non scorre la pagina, e su una colonna porta il pannello in vista.

### 6. `wavesurfer` (solo se misurato lento)

- **Dove**: [src/components/sounds/sound-wave.tsx:26](../src/components/sounds/sound-wave.tsx) e `:41` (`import('wavesurfer.js')`).
- La documentazione Qwik dice che un `import()` normale non viene mai prefetchato dal preloader. Misurare il tempo del primo waveform. Se è lento, anticipare l'import sull'intento (hover o focus del play). Non caricarlo all'ingresso della pagina.

### Da non fare

- `entryStrategy: { type: 'single' }`: un bundle unico con dentro la dashboard anche per chi visita la landing.
- `preloader: false`: ogni click aspetterebbe i file in cascata.
- Alzare `ssrPreloads` senza una misura dell'LCP.
- Cambiare strategia (`component`) senza una misura che mostri un guadagno reale.

## Audit HTML/CSS first (fase separata, prima delle modifiche)

Richiesta esplicita: un audit **ossessivo e aggressivo** su **tutti** i componenti in `src/components` e `src/routes`. Prima si consegna l'inventario (componente, cosa fa in JS, alternativa nativa, rischio), poi si implementa per gruppi.

### Regole da applicare

- Ogni trigger è un controllo nativo: link per navigare, `button` per le azioni, `input type="range"` per gli slider, `checkbox` e `radio` per toggle e selezioni, `select` per le scelte, `details` per le sezioni espandibili, `dialog` per le modali, `popover` per i menu.
- Nessun signal che duplica uno stato già nel DOM: `:checked`, `[open]`, `:popover-open`, `:modal`, `:user-invalid`, `:disabled`, `:focus-within`, `:has()`.
- **Modali**: `dialog` aperto con `command="show-modal"` / `commandfor` invece di `onClick$={() => dialog.value?.showModal()}`; chiusura con `command="close"` o `form method="dialog"`. Verificare il supporto browser delle Invoker Commands nei target del progetto prima di adottarle.
- **Menu e tendine**: `popover="auto"` + `popovertarget`. Non bloccano la pagina.
- **Stato visivo**: classi e pseudo-classi CSS, transition CSS e `prefers-reduced-motion`; mai `style` impostato da JavaScript per mostrare o nascondere.

### Candidati già individuati

| File | Pattern | Direzione |
|---|---|---|
| [src/components/dashboard/save-dock.tsx](../src/components/dashboard/save-dock.tsx) | `hidden={!dirty.value}` | apparizione via CSS sullo stato del form (`form:has(…)`), con transition. **Attenzione**: `dirty` serve anche a `useUnsavedChangesGuard` / `usePreventNavigate$` (regola AGENTS), quindi il segnale resta per la guardia; si sposta solo la visibilità |
| [src/components/soundboards/owner-board.tsx:184](../src/components/soundboards/owner-board.tsx) | `onClick$` → `dialog.showModal()` | `command="show-modal"` |
| [src/components/sounds/owner-sound.tsx:191](../src/components/sounds/owner-sound.tsx) | `onClick$` → `dialog.showModal()` | `command="show-modal"` |
| [src/components/catalog/search-box.tsx:24](../src/components/catalog/search-box.tsx) | `useSignal(false)` `open` | popover o `:focus-within` |
| [src/components/guild/settings-form.tsx:41](../src/components/guild/settings-form.tsx) | `dirty` signal | vedi SaveDock |
| [src/components/dashboard/quick-search.tsx:30](../src/components/dashboard/quick-search.tsx) | focus impostato via JS all'apertura | `autofocus` dentro il popover |
| [src/components/catalog/add-to-board.tsx:19-20](../src/components/catalog/add-to-board.tsx) | `creating`, `gate` | verificare se sono stati del DOM |
| [src/components/catalog/sound-panel.tsx](../src/components/catalog/sound-panel.tsx), [board-panel.tsx](../src/components/catalog/board-panel.tsx) | `gate`, `voting`, `loading` | distinguere stato di rete (resta JS) da stato visivo (CSS) |

File con più handler, da passare per primi: `catalog/comments.tsx` (17), `routes/sounds/(search)/layout.tsx` (10), `soundboards/board-keys.tsx` (7), `guild/role-picker.tsx` (7), `sounds/owner-sound.tsx`, `guild/channel-picker.tsx`, `dashboard/quick-search.tsx`, `catalog/sound-panel.tsx`, `catalog/search-box.tsx` (6 ciascuno), `soundboards/owner-board.tsx` (5).

Gli stati di rete (`busy`, `isRunning`, doppio invio, risposte fuori ordine) restano in JavaScript: sono comportamento, non presentazione.

## Modo di lavoro

- Analisi e implementazione restano separate: consegnare prima l'audit, poi i fix per gruppi, mostrando file e modifiche.
- Usare CodeGraph per chiamanti e consumer prima di modificare o eliminare, e reindicizzare dopo.
- Dopo ogni fix: build, controllo TypeScript, misure prima/dopo con il metodo sopra, verifica nel browser di tastiera, focus, console e accesso diretto.
- Riportare con precisione cosa è misurato e cosa no.
- Il working tree ha modifiche preesistenti non correlate (header, account menu, theme): non toccarle e non includerle nei commit di questa fase.
