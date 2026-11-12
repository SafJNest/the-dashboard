# Piano — navigazione, dati progressivi e skeleton

Fonte del comportamento: `docs/claude-navigation-loading.md` (di seguito "spec"). Regole generali: `AGENTS.md`. Questo piano ordina il lavoro; non aggiunge requisiti. In caso di conflitto prevale la spec, poi `AGENTS.md`, sempre sotto le richieste esplicite dell'utente.

## Mandato operativo

- Implementare tutti i comportamenti descritti nella spec. Questo è un incarico di modifica del codice della dashboard: non fermarsi alla pianificazione o alla preparazione degli agenti.
- Non aggiungere attività accessorie: niente nuovo finto Beebot completo, infrastruttura di test, framework di benchmark, dashboard diagnostiche o nuovi agenti.
- Nessuna modifica al repository/backend Beebot, nessun nuovo endpoint o servizio e nessuna funzionalità ulteriore rispetto alla spec.
- Effettuare verifiche proporzionate usando test e strumenti disponibili. Piccole simulazioni temporanee, se necessarie, servono a verificare il comportamento modificato; non diventano un progetto preliminare o un nuovo prodotto nella repository.
- Non interrogare il sito privato o i servizi reali. Riportare con precisione ciò che non è verificabile localmente.
- Procedere fino al completamento delle modifiche autorizzate, chiedendo solo per dubbi di prodotto nuovi o impedimenti reali. Nessuna richiesta di approvazione all'utente a ogni fase.

## Stato di partenza (12/11/2026)

- Modifiche preesistenti da preservare: `src/components/guild/alert-settings.tsx` (`emptyAlert()` solo se `current?.exists` è falso), `src/components/guild/settings-form.tsx` (`data-saving`, Reset disabilitato in salvataggio), `src/routes/dashboard/dashboard.css` (niente attenuazione e barra durante il salvataggio). `docs/` non tracciata.
- `useGuildSounds` e `useMySounds` fanno `Promise.all` di library + analytics e falliscono insieme; `guildLibraryModel`/`myLibraryModel` richiedono entrambe; `myLibraryModel` ordina per play del periodo; `head` di `[soundId]` risolve il loader combinato.
- `pick()` ricade sul primo suono anche con soundId esplicito inesistente; reward e Twitch fanno lo stesso con `?level=`/`?streamer=`.
- Selezioni ancora in query: `?level=`, `?streamer=`, `?guild=`.
- Reload intenzionali: card server (`servers.tsx`), `guild-switcher.tsx`, link e delete dell'editor (`reloadDocument`).
- Feedback: `aria-busy` + attenuazione dopo `--bb-duration-slow` e `nav-progress` legati a `location.isNavigating`; View Transition globale in `root.tsx`.
- API presenti in `2.0.0-rc.5` (da verificare nell'uso effettivo): `Pending` (`fallback$`, `delay`) e `Catch` in `@qwik.dev/core` (sperimentali), `blockSSR: false` (richiede `experimental: ["blockSSR"]` in `qwikVite`; un loader background non può redirigere né dare errore all'SSR iniziale, leggere `.value` sospende), `usePreventNavigate$`, `event.internalRequest`.
- Test: `node --test tests/*.test.mjs` (transpile TS con `typescript`), `npx tsc --noEmit`, `npm run build`. Nessuno script `test` in `package.json`.

## Ordine del lavoro

Le fasi sotto sono un ordine tecnico interno, non consegne separate da approvare. Implementare, controllare le modifiche e proseguire sulle parti dipendenti. Gli agenti già predisposti, se usati nell'incarico ricevuto, servono allo stesso lavoro e non impongono nuovi deliverable o attività fuori scope. Nessun commit, push o deploy senza richiesta dell'utente.

## Preparazione minima

1. Controllare stato Git, regole e file interessati; preservare i diff preesistenti.
2. Verificare le API Qwik necessarie alla modifica nella versione installata, durante l'implementazione. Non creare una fase separata di prototipi o benchmark.
3. Iniziare le modifiche applicative sotto.

