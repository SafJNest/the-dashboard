# Piano di fix — Beebot Dashboard

Piano approvato il 2026-11-15, da eseguire a partire dal 2026-11-17. Nasce da tre audit in sola lettura del codice confrontato con le regole di `AGENTS.md`:

- i tre rilievi della review del 12/11, che risultano ancora presenti;
- `src/lib` e le parti server delle route;
- componenti, route e CSS.

Ha trovato bug confermati, molta duplicazione e un `src/lib/beebot.server.ts` con troppe responsabilità.

Le regole valgono in quest'ordine di priorità: richieste esplicite dell'utente → `AGENTS.md` → questo piano. Il piano ordina il lavoro e non aggiunge requisiti.

## Fasi

| # | File | Contenuto | Stato |
|---|---|---|---|
| 0 | [00-regole-scrittura.md](00-regole-scrittura.md) | Regole di formattazione e passata meccanica (`if`, condizioni spezzate, commenti) | da fare |
| 1 | [01-bug.md](01-bug.md) | I tre rilievi della review e i bug nuovi di comportamento e affidabilità | da fare |
| 2 | [02-pulizia.md](02-pulizia.md) | Pulizia locale di lib, route, CSS e token, senza cambiare l'architettura | da fare |
| 3 | [03-backend.md](03-backend.md) | Backend a layer e funzioni di dominio spostate in classi. **Le classi vanno approvate dall'utente prima di implementarle** | da approvare |
| 4 | [04-frontend.md](04-frontend.md) | Context della libreria, componenti condivisi, controlli unificati | da fare |

Ordine obbligatorio: 0 → 1 → 2 → 3 → 4. Ogni fase tocca file di quella precedente, quindi le fasi non si eseguono in parallelo. Quando una fase è finita, aggiornare la colonna "Stato" (`in corso`, `fatta`, con data e commit).

## Scelte già fatte dall'utente

- Perimetro: tutto, diviso in fasi.
- Cache della libreria suoni: togliere `maxAge: 300` da `useMySounds` e `useGuildSoundLibrary`.
- Formattazione: vedi le regole decise in `00-regole-scrittura.md`. Le proposte elencate lì sono ancora **da confermare** e non vanno applicate finché l'utente non le approva.

## Flusso di lavoro con gli agenti

Gli agenti stanno in `.claude/agents/`:

| Agente | Ruolo | Scrive codice |
|---|---|---|
| `fix-developer` | Implementa una fase o un task di questo piano | sì |
| `fix-controller` | Controlla che il diff faccia esattamente ciò che chiede il task: niente di più, niente di meno, comportamento corretto, verifiche riportate con precisione | no |
| `syntax-officer` | Controlla come è scritto il codice: formattazione, nomi, commenti, ordine dei membri, CSS e token, secondo `00-regole-scrittura.md` e `AGENTS.md` | no |

Ciclo per ogni task o fase:

1. `fix-developer` implementa il task e consegna un report: file toccati, verifiche fatte, punti aperti.
2. `fix-controller` e `syntax-officer` controllano lo stesso diff in parallelo. Entrambi finiscono con `APPROVATO` o `NON APPROVATO`.
3. Se c'è un `NON APPROVATO`, `fix-developer` corregge solo i punti segnalati e si torna al passo 2.
4. Con due `APPROVATO`, si fanno le verifiche della fase, si aggiorna lo stato qui sopra e si prepara un commit separato (`main: …`). Il commit si fa solo su richiesta dell'utente.

Per i task che toccano navigazione e caricamento (`docs/claude-navigation-loading.md` per la dashboard, `docs/sounds-navigation-loading.md` per il sito pubblico Sounds) si usano anche `nav-reviewer` e `nav-verifier`, indicando l'ambito nel prompt.

## Strumenti

- **CodeGraph va usato sempre** per esplorare struttura, chiamanti, consumer e impatto prima di modificare o eliminare codice. La ricerca testuale serve solo per stringhe letterali. Dopo le modifiche va reindicizzato.
- Qwik MCP e i `.d.ts` in `node_modules/@qwik.dev/*` servono per verificare ogni API di Qwik 2 / Router `2.0.0-rc.5`.

## Verifiche comuni

- `npx tsc --noEmit`
- `node --test tests/*.test.mjs`
- `npm run build`
- Nel browser, per le modifiche alla UI (`npm run dev`): navigazione, console, rete, tastiera, focus. Accesso diretto e refresh devono restituire l'HTML SSR completo.
- Nessuna richiesta a Beebot, a Discord o al sito privato reali. Riportare in modo esplicito cosa è verificato e cosa no.
