# Beebot Dashboard

Dashboard web per il bot Discord Beebot.

## Stack e requisiti

- Qwik 2 e Qwik Router 2, TypeScript, Vite 8 e CSS nativo
- Node.js 26 LTS e npm
- Deployment previsto su Vercel con adapter Edge

## Avvio

```sh
npm install
cp .env.example .env
npm run dev
npm run build
```

Configurare `.env` a partire da `.env.example`. Solo le variabili con prefisso `PUBLIC_` sono pubbliche; le credenziali backend, OAuth e di sessione devono essere lette esclusivamente lato server tramite le API di Qwik Router e le variabili d'ambiente Vercel.

La home viene generata staticamente durante la build. `DISCORD_CLIENT_ID` deve essere disponibile in fase di build su Vercel; se cambia, è necessario un nuovo deployment per aggiornare il link di invito.

Le route della dashboard condividono `src/routes/dashboard/layout.tsx`. I futuri elementi comuni vanno nel layout; i contenuti e i loader specifici vanno nelle singole route, collegate tramite `Link` per navigare senza ricaricare il documento.

## Struttura

- `src/routes/`: pagine
- `src/root.tsx` e `src/entry.*.tsx`: documento e punti di ingresso
- `adapters/vercel-edge/`: configurazione della build Vercel
- `AGENTS.md`: linee guida condivise; `CLAUDE.md` le richiama per Claude
- `.codex/config.toml` e `.mcp.json`: server MCP per Codex e Claude Code

Qwik MCP usa il server di sviluppo per gli strumenti di ispezione. CodeGraph indicizza la repository in modalità strutturale, senza embeddings. Le configurazioni MCP usano percorsi assoluti: aggiornarli se la repository viene spostata. Riavviare la sessione dell'agente dopo la configurazione.

## Login e server Discord

Il login viene gestito da Beebot. Il server Qwik avvia l'autorizzazione Discord tramite Beebot, riceve il callback GET di Discord, verifica state e inoltra codice, state e callback a Beebot tramite JSON server-to-server. Beebot completa lo scambio OAuth e restituisce la sessione, conservata da Qwik in un cookie HttpOnly. Le richieste alle API Beebot partono solo dal server Qwik, con la API key e il token della sessione; le credenziali non sono disponibili al JavaScript della pagina.

Configurare `BEEBOT_API_URL` (incluso `/beebot`), `BEEBOT_API_KEY` e `BEEBOT_AUTH_CALLBACK_URI` nell'ambiente server. Il callback Qwik deve terminare in `/auth/callback/` e coincidere con uno degli indirizzi consentiti su Beebot. Il callback è una navigazione GET da Discord: il cookie di transazione usa SameSite=Lax. Registrare il callback Qwik anche nell'app Discord e nella configurazione dell'applicazione su Beebot. Le query del callback contengono il codice OAuth temporaneo e devono essere oscurate nei log del server/proxy. Discord e il backend richiedono ulteriori impostazioni proprie.

La dashboard carica profilo e server con una sola chiamata `GET /me` (`{ user, servers }`) nel loader del layout `dashboard`; header, selettore e lista server usano `servers` senza chiamare `/servers` o `/guilds`. Questi due endpoint, se usati, restituiscono direttamente un array di server (`parseServers`). La lista comprende i server di cui l'utente è owner, Administrator o ha Manage Server: `owner` indica solo la proprietà e non viene usato come filtro. Con OAuth la lista può includere server senza il bot, il cui dettaglio risponde 404. Il logout revoca la sessione sul backend (204 senza body) ed elimina il cookie.

Contratto backend richiesto: quello documentato nel repository Beebot in `docs/api/beebot-auth.md` e `docs/api/beebot-guilds.md` (`/me` con `user` e `servers`, liste come array). Il frontend non è compatibile con la risposta precedente di `/me` (solo utente): rilasciare il backend con questo contratto prima o insieme al frontend.

### Errori del backend

Gli errori hanno la forma `{ code, message, retryAfter? }` e sono gestiti in `sessionFetch` (`src/lib/beebot.server.ts`):

- `401 invalid_session`, `discord_token_expired` o altro 401: il cookie di sessione viene eliminato e si torna al login.
- `401 invalid_api_key`: errore 500 di configurazione; la sessione resta e non si avvia il login, evitando cicli.
- `503 discord_rate_limited`: il messaggio indica l'attesa ricavata da `retryAfter` o dall'header `Retry-After`, inoltrato anche nella risposta; nessun retry automatico e sessione invariata.
- `503 discord_unavailable`, `auth_unavailable`, `settings_unavailable` e errori di rete: pagina di errore con "Try again", senza logout.
- `403 guild_forbidden`: accesso negato; `404`: server non disponibile o bot assente.

