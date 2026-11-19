# Piano — sito pubblico Sounds: chiamate e caricamento progressivo

Fonte del comportamento: `docs/sounds-navigation-loading.md` (di seguito "spec"). Regole generali: `AGENTS.md`. Il piano ordina il lavoro e non aggiunge requisiti; in caso di conflitto prevale la spec, poi `AGENTS.md`, sempre sotto le richieste esplicite dell'utente.

## Stato di partenza (19/11/2026)

- Tutti i loader del sito usano `{ private: true, noStore: true }`, senza `search: []` né `serializationStrategy` (`src/lib/catalog-loaders.ts`). `useSoundsSite`, `useExplore`, `useCreator`, `useCreatorSounds` e `useSoundCard` sono bloccanti; solo `useSoundComments` è `blockSSR: false`.
- `useSoundsSite` unisce configurazione statica e `GET /me`; `viewer()` trasforma ogni errore in ospite.
- Nessun `onRequest` nel layout Sounds: niente `Cache-Control` sull'HTML né `Vary: Cookie` sui loader.
- `(search)/layout.tsx` e `u/[userId]/layout.tsx` leggono i loader in cima al componente strutturale.
- Ricerca e suggerimenti: ticket senza `AbortSignal`; suggerimenti da 1 carattere, timer non annullato.
- `SoundWave` scarica l'audio appena visibile (anche nella dashboard).
- Tutti i `Link` usano `prefetchData` predefinito (`intent`).
- L'editor della dashboard fa una seconda `GET /public/sounds/{id}` per l'immagine.

## Stato (19/11/2026)

Fasi F0–F8 implementate, tranne F7 (contratto di `GET /sounds/{id}` non disponibile in questa repo: `useSoundImage` invariato). Misure con fixture locale sulla build di produzione (`qwik build preview`), utente con cookie fittizio:

| Scenario | Prima | Dopo |
|---|---|---|
| Accesso diretto `/sounds/` | 2 | 2 |
| Clic su un suono da Explore (primo / successivi) | 17 | 4 / 3 |
| Chiusura del pannello | 4 | 0 |
| Accesso diretto al profilo | 3 | 3 |
| Clic su un suono dal profilo (primo / successivi) | 30 | 4 / 2 |
| Digitazione + invio di una ricerca | 2–6 | 2 |
| Download audio del pannello (apertura / Play) | 0 / 1 (waveform alta 0) | 1 / 0, con WaveSurfer |

Il primo clic dopo il documento scarica una volta i JSON dei loader di layout (la cache del browser è vuota); i successivi entro 60 s li leggono dalla cache. Il 3 dei clic successivi da Explore comprende Explore, richiesto per pagina per il limite dei layout di gruppo.

## Fasi

Ordine tecnico interno, non consegne separate. Nessun commit, push o deploy senza richiesta.

### F0 — Misura e verifica API

1. Fixture temporanea nello scratchpad (fuori dalla repo) che risponde agli endpoint pubblici e a `/me`, con log e ritardi configurabili. `BEEBOT_*` fittizi da riga di comando, senza leggere `.env`.
2. Build di produzione locale; contare le chiamate per: accesso diretto, clic su un suono, chiusura, creatore, hover sulle righe, ricerca.
3. Verificare in rc.5: loader non bloccanti esclusi dalle guardie, `invalidate()` dei loader, `AbortSignal` di `server$`, `prefetchData`, header dell'HTML.

### F1 — Confini server e cache

File: `src/routes/sounds/layout.tsx`, `src/lib/catalog-loaders.ts`, `src/lib/beebot/catalog.server.ts`, `src/components/site-header/site-header.tsx` (solo header neutro).

1. `onRequest` nel layout: HTML `private, no-store`, loader `Vary: Cookie`.
2. `useSoundsSite` senza rete; nuovo `useViewer` non bloccante, in cache 60 s, con `signedIn` dal cookie e profilo separato.
3. `search: []`, `serializationStrategy: 'always'` su tutti i loader; costante della cache nel modulo dei loader.

### F2 — Explore progressivo

File: `src/routes/sounds/(search)/layout.tsx`, `src/components/catalog/*`.

1. `useExplore` non bloccante e in cache.
2. Hero e ricerca sempre resi; Trending, Just added e tag come foglie in `Pending` con skeleton ed errore con retry.

### F3 — Pannello del suono

File: `src/components/catalog/sound-route.tsx`, `sound-panel.tsx`, `catalog-context.ts`, `sound-items.tsx`, `search-box.tsx`, route `[soundId]`.

1. `useSoundCard` non bloccante, `fail()` per gli errori; `onGet` documento per 404 e stato HTTP.
2. Card cliccata passata al pannello tramite `SearchContext`; base subito, dati dinamici in `Pending`.
3. `scroll={false}` sui link ai suoni; nessuno spostamento di focus.
4. Commenti con skeleton e retry.
5. Greet: `invalidate()` del viewer dopo il successo.

### F4 — Profilo creatore

File: `src/routes/sounds/u/[userId]/layout.tsx` e route figlie.

1. `useCreator` e `useCreatorSounds` non bloccanti e in cache; `onGet` documento per 404.
2. Hero e lista come foglie in `Pending`, lista con store proprio inizializzato dal loader.

### F5 — Ricerca e suggerimenti

File: `src/components/catalog/search-box.tsx`, `catalog-server.ts`, `(search)/layout.tsx`, `u/[userId]/layout.tsx`.

1. `AbortSignal` + ticket per ricerca, suggerimenti e lista del creatore.
2. Soglia minima dei suggerimenti come costante; timer e richiesta annullati su invio, tag, scelta e smontaggio.
3. Skeleton righe per nuova query; Load more conserva le righe; retry sugli errori.

### F6 — Media, prefetch, feedback

File: `src/components/sounds/sound-wave.tsx`, componenti catalog.

1. Player unico (`SoundPlayer`) e `SoundWave` con WaveSurfer.js: loader, download all'apertura, onda reale; clic e trascinamento spostano la riproduzione (decisione del 19/11/2026).
2. `prefetchData="off"` sui link a liste di suoni.
3. Nessuna barra di avanzamento: non resta alcun loader bloccante con rete.

### F7 — Editor

Verificare se `GET /sounds/{id}` contiene `imageUrl`. Se sì: parser `Sound` e rimozione di `useSoundImage`. Se no: invariato e documentato.

### F8 — Verifica e documentazione

1. `npx tsc --noEmit`, `node --test tests/*.test.mjs`, `npm run build`.
2. Conteggio chiamate dopo le modifiche con la stessa fixture; SSR senza JS; ritardi ed errori per regione; `sounds.localhost`.
3. README: sezione sul sito pubblico Sounds (loader, cache, prefetch, limiti).

## Agenti

Gli agenti `nav-*` sono condivisi tra dashboard e Sounds: il prompt indica la coppia spec + piano. Ciclo: implementazione → `nav-reviewer` e `syntax-officer` in parallelo → correzioni dei soli punti segnalati → due `APPROVATO` → `nav-verifier`.

## Rischi

- API sperimentali di rc.5 (`Pending`, `blockSSR`, `peekValue`): se non si comportano come documentato, usare `DocumentRecovery` e documentare il limite.
- L'SSR di rc.5 attende tutti i loader: l'accesso diretto non accelera.
- `sound-wave.tsx` e la route dell'editor sono toccati anche da `docs/fix-plan`: modifiche mirate.
- Il cookie di sessione senza `Domain` non arriva su `sounds.<dominio>`: fuori perimetro, segnalato.