## F1 — Libreria: separare library e analytics

File: `src/routes/dashboard/[guildId]/sounds/layout.tsx`, `src/routes/dashboard/me/sounds/(library)/layout.tsx`, pagine `[soundId]`, `src/lib/sound-library.ts`, `src/components/sounds/*`, `vite.config.ts` (solo flag sperimentale necessario), `tests/sounds.test.mjs`.

1. Separare library e analytics. Su URL diretta/refresh, library bloccante per l'SSR principale e analytics non bloccanti. Su navigazione interna, mostrare la destinazione con titolo/struttura e skeleton di elenco e dettaglio base prima che la library sia pronta; header e parti condivise restano visibili. `blockSSR` regola l'SSR, non autorizza a trattenere la navigazione interna. Richieste in parallelo, comparsa ed errori indipendenti; cache e dipendenze `period` coerenti.
2. Modello base dalla sola library (entries, filtri, owner/guild, selected, summary della library); vista analytics calcolata a parte (vista del suono, overview, play del periodo per riga). Nessuna doppia rappresentazione delle entità.
3. Ordine default nome crescente + ID su server e client; `sort=plays` solo su richiesta, con indicatore locale se analytics pendenti ed errore locale se fallite. Label coerente.
4. Confini di caricamento distinti per library/dettaglio base e analytics: durante navigazione interna anche la library ancora pendente deve avere il proprio skeleton senza trattenere tutta la route. Lettura delle analytics solo dentro la loro regione `Pending` ed errore locale; il parent che rende la struttura non legge dati ancora mancanti fuori dai relativi confini. I dati già disponibili si mostrano senza skeleton fittizi.
5. `head` e titoli solo da library/guild.
6. SoundId esplicito non presente: 404 in accesso diretto, errore locale con ritorno alla libreria in SPA. Il primo elemento vale solo sulla URL base. Filtro che esclude la selezione: comportamento esplicito della spec.
7. Contatori di periodo: skeleton o "non disponibile", mai zero come loading né lifetime sotto label di periodo.
8. Test puri aggiornati: ordine stabile, `sort=plays`, modello senza analytics, nessun fallback per ID esplicito.

## F2 — Percorsi delle entità e compatibilità

1. Route `settings/rewards/` + `settings/rewards/[level]/`, `settings/twitch/` + `settings/twitch/[streamerId]/`; `[section]` non le intercetta; `SettingsNav` attiva correttamente.
2. `me/sounds/(library)/guild/[guildId]/` e `.../guild/[guildId]/[soundId]/` sotto lo stesso layout della libreria personale (niente remount di lista/player); GuildPicker e link dettaglio conservano il segmento.
3. Livello/streamer/guild esplicito assente: 404 SSR o errore locale; mai il primo item sotto un altro ID. Gruppo personale assente: stato "non disponibile" con link ad All servers.
4. Normalizzazione di `?level=`, `?streamer=`, `?guild=` solo per richieste di pagina (non `internalRequest`), preservando gli altri parametri; il percorso prevale sulla query.
5. Aggiornare `libraryHref`/`soundHref` e test.

## F3 — Navigazione interna, errori e feedback

1. Gestione errori di route in SPA con `Catch` (o fallback: navigazione documento alla destinazione, senza loop). Solo dopo: convertire card server, GuildSwitcher e link dell'editor in `Link`.
2. Confine editor/libreria: invalidazione dei dati coinvolti dopo edit/delete, senza `reloadDocument`; delete torna alla libreria base.
3. Indicatore: feedback immediato sul controllo attivato (stato temporaneo separato da `aria-current`, rimosso su errore/annullamento); barra solo per transizioni di route; nessuna attenuazione globale come unica risposta; azioni locali non accendono la barra. Preservare le regole CSS preesistenti sul salvataggio.
4. View Transition non bloccante e rispettosa di reduced motion; focus al titolo del centro dopo cambio pagina riuscito, mai su cambio dettaglio/filtro/tab; scroll lista e sidebar conservati.
5. Prefetch: codice per destinazioni probabili, dati su intento; mai login/callback/logout/azioni; rispetto di data saver.
6. Logout: POST, pending sul pulsante, niente doppio invio, errore senza simulare l'uscita, stop audio.