Nei loader di account, server ed editor l'errore genera la pagina `src/routes/error.tsx` durante il rendering SSR; nel salvataggio compare nel form. Se uno di questi loader fallisce durante una navigazione SPA, il layout esegue una navigazione documento verso la stessa URL (`DocumentRecovery`) per mostrare l'errore SSR; il documento riprende i dati dal server, quindi non si crea un ciclo. I loader della libreria suoni restituiscono invece un risultato `fail()` con `status`, `message` e `retryAfter`: l'errore resta nella propria regione con "Try again" (che rifà solo quel loader) e, nell'accesso diretto, la libreria fallita imposta lo stato HTTP della pagina.

## Gestione di un server

`/dashboard/{guildId}/settings/` mostra le sezioni disponibili; ogni sezione ha la propria route, per esempio `/dashboard/{guildId}/settings/welcome/`. Reward e streamer selezionati sono nel path: `/settings/rewards/{level}/` e `/settings/twitch/{streamerId}/` (senza segmento si apre il primo). Un livello o streamer inesistente risponde 404 nell'accesso diretto e mostra un errore locale nella navigazione interna; i vecchi link `?level=` e `?streamer=` vengono reindirizzati (301) al path, conservando gli altri parametri, e se path e query sono entrambi presenti prevale il path. `/dashboard/{guildId}/` reindirizza alle impostazioni solo per le richieste di pagina: le richieste interne dei loader del layout passano senza redirect. Il server viene caricato con `GET /guilds/{id}` nel loader del layout `[guildId]`; header, selettore e sidebar restano nei layout.

Qwik Router 2 rifà i loader dei layout a ogni cambio di pathname e affida la freschezza dei dati alla cache HTTP del browser. `useAccount` e `useGuild` usano quindi `cacheControl: { private: true, maxAge: 300 }`, `search: []` e `serializationStrategy: 'always'`:

- il client riprende i dati SSR della prima pagina senza richiederli;
- alla prima navigazione verso un'altra sezione il browser scarica una volta il JSON dei loader; per i successivi 5 minuti le navigazioni lo leggono dalla cache e Beebot non viene contattato;
- dopo un salvataggio `invalidate: [useGuild]` forza una richiesta che ignora la cache e la aggiorna.

Una pagina di server richiede `/me` e `/guilds/{id}`, eseguiti in parallelo durante l'SSR; il backend condivide il caricamento della lista Discord e la conserva in cache per 60 secondi. Nelle richieste JSON dei loader Qwik Router esegue prima, come guardia, i loader bloccanti dei layout superiori: la richiesta di `useGuild` (`/dashboard/{id}/q-loader-…`) rieseguisce quindi anche `useAccount`, con una chiamata `/me` in più, alla prima navigazione verso un server e dopo ogni salvataggio. Le navigazioni successive entro 5 minuti sono servite dalla cache del browser.

Le risposte dei loader hanno `Vary: Cookie`, così una sessione diversa non riusa i dati in cache di un'altra. Pagine HTML, azioni, errori e redirect al login restano `no-store`.

Il salvataggio usa `routeAction$` con `POST /guilds/{id}/settings` e invia solo la sezione del form; per Experience invia solo i canali modificati. Gli errori con `status: "error"` nella risposta compaiono nel form e i valori inseriti restano disponibili.

Il cambio server, dal selettore o dalla lista, è una navigazione interna. Mentre il nuovo server viene caricato la barra mostra già il server scelto e il contenuto è sostituito da uno skeleton: i dati del server precedente non restano visibili né modificabili, e i form hanno una chiave che include l'ID del server. Alla prima apertura di un server dalla lista resta visibile la pagina corrente, con la card in stato di caricamento e la barra di avanzamento, finché i dati del server non arrivano: in rc.5 i componenti figli leggono `useGuild` e sospenderebbero il rendering.

Prima di lasciare un form con modifiche non salvate (cambio sezione, server, livello, streamer, uscita dai Settings, indietro/avanti) compare una conferma; con il salvataggio in corso il messaggio avvisa che le modifiche potrebbero essere applicate dopo l'uscita. Ricaricare o chiudere la scheda usa la conferma del browser. Il controllo è in `SaveDock` (`usePreventNavigate$`) ed è condiviso con l'editor dei suoni; i redirect verso `/auth/` non vengono bloccati. Il risultato di un salvataggio contiene server, sezione e chiave, e viene applicato solo al form corrispondente.

