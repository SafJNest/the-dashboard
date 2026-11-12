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

Nei loader l'errore genera la pagina `src/routes/error.tsx` durante il rendering SSR; nel salvataggio compare nel form. Una navigazione SPA il cui loader fallisce non mostra la pagina di errore (limite di Qwik Router 2: il client non ha un error boundary) e la pagina resta sui dati precedenti; ricaricando si ottiene la pagina di errore SSR.

## Gestione di un server

`/dashboard/{guildId}/settings/` mostra le sezioni disponibili; ogni sezione ha la propria route, per esempio `/dashboard/{guildId}/settings/welcome/`. Rewards e Twitch usano anche `?level=` e `?streamer=`. `/dashboard/{guildId}/` reindirizza alle impostazioni solo per le richieste di pagina: le richieste interne dei loader del layout passano senza redirect. Il server viene caricato con `GET /guilds/{id}` nel loader del layout `[guildId]`; header, selettore e sidebar restano nei layout.

Qwik Router 2 rifà i loader dei layout a ogni cambio di pathname e affida la freschezza dei dati alla cache HTTP del browser. `useAccount` e `useGuild` usano quindi `cacheControl: { private: true, maxAge: 300 }`, `search: []` e `serializationStrategy: 'always'`:

- il client riprende i dati SSR della prima pagina senza richiederli;
- alla prima navigazione verso un'altra sezione il browser scarica una volta il JSON dei loader; per i successivi 5 minuti le navigazioni lo leggono dalla cache e Beebot non viene contattato;
- dopo un salvataggio `invalidate: [useGuild]` forza una richiesta che ignora la cache e la aggiorna.

Una pagina di server richiede `/me` e `/guilds/{id}`, eseguiti in parallelo durante l'SSR; il backend condivide il caricamento della lista Discord e la conserva in cache per 60 secondi. Nelle richieste JSON dei loader Qwik Router esegue prima, come guardia, i loader bloccanti dei layout superiori: la richiesta di `useGuild` (`/dashboard/{id}/q-loader-…`) rieseguisce quindi anche `useAccount`, con una chiamata `/me` in più, alla prima navigazione verso un server e dopo ogni salvataggio. Le navigazioni successive entro 5 minuti sono servite dalla cache del browser.

Le risposte dei loader hanno `Vary: Cookie`, così una sessione diversa non riusa i dati in cache di un'altra. Pagine HTML, azioni, errori e redirect al login restano `no-store`.

Il salvataggio usa `routeAction$` con `POST /guilds/{id}/settings` e invia solo la sezione del form; per Experience invia solo i canali modificati. Gli errori con `status: "error"` nella risposta compaiono nel form e i valori inseriti restano disponibili.

Il cambio server, dal selettore o dalla lista, è una navigazione del documento: un server non disponibile restituisce la pagina di errore SSR (404), che la navigazione SPA non mostra quando un loader fallisce.

Limiti attuali: creare o eliminare reward, streamer Twitch e azioni automatiche non ha ancora un contratto API e resta affidato ai comandi Discord. Leaderboard, Soundboards e Playlists sono visibili ma disabilitati. Gli streamer Twitch sono indicati per ID perché la risposta non contiene il nome.

## Accesso alle API Beebot

Le richieste partono solo dal server Qwik tramite la classe `BeebotClient` (`src/lib/beebot/client.server.ts`), che usa `sessionFetch` per API key, token di sessione ed errori e restituisce dati già validati. I percorsi sono in `src/lib/beebot/endpoints.ts`; tipi e parser dei suoni in `src/lib/sounds.ts`. Route e componenti non compongono URL né leggono JSON grezzo: chiamano i metodi del client nei loader e nelle azioni.

## Suoni

- `/dashboard/{guildId}/sounds/` e `/dashboard/{guildId}/sounds/{soundId}/`: suoni caricati nel server, tuoi e degli altri. Filtro `?owner=mine|others`.
- `/dashboard/me/sounds/` e `/dashboard/me/sounds/{soundId}/`: i tuoi suoni di tutti i server. Filtro `?guild={guildId}`. `/dashboard/me/` reindirizza qui.
- `/dashboard/me/sounds/{soundId}/edit/`: modifica (nome, visibilità, tag) e cancellazione, solo se il suono ha `canEdit` o `canDelete`. Sta fuori dal gruppo `(library)`, quindi non carica la libreria.
- Parametri comuni: `?period=7d|30d|90d|all` (predefinito `30d`), `?tab=mine` per le proprie riproduzioni.

Il suono aperto è nel path, come le sezioni dei settings. Lista e pannello sono resi dal layout (`sounds/layout.tsx`, `me/sounds/(library)/layout.tsx`), così cambiando suono restano montati (ricerca e scroll della lista compresi) e le pagine `[soundId]` aggiungono solo validazione e titolo. Il loader del layout ha `search: ['period']` e `cacheControl: { private: true, maxAge: 300 }`: con `strictLoaders` (predefinito) l'URL del loader non dipende dal suono, quindi nella build di produzione le selezioni successive sono servite dalla cache del browser e Beebot non viene contattato. Con il server di sviluppo Vite l'header `X-Qwik-route-path` rende la cache diversa per ogni pagina e i loader vengono richiesti di nuovo. Dall'editor, i link verso la libreria e la cancellazione ricaricano il documento, per non mostrare dati in cache superati.

Durante una navigazione SPA il layout `dashboard` imposta `aria-busy`, l'header mostra una barra di avanzamento e il contenuto si attenua dopo un breve ritardo; il cambio di pagina usa la View Transition API (`useQwikRouter({ viewTransition: true })`). Con `prefers-reduced-motion` le animazioni sono disattivate.

Ogni pagina usa un loader con `search: ['period']`: lista e analytics (`/guilds/{id}/sounds` + `/guilds/{id}/sounds/analytics`, oppure `/sounds/me` + `/sounds/me/analytics`) partono in parallelo e si ricaricano solo al cambio di periodo; selezione, filtri e tab cambiano l'URL senza nuove richieste. Like e dislike (`useVoteSound`) e greet (`useSaveGreet`, `POST /me/settings` con una voce alla volta) sono azioni del layout `dashboard`; il greet invalida `useAccount`, che ora contiene anche `greets` da `/me`. I suggerimenti dei tag usano `GET /tags?q=` mentre si scrive.

Limiti e scelte sul contratto:

- La pagina del server sta sotto il layout `[guildId]`, che carica `/guilds/{id}`: serve quindi l'accesso alla gestione del server, anche se l'endpoint dei suoni richiede solo l'appartenenza.
- Con "All servers" i grafici giornalieri, la heatmap e le modalità sommano i gruppi per server quando `totals` non li contiene; la distribuzione delle ripetizioni non è sommabile e compare solo se presente in `totals` o nel singolo server.
- La cronologia personale mostra gli eventi ricevuti (massimo 100 per suono); la paginazione con `nextCursor` non è ancora usata. Con un server selezionato i propri play sono contati sugli eventi ricevuti.
- La classifica `users` delle analytics non viene mostrata.
- Upload, waveform e soundboard non sono implementati. Il limite di 5 tag segue il comando `/sound upload`.
- Gli errori 400 di modifica mostrano il messaggio generico di `sessionFetch`, non il `message` del backend.