## F4 — Settings: bozze, salvataggio, skeleton

1. `usePreventNavigate$` + `beforeunload` per form dirty (sezione, guild, level, streamer, uscita, back/forward, refresh); messaggio aggiuntivo durante salvataggio in corso; redirect di sessione mai bloccati. Annullare non cambia URL, valori, focus, scroll.
2. Snapshot confermato separato dalla bozza; rivalidazione non sovrascrive una bozza dirty; reset locale; chiavi limitate all'identità guild/sezione/item.
3. Risposte tardive applicate solo alla propria identità (`section`/`key` di `SettingsResult`).
4. Skeleton del form e dei badge se la nuova guild non ha dati; mai valori di default modificabili sotto il nome di un'altra guild.
5. Errori parziali e di rete locali, nessun retry automatico del POST.

## F5 — Audio, voti, greet, editor

1. Player unico nel layout libreria: continua tra dettagli/tab/filtri/periodo; si ferma uscendo dalla libreria e al cambio guild con lo stesso layout montato; stati "in riproduzione" e "selezionato" distinti; promise `play()` vecchie ignorate; buffering ed errore solo sulla riga/player.
2. Voti e greet: pending locale, risposta applicata al proprio soundId/key, nessun retry automatico, aggiornamento mirato senza rimontare header né ricaricare analytics.
3. Editor: singolo `sound(soundId)`, skeleton con titolo generico, dirty guard, suggerimenti tag con debounce esistente e controllo query, delete con dialog e pending, stop audio uscendo.

## F6 — Skeleton, accessibilità, responsive

1. Skeleton strutturali solo per contenuto mancante (card server, righe, dettaglio base, form, grafici), `aria-hidden` sulle decorazioni, `aria-busy` sulla regione; mini loader per operazioni locali.
2. Token CSS per ogni nuovo valore visivo; reduced motion; mobile: dettaglio raggiungibile e ritorno alla lista.
3. Nessuno skeleton su header/sidebar disponibili, ricerca locale, filtri in memoria, Load more.

## F7 — Verifica finale e documentazione

1. Controllare la copertura della matrice della spec usando verifiche pertinenti e strumenti esistenti; verifiche runtime solo locali, con dati fittizi dove necessari, senza costruire un nuovo servizio di test completo.
2. Verificare separatamente accesso diretto (contenuto principale SSR, analytics dopo) e click interno con library lenta (destinazione e skeleton visibili prima dei dati). Se una verifica runtime non è possibile entro questi vincoli, dichiararla senza presentarla come superata.
3. Controllare il riuso delle richieste per selezione/tab/filtro/periodo con gli strumenti disponibili; per osservazioni sulla cache usare la build di produzione. Nessuna campagna di benchmark obbligatoria.
4. `npx tsc --noEmit`, `node --test tests/*.test.mjs`, `npm run build`.
5. README e `AGENTS.md` aggiornati solo dove il comportamento è cambiato; rimuovere i limiti risolti solo dopo verifica.
6. Report finale: modifiche, verifiche eseguite, comportamento per accesso diretto/navigazione, limiti residui e cosa non è stato verificato (Vercel Edge reale, prestazioni reali).

## Rischi noti

- `Pending`, `Catch` e `blockSSR: false` sono sperimentali: se in rc.5 non si comportano come documentato, documentare il limite e usare il fallback previsto dalla spec, senza euristiche.
- La library dipende da `period` e calcola summary: separare i loader non anticipa i suoi suoni se è lenta.
- Qwik Router riesegue i loader dei layout a ogni cambio di pathname e i loader figli rieseguono le guardie (`/me` in più): verificare il conteggio prima di aggiungere loader.
- Cache in dev diversa dalla produzione: i conteggi valgono solo su build.
- Streaming su Vercel Edge non verificabile localmente.