Limiti attuali: creare o eliminare reward, streamer Twitch e azioni automatiche non ha ancora un contratto API e resta affidato ai comandi Discord. Leaderboard, Soundboards e Playlists sono visibili ma disabilitati. Gli streamer Twitch sono indicati per ID perché la risposta non contiene il nome.

## Accesso alle API Beebot

Le richieste partono solo dal server Qwik tramite la classe `BeebotClient` (`src/lib/beebot/client.server.ts`), che usa `sessionFetch` per API key, token di sessione ed errori e restituisce dati già validati. I percorsi sono in `src/lib/beebot/endpoints.ts`; tipi e parser dei suoni in `src/lib/sounds.ts`. Route e componenti non compongono URL né leggono JSON grezzo: chiamano i metodi del client nei loader e nelle azioni.

## Suoni

- `/dashboard/{guildId}/sounds/` e `/dashboard/{guildId}/sounds/{soundId}/`: suoni caricati nel server, tuoi e degli altri.
- `/dashboard/me/sounds/` e `/dashboard/me/sounds/{soundId}/`: i tuoi suoni di tutti i server. Filtro per server nel path: `/dashboard/me/sounds/guild/{guildId}/` e `/dashboard/me/sounds/guild/{guildId}/{soundId}/`, con gli stessi dati della libreria personale e senza chiamare `/guilds/{id}`. `/dashboard/me/` reindirizza qui.
- `/dashboard/me/sounds/{soundId}/edit/`: modifica (nome, visibilità, tag) e cancellazione, solo se il suono ha `canEdit` o `canDelete`. Sta fuori dal gruppo `(library)`, quindi non carica la libreria.
- Nell'URL delle librerie ci sono solo identificativi (server, suono, filtro server personale): nessun parametro di query. I vecchi link con `?period=`, `?tab=`, `?owner=`, `?sort=` o `?guild=` vengono reindirizzati (301) al solo path; `?guild=` diventa il segmento `guild/{guildId}/`.
- Filtro All/Mine/Others, ordinamento Name/Plays e pannello Everyone/Your plays sono stato locale della vista: restano mentre ci si muove nella stessa libreria e tornano ai valori predefiniti (All, Name, Everyone) a una nuova apertura.
- Il periodo (`7d|30d|90d|all`, predefinito `30d`) è un dato richiesto ai loader, quindi viaggia nel cookie di sessione `beebot_period` (path `/dashboard/`, senza scadenza): resta per la sessione del browser, anche dopo un refresh. Scegliere un periodo aggiorna il cookie e invalida solo i loader della library e delle analytics. Le risposte dei loader hanno `Vary: Cookie` e la cache HTTP del browser conserva una sola variante per URL: tornare a un periodo già visto rifà la richiesta. L'ordine per nome e poi per ID è uguale su server e client. Il contatore delle righe e l'ordinamento "Plays" usano il totale di riproduzioni del suono (`plays` della risposta della library), quindi sono disponibili insieme all'elenco, non cambiano con il periodo e non aspettano le analytics.
- Un `soundId` che non è nella libreria risponde 404 nell'accesso diretto e mostra un errore locale nella navigazione interna; il primo suono viene aperto solo sulla URL base.

Il suono aperto è nel path, come le sezioni dei settings. Lista e pannello sono resi dal layout (`sounds/layout.tsx`, `me/sounds/(library)/layout.tsx`), così cambiando suono, filtro, pannello o periodo restano montati (ricerca, scroll della lista e audio compresi) e le pagine `[soundId]` aggiungono solo il titolo.

Library e analytics sono due loader separati (`src/lib/sound-loaders.ts`), entrambi con `search: []`, il periodo letto dal cookie, `cacheControl: { private: true, maxAge: 300 }` e `blockSSR: false`, che richiede `experimental: ['blockSSR']` in `vite.config.ts`. Il modello della libreria (`src/lib/sound-library.ts`) dipende solo dalla library; le analytics sono lette solo dai componenti che le mostrano (pannello del suono e overview), ognuno dentro un confine `Pending` (`experimental: ['pendingBoundary']`) con il proprio skeleton e il proprio errore. Nella navigazione interna la destinazione compare subito con gli skeleton; elenco e analytics arrivano in modo indipendente. Durante il cambio di periodo i valori del periodo precedente non vengono mostrati: riepiloghi e grafici tornano skeleton fino alla risposta del nuovo periodo.

