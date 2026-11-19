# Specifica — sito pubblico Sounds: navigazione, dati progressivi e chiamate

Data: 19 novembre 2026. Progetto: Beebot Dashboard, Qwik 2 / Qwik Router 2 `2.0.0-rc.5`.

Applica al sito pubblico Sounds (`/sounds/**`; `sounds.safjnest.com` fa solo un redirect 308 lì) la stessa logica di `docs/claude-navigation-loading.md`, già realizzata nella dashboard. Il comportamento di prodotto delle pagine è in `docs/sounds-funzionamento.md`; le regole generali in `AGENTS.md`. Questo documento descrive il comportamento da ottenere, non funzionalità già presenti o prestazioni misurate.

## Obiettivo e modalità di lavoro

- Al click rispondere subito, mantenere le parti condivise, aggiornare solo l'area interessata. I dati secondari non trattengono il contenuto principale.
- Una chiamata Beebot per dato e ambito: niente riletture di dati che il client ha già, niente guardie che rieseguono loader inutili, niente prefetch con effetti collaterali.
- Nessuna nuova API, servizio o funzionalità (soundboard, waveform dal backend, ricerca nell'URL restano fuori); unica dipendenza aggiunta su richiesta dell'utente: `wavesurfer.js`. Nessuna modifica all'autenticazione.
- Verifiche solo locali, con dati fittizi e configurazione fittizia; mai Beebot, Discord o il sito privato reali.

## Decisioni confermate dall'utente

- Cache privata del browser di 60 secondi, con `Vary: Cookie`, per viewer (`/me`), Explore, profilo creatore e prima pagina dei suoi suoni. Il suono aperto e i commenti non hanno cache.
- Nessun prefetch dei dati sui link a liste di suoni (righe, tile, suggerimenti, tag, autori dei commenti). Il prefetch del codice resta.
- Un unico gestore dei suoni e onda con WaveSurfer.js (19/11/2026, sostituisce "picchi solo dopo il Play" e l'onda finta): loader, file scaricato all'apertura, onda reale; clic e trascinamento spostano la riproduzione. Vale per pannello pubblico e dettaglio della dashboard.
- Testo cercato, filtri e ordinamento restano stato della vista (`AGENTS.md`), non entrano nell'URL.

## Regole valide per ogni navigazione

- Accesso documento (URL incollata, refresh, nuova scheda): HTML SSR con il contenuto principale; i 404 si decidono in `onGet` solo per le richieste documento (`isDocumentRequest`), come nelle librerie della dashboard.
- Navigazione interna: layout montati, destinazione subito, skeleton solo nelle regioni senza dati corretti. Un dato già nel client si mostra senza skeleton.
- Loader dei layout non bloccanti (`blockSSR: false`) se non devono fare da guardia: un loader bloccante viene rieseguito sul server in ogni richiesta JSON dei loader figli. Un loader bloccante deve essere senza rete (configurazione) o indispensabile come guardia.
- I loader di un layout si scrivono nel file della route, non in `src/lib`: il plugin del router assegna il path della route solo ai `routeLoader$` definiti lì; gli altri usano il path della pagina, quindi l'URL cambia a ogni suono e la cache del browser non serve. Qwik Router 2 rifà i loader dei layout a ogni cambio di pathname e affida la freschezza alla cache HTTP.
- `strictLoaders` (predefinito) applica già `search: []`; `serializationStrategy: 'always'` evita che il client rilegga un loader quando un componente si aggiorna dopo la ripresa.
- HTML `Cache-Control: private, no-store`; risposte JSON dei loader con `Vary: Cookie`, così una sessione diversa (login, logout) non riusa dati di un'altra.
- Il componente strutturale non resta in attesa di dati pendenti: li legge con `peekValue` (`src/lib/loader-value.ts`, come il layout della guild nella dashboard) e mostra skeleton ed errore propri nella regione (`fail()`, non eccezioni). Un loader in rivalidazione restituisce il valore precedente, quindi ogni regione controlla anche l'identità (suono, creatore) del dato.
- Errore di una regione: messaggio e "Try again" che rifà solo quel dato (`invalidate()` del loader o nuova chiamata). Vuoto confermato ≠ errore ≠ caricamento; zero non significa caricamento.
- Mai dati di un suono o di un creatore sotto l'identità di un altro. Un ID esplicito inesistente dà 404 nell'accesso diretto ed errore locale nella navigazione interna, mai un altro record.
- Richieste superate: annullate con `AbortSignal` (primo argomento di `server$`) e scartate con il ticket.
- Prefetch solo di sola lettura e senza effetti: dati spenti sui link a liste di suoni, intent sui link di navigazione singoli.

## Confini dei layout

- `src/routes/sounds/layout.tsx`: documento del sito, `SiteHeader`, footer, `SearchContext`. Configurazione del sito (base, origin, href, invito) da un loader senza rete; viewer da un loader separato, non bloccante e in cache. Header stabile in tutta la navigazione.
- `src/routes/sounds/(search)/layout.tsx`: ricerca, risultati, Explore e pannello. Hero e casella di ricerca non dipendono da Explore; Trending, Just added e tag popolari sono componenti con skeleton ed errore propri.
- `src/routes/sounds/u/[userId]/layout.tsx`: profilo creatore e pannello. Hero dal loader del creatore con il proprio skeleton, lista come componente che possiede il proprio store.
- Pannello del suono (`sound-route.tsx`, `sound-panel.tsx`): base dalla card già nota, dati dinamici dal loader.

## Inventario delle URL

| URL | Principale (SSR) | Differibile |
|---|---|---|
| `/sounds/` | Header, hero, ricerca, Trending, Just added, tag | — |
| `/sounds/{soundId}/` | Explore + pannello del suono (identità, player, voti, numeri) | Commenti |
| `/sounds/u/{userId}/` | Header, hero e statistiche del creatore, lista | — |
| `/sounds/u/{userId}/{soundId}/` | Profilo + pannello del suono | Commenti |


## Viewer e header

- Senza cookie di sessione: ospite, nessuna chiamata `/me`.
- Con cookie: `signedIn` è vero anche se `/me` fallisce o è ancora in arrivo. In quel caso l'header resta neutro (link alla dashboard, senza nome e avatar) e le azioni sono consentite: decide il backend, che risponde 401 se la sessione non vale. Un errore di `/me` non trasforma un utente in ospite.
- Il greet globale del viewer è dato condiviso: si salva con l'azione `useGlobalGreet` del layout, con `invalidate: [useViewer]` (una sola `/me` che ignora la cache del browser), senza rimontare l'header. Un `invalidate()` semplice del loader leggerebbe la copia in cache.

## Explore e ricerca

- Explore: dati principali di `/sounds/`, in cache 60 s. Nella navigazione interna hero e ricerca compaiono subito; Trending, Just added e tag hanno skeleton propri ed errore con retry.
- Limite di rc.5: i loader di un layout di gruppo come `(search)` prendono il path della pagina figlia, quindi Explore si richiede una volta per ogni suono aperto (non bloccante, valori precedenti visibili). Spostarlo nel layout radice lo farebbe girare anche sui profili creatore.
- Nuova ricerca o filtro (identità diversa): righe svuotate e skeleton, mai i risultati della query precedente sotto la nuova, neanche se la nuova fallisce. Load more conserva le righe e mostra lo stato sul pulsante.
- Invio sulla stessa query: retry esplicito. Errore: messaggio e "Try again".
- Suggerimenti: da 2 caratteri, debounce esistente, `AbortSignal`. Invio, Escape, scelta di un suggerimento o di un tag annullano il timer e la richiesta in corso; una risposta annullata non aggiorna il menu e il timer non parte se la casella non è più nella pagina.

## Pannello del suono

- Clic su riga, tile o suggerimento: la card già nota (stesso tipo `SoundCard`) passa al pannello. Nome, immagine, uploader, data, tag, durata e player compaiono subito.
- Like, dislike, voto, numeri (plays, listeners, liked by) e commenti vengono solo dal loader del suono: dopo un voto, la card di una lista può avere conteggi vecchi. Lo stato del greet viene dal viewer (`globalGreetId`).
- Accesso diretto: tutto il pannello in SSR; 404 dall'`onGet` documento. Navigazione interna a un ID inesistente: errore locale con link di chiusura, mai un altro suono.
- Aprire un suono non scorre la pagina in cima e non sposta il focus; su una colonna, se il pannello è sopra il viewport, viene portato in vista. Chiudere il pannello non fa chiamate.
- Commenti: skeleton con geometria simile, errore con retry. Ordinamento, risposte e paginazione come oggi.
- Voto e greet: pending locale, nessun retry automatico, risposta applicata al proprio suono.
- Audio: dal player unico del layout (sezione "Player e onda"); il file scaricato per l'onda è lo stesso che si ascolta. Il Play di una riga avvia il suono e apre il pannello.

## Profilo creatore

- Accesso diretto: hero, statistiche e prima pagina della lista in SSR; 404 dall'`onGet` documento per utenti inesistenti.
- Navigazione interna verso il profilo: skeleton dell'hero e della lista finché i dati mancano. Aprire e chiudere un suono non rilegge creatore e lista.
- Ricerca e ordinamento interni: chiamate solo su invio o cambio ordinamento, con ticket e retry sugli errori.

## Player e onda

- Un solo gestore dei suoni, `SoundPlayer` (`src/components/sounds/sound-player.tsx`): un elemento `audio` e lo stato condiviso via context (suono corrente, in riproduzione, caricamento, fine, errore). Scarica ogni file una volta (cache per URL, come blob) e lo riproduce da lì; se il download fallisce riproduce dall'URL. Una richiesta superata non cambia lo stato del suono successivo.
- `SoundPlayer` sta nel layout del sito Sounds e in ogni libreria della dashboard (con `key` sull'ambito: cambiando server l'audio si ferma). L'audio continua cambiando suono, pannello, filtro o periodo e si ferma uscendo dall'area.
- `SoundWave` riceve solo il suono (`soundId`, `url`): mostra un loader e, appena montata (non quando diventa visibile: l'IntersectionObserver di rc.5 non scatta in modo affidabile per i componenti montati in navigazione interna), chiede il file al player, carica `wavesurfer.js` con un import dinamico e disegna l'onda. WaveSurfer ha un proprio `audio` esterno, quindi distruggerlo non tocca mai quello del player. Quando quel suono è il corrente si aggancia all'`audio` del player (`setMediaElement`): avanzamento e cursore seguono la riproduzione a ogni frame; sganciandosi ferma il proprio ciclo di disegno.
- Una sola richiesta per file, con `cache: 'reload'`: il file arriva sempre dalla rete con l'header CORS e sostituisce la copia in cache. Una copia salvata prima senza CORS (per esempio dal tag `<audio>`) farebbe fallire `fetch()` anche con CORS attivo sul CDN, e la rivalidazione (304) non porta necessariamente l'header. Nella stessa pagina il player riusa il file già scaricato.
- Pulsanti: pausa sempre possibile; un clic durante l'apertura la annulla; dopo un errore si riapre da capo. `recordPlay` del pannello pubblico non blocca il render e registra gli errori in console.
- Clic sull'onda: il player si sposta lì e riprende a suonare (anche partendo da un altro suono). Trascinamento: la posizione segue il mouse e l'audio con lei.
- Pulsanti Play di pannello, righe e dettaglio chiamano il player; lo stato (play/pausa, caricamento, errore) viene dal player.
- Colori dai token (`--wave-base`, `--wave-progress`); stili in `src/components/sounds/sound-wave.css`, caricati dal componente. Se il file non si scarica (per esempio CORS mancante sul server degli audio) l'onda mostra una linea, l'errore va in console e il suono si riproduce comunque.

## Prefetch

- `prefetchData="off"` su `SoundRow`, `SoundTile`, suggerimenti, tag del pannello e autori dei commenti.
- Link di navigazione singoli (breadcrumb Explore, uploader nel pannello, chiusura) con il comportamento predefinito.
- Mai prefetch di login, logout o azioni.

## Feedback di navigazione

- L'unico loader bloccante del sito è la configurazione, senza rete e con cache `immutable`: ogni navigazione mostra subito la destinazione con gli skeleton delle regioni mancanti, quindi non serve una barra di avanzamento.
- Le regioni in caricamento hanno `aria-busy`; azioni (voto, greet, commenti, ricerca, Load more) mostrano lo stato sul proprio controllo.

## Editor della dashboard

- L'immagine del suono non deve costare una seconda `GET` se la risposta di `GET /sounds/{id}` contiene già `imageUrl`: verificarlo nel contratto prima di cambiare. Se manca, la chiamata resta, non bloccante.

## Matrice delle transizioni

| Origine → destinazione | Persistente | Cambia / chiamate |
|---|---|---|
| Documento → qualsiasi URL | — | SSR principale; viewer, Explore o creatore in parallelo |
| Explore → suono | Header, ricerca, risultati, scroll | Base subito; sound + commenti (+ Explore, limite rc.5) |
| Suono A → B | Header, ricerca, risultati, scroll | Base B subito; sound B + commenti B |
| Suono → chiusura | Tutto | Nessuna chiamata |
| Explore → creatore | Header | Hero e lista con skeleton; creatore + lista (cache 60 s) |
| Creatore → suono | Header, profilo, lista | Base subito; sound + commenti |
| Creatore → Explore | Header | Hero e ricerca subito; Explore da cache o skeleton |
| Nuova ricerca / filtro | Header, barra | Skeleton righe; una ricerca |
| Load more | Righe esistenti | Una pagina in più |
| Digitazione | Tutto | Suggerimenti con soglia, debounce e abort |
| Hover su liste | Tutto | Nessuna chiamata dati |
| Play / clic sull'onda | Tutto | Player unico, dal file già scaricato |
| Voto / greet / commento | Tutto il resto | Una mutazione; greet invalida il viewer |
| Login o logout altrove | — | `Vary: Cookie`: nessun dato della sessione precedente |
| ID suono o creatore inesistente | Header | 404 documento o errore locale |

## Limiti noti di rc.5

- L'SSR attende tutti i loader, anche quelli non bloccanti, prima dell'head: l'accesso diretto non diventa più veloce; migliorano navigazione interna e numero di chiamate.
- `Pending`, `blockSSR: false` e la lettura con `peekValue` sono sperimentali.
- In sviluppo con Vite la cache dei loader non riflette la produzione: i conteggi valgono sulla build.

## Criteri di completamento

- Conteggio delle chiamate server-to-server per scenario, prima e dopo, con fixture locale sulla build di produzione.
- HTML SSR senza JavaScript con il contenuto principale e senza segreti.
- Ritardi distinti e invertiti tra viewer, Explore, creatore, suono e commenti: nessuna attesa artificiale; errori confinati alla propria regione.
- Hover sulle liste senza richieste di dati; apertura del pannello con un solo download audio, nessun altro al Play.
- `npx tsc --noEmit`, `node --test tests/*.test.mjs`, `npm run build`.
- README aggiornato solo per ciò che è cambiato e verificato; limiti residui dichiarati.