Per l'accesso diretto, `onGet` del layout della libreria (solo per richieste di documento con `Accept: text/html`; le richieste `q-route.json` che Qwik Router invia a ogni navigazione verso una route dinamica eseguono anch'esse gli handler) avvia insieme account, server, library e analytics e attende la library: così può rispondere 404 per un suono o un server assente, impostare lo stato degli errori della library e reindirizzare al login. Usa `resolveValue`, presente nell'evento di richiesta di rc.5 ma tipizzato solo per i loader (`loaderResolver`).

Limiti di rc.5 verificati:

- Nel rendering SSR `useQwikRouter` attende tutti i loader, anche quelli con `blockSSR: false`, prima di risolvere l'head: l'HTML dell'accesso diretto parte quindi dopo l'ultima risposta (analytics comprese) e lo streaming out-of-order non anticipa la library. `blockSSR: false` serve a non trasformare la library in guardia delle richieste JSON delle analytics e a far partire le due richieste in parallelo.
- Ogni richiesta JSON di un loader riesegue come guardie i loader bloccanti (`useAccount`, `useGuild`). Separare library e analytics aggiunge quindi una chiamata `/me` e una `/guilds/{id}` alla prima navigazione verso una libreria e a ogni cambio di periodo; selezione, filtri, ordinamento, pannello, ricerca e "Load more" non fanno richieste.
- Un componente che legge un loader mai caricato sospende il rendering della route; per questo il layout del server legge `useGuild` con `peekValue` e mostra uno skeleton, e l'editor ha un proprio `Pending`.
- In sviluppo con Vite l'header `X-Qwik-route-path` rende la cache diversa per ogni pagina e i loader vengono richiesti di nuovo: i conteggi valgono per la build di produzione.

Navigazione: il clic su un `Link` interno mette il link in `aria-busy` e accende la barra dell'header finché la nuova URL non è mostrata; azioni (salvataggio, voto, greet, tag) e caricamenti locali non accendono la barra. Dopo un cambio di pagina il focus va sul titolo `h1` della pagina; cambiando suono, filtro, tab, livello o streamer resta sul controllo usato. La View Transition API non è più usata, per non trattenere il primo aggiornamento.

Audio: un solo elemento `audio` per libreria, con `preload="none"`. Continua cambiando suono, pannello, filtro o periodo; si ferma uscendo dalla libreria o cambiando server. Il suono in riproduzione e quello selezionato sono stati distinti, e una richiesta di `play()` superata non modifica lo stato del brano successivo.

Like e dislike (`useVoteSound`) e greet (`useSaveGreet`, `POST /me/settings` con una voce alla volta) sono azioni del layout `dashboard`. Il voto invalida solo i loader della library, così i contatori aggiornati restano corretti tornando alla libreria; il greet invalida `useAccount`, che contiene anche `greets` da `/me`. Gli errori di voto e greet restano sul suono e sulla voce che li ha prodotti. I suggerimenti dei tag usano `GET /tags?q=` mentre si scrive, con stato di caricamento e di errore vicino al campo.

Editor: i link verso la libreria sono navigazioni interne finché non si salva; dopo un salvataggio diventano navigazioni del documento, perché la library in cache non conterrebbe le modifiche. La cancellazione conferma nel dialog, mostra lì gli errori e, se riesce, apre la libreria con una navigazione del documento.

Limiti e scelte sul contratto:

- La pagina del server sta sotto il layout `[guildId]`, che carica `/guilds/{id}`: serve quindi l'accesso alla gestione del server, anche se l'endpoint dei suoni richiede solo l'appartenenza.
- Con "All servers" i grafici giornalieri, la heatmap e le modalità sommano i gruppi per server quando `totals` non li contiene; la distribuzione delle ripetizioni non è sommabile e compare solo se presente in `totals` o nel singolo server.
- La cronologia personale mostra gli eventi ricevuti (massimo 100 per suono); la paginazione con `nextCursor` non è ancora usata. Con un server selezionato i propri play sono contati sugli eventi ricevuti.
- La classifica `users` delle analytics non viene mostrata.
- Upload, waveform e soundboard non sono implementati. Il limite di 5 tag segue il comando `/sound upload`.
- Gli errori 400 di modifica mostrano il messaggio generico di `sessionFetch`, non il `message` del backend.

