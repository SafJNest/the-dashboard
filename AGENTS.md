# Beebot Dashboard — linee guida condivise

Queste istruzioni valgono per Codex, Claude e chiunque lavori nella repository. `AGENTS.md` è la fonte unica delle regole: aggiornarlo quando cambiano decisioni o convenzioni. `CLAUDE.md` lo richiama senza duplicarne il contenuto. Le richieste esplicite dell'utente hanno precedenza.

## Progetto e lavoro

- Dashboard del bot Discord Beebot. Lo stato attuale è descritto nel README e nel codice; non presumere che funzionalità future siano già implementate.
- Stack: Node.js 26 LTS, npm, Qwik 2, Qwik Router 2, TypeScript, Vite, CSS nativo e Vercel Edge. Consultare la [documentazione Qwik 2](https://next.qwik.dev/docs/) e le versioni effettivamente installate prima di introdurre API o dipendenze.
- Prima di intervenire, controllare lo stato Git e leggere i file interessati. Preservare modifiche preesistenti e non correlate. Non cambiare branch, remote o cronologia; non fare push senza richiesta.
- Fare modifiche mirate, semplici e leggibili. Niente refactor, astrazioni, dipendenze o funzionalità non necessari. Nomi chiari, codice completo e niente commenti che ripetono il codice.
- Non inventare contratti API, dati o comportamenti: verificare la fonte effettiva. Documentare decisioni e limiti reali vicino al codice o nella documentazione pertinente, mantenendoli aggiornati.
- Analisi e implementazione sono richieste distinte: se viene chiesto di ragionare o dare un'opinione, non modificare il codice. Nei piani nessuna attività accessoria non richiesta. Il lavoro autorizzato si completa senza fermarsi a ogni microfase, salvo operazioni distruttive o esterne.
- Interventi circoscritti al problema reale: niente modifiche globali per un caso locale, niente ritocchi collaterali a codice non correlato; rimuovere le modifiche temporanee prima di chiudere.
- Comunicazione in italiano, breve e diretta. Quando si mostra codice in chat, restituire il file completo e non solo il frammento modificato.

## Architettura e stile del codice

- Logica server e di dominio (`src/lib`) organizzata a oggetti, come in Java: una classe per responsabilità, owner e scope chiari, utility separate, cartelle come package. Componenti Qwik e CSS restano nelle forme idiomatiche di Qwik; sul frontend la struttura conta meno.
- Responsabilità singola: un client gestisce il trasporto, non conversioni o logiche estranee. Spezzare una classe quando accumula responsabilità diverse, senza creare una classe per ogni funzione. Scrivere meno codice possibile e riusarlo il più possibile.
- Backend a livelli con confini chiari: config, client/trasporto, sessione, servizi, repository, route e loader che orchestrano soltanto. Per modifiche backend non banali (autenticazione, sessione, flussi, persistenza) proporre prima classi, responsabilità e file, poi implementare.
- Le query crescono per gradi: poche vicino al client, molte in un repository generico, moltissime in repository per dominio.
- Endpoint API mai come URL sparsi: stanno in `src/lib/beebot/endpoints.ts`, modificabili in un solo punto. Un URL usato in un solo file può restare inline.
- Naming minimale e contestuale: il contesto Beebot è implicito (`Endpoints`, non `BotEndpoints`); qualificare solo ciò che esce dal contesto (per esempio un servizio esterno).
- Magic number come costanti statiche nominate nella classe owner (o costanti `UPPER_SNAKE_CASE` del modulo owner).
- TypeScript: niente `#private`; ordine dei membri: costanti statiche, getter/setter, factory statica, constructor, altri metodi; getter solo se il valore cambia. Sempre `async/await`, `for...of` invece di `forEach`, early return, arrow function; condizioni semplici inline (`cond && fn()`). Naming `camelCase`, `PascalCase`, `UPPER_SNAKE_CASE`, nomi espliciti.
- Funzioni: gli helper generici e riusabili restano funzioni; le funzioni di dominio sparse in un modulo diventano metodi della classe owner.
- Astrarre verso classi generiche ed estendibili solo con una ragione concreta. Prima corretto, poi ottimizzato; preferire API native a nuove dipendenze.
- Riuso prima di tutto: esiste già → usarlo; qualcosa di simile → valutare la fusione; non serve più → eliminarlo (dopo aver controllato i consumatori). Una sola fonte per la stessa logica e lo stesso modello dati: parser, tipi e rappresentazioni stanno nel loro owner, non duplicati per vista.
- Flussi lineari: usare il percorso esistente invece di aggiungere coordinator, registry, resolver, cache o modelli paralleli. Separare deve rendere il codice più facile da trovare, non annidarlo in molti file.
- Tipi semplici annidati o dichiarati nel modulo owner, senza un file per ogni tipo; niente wrapper attorno alle collezioni (una lista è un array).
- Loop semplici con early `continue`, una sola passata sui dati, mappe condivise invece di loop annidati e ricerche ripetute. Nomi espliciti senza abbreviazioni.

## Formattazione

Regole di scrittura vincolanti; dettagli, esempi e proposte ancora da confermare in `docs/fix-plan/00-regole-scrittura.md`.

- Spazi attorno a tutti gli operatori binari: `1 * 2 * 3`, mai `1*2*3`.
- `if` con corpo di una riga: su una riga, con graffe, `;` e spazi dentro le parentesi: `if ( result == null ) { return; }`. Mai `if(){}`, mai `{ return }` senza `;`, mai corpo senza graffe.
- `if` con corpo di più righe: graffe su più righe, senza spazi dentro le parentesi (`if (condition) {` … `}`).
- Una condizione `if` non si spezza mai su più righe: estrarre le parti in costanti con nome e combinarle (`if ( isOwner && canEdit ) { return; }`).
- Azioni semplici inline con `condition && fn()`; valori condizionali con `const value = condition ? a : b`.
- Mai commenti.

## Qwik e stato

- Preservare SSR e resumability. Usare le API di Qwik 2 e Router, non introdurre React o pattern importati automaticamente da altri framework.
- Usare il context nativo di Qwik per stato condiviso da più discendenti, evitando di trasmetterlo attraverso componenti intermedi. Dichiarare ID e tipi chiari, collocare il provider nel punto più vicino ai consumer e mantenere serializzabili i valori che attraversano il confine SSR/client.
- Le props restano appropriate per la configurazione diretta e locale di un componente. Non trasformare ogni valore in stato globale: mantenere locale ciò che è locale e avere una sola fonte di verità per ogni stato.
- Preferire primitive Qwik semplici e necessarie. Evitare hook personalizzati, effetti e livelli indiretti senza una necessità concreta; evitare `useVisibleTask$` quando CSS, HTML, un evento o un'API server risolvono il problema. Usare le API reattive e le regole di serializzazione documentate da Qwik quando servono.
- Integrare le nuove funzioni nei controlli esistenti (select, picker, tab) invece di aggiungere elementi sparsi. Opzioni non disponibili restano visibili ma disabilitate, con disponibilità ricavata dai dati restituiti e non da mapping hardcoded. Valori vuoti ("All", nessuna selezione) gestiti esplicitamente, senza trasformarli in `0` o parametri invalidi.
- Nell'URL vanno solo gli identificativi delle entità (server, sezione, suono, livello, streamer), come segmenti del path. Filtri, ordinamenti, pannelli e periodi sono stato locale della vista e non cambiano l'URL; se un dato del server dipende da una scelta di vista, la scelta viaggia in un cookie (es. `beebot_period`). Mantenere coerenti navigazione e rendering server. Gestire caricamento, errori e stati vuoti quando la funzionalità li richiede.
- Per sezioni con interfaccia condivisa, come la dashboard, usare layout annidati e `Slot`, con `Link` per la navigazione interna: mantenere il layout comune mentre cambia il contenuto della route, senza ricaricare il documento. Collocare i loader specifici nelle rispettive route e richiedere solo i dati necessari; considerare che middleware e loader condivisi possono rieseguirsi durante la navigazione. Configurare il prefetch in base alle necessità, evitando richieste anticipate inutili.
- Nella dashboard, passando per esempio da Welcome a Leave tramite `Link`, mantenere sidebar, header e struttura nel layout condiviso e aggiornare il contenuto della route. Ricavare la voce attiva dall'URL e applicare lo stato visuale con CSS e la minima logica reattiva necessaria. Caricare codice e dati della destinazione secondo necessità, senza presumere che i loader o i middleware condivisi non vengano rieseguiti.
- Dati principali e secondari della stessa pagina stanno in loader separati: il componente che rende la struttura non legge i secondari, che sono letti solo dai componenti foglia dentro un confine `Pending` con skeleton ed errore propri (`fail()`, non eccezioni). `blockSSR: false`, `Pending` e i limiti di rc.5 (SSR che attende tutti i loader, guardie nelle richieste JSON, `q-route.json`) sono descritti nel README: verificarli prima di aggiungere loader. Comportamento di navigazione e caricamento: `docs/claude-navigation-loading.md`.
- I form con modifiche non salvate usano `SaveDock`, che contiene il controllo `usePreventNavigate$`.
- Un accesso diretto o una ricarica di una route dinamica della dashboard devono produrre sul server l'HTML completo del layout e della pagina richiesta. I cookie applicabili arrivano con la richiesta e potranno essere usati lato server per la sessione quando l'autenticazione sarà implementata; non presumere che sia già presente.

## HTML e CSS first

- Partire da HTML semantico e controlli nativi: link per navigare, button per azioni, form e input per l'inserimento, radio e checkbox per selezioni, `details` e `dialog` quando appropriati. Conservare comportamento da tastiera, focus visibile, etichette e accessibilità; non ricreare un controllo nativo senza motivo.
- Affidare presentazione e stati visuali al CSS ogni volta che è possibile: `:has()`, `:is()`, `:not()`, `:checked`, `:focus-visible`, `:disabled` e altre pseudo-classi. Per tab, pannelli, colori ed effetti, preferire lo stato nativo già presente nel DOM, ad esempio `.tabs:has(input:checked) .panel` con selettori che associno correttamente controllo e pannello.
- Usare JavaScript solo quando serve a comportamento, dati, accessibilità non coperta dal controllo nativo o valori numerici realmente dinamici. Non duplicare in stato JavaScript una condizione già disponibile al CSS. Per vere tab seguire le semantiche e interazioni accessibili appropriate; non chiamare tab un gruppo che non le implementa.
- Usare classi descrittive e riutilizzabili per lo stile, con varianti semplici e combinabili. Riservare `data-*` a stato, integrazione o informazioni tecniche effettive; non usarli solo come sostituti delle classi.
- CSS leggibile: su una riga al massimo una dichiarazione (`.hidden { display: none }`), altrimenti dichiarazioni su righe separate, selettori raggruppati in modo chiaro, specificità contenuta e niente duplicazioni inutili. Supportare viewport differenti e `prefers-reduced-motion` per animazioni significative.
- CSS annidato, mobile-first, proprietà logiche, pochi wrapper e niente `!important` superflui. Per nuovi token di colore preferire OKLCH e organizzare i nuovi fogli con `@layer`; non convertire il CSS esistente senza richiesta.

## Token e temi

- Ogni scelta visiva riutilizzabile deve derivare da custom properties CSS: colori, superfici, testo, bordi, ombre, raggi, spaziature, tipografia, durate, curve ed effetti. Non spargere valori arbitrari nei componenti.
- Definire i valori base una sola volta e usare token semantici (per esempio superficie, testo, bordo, azione) nei componenti. Una variante di tema deve poter sostituire i token in un punto senza riscrivere i componenti.
- Aggiungere o adattare token quando nasce una necessità reale; non costruire in anticipo un sistema di temi o un selettore non richiesto. Valori strutturali e funzionali privi di significato di design, come `0`, `100%` o `1fr`, non richiedono token artificiali.
- Le custom properties numeriche dinamiche possono essere aggiornate via JavaScript quando necessario; colori ed effetti rimangono governati dai token CSS. Verificare contrasto e stati interattivi nei temi effettivamente implementati.

## Prestazioni e affidabilità

- Caricare e aggiornare solo ciò che serve, quando serve. Evitare lavoro ripetuto, scritture DOM/CSS identiche, listener o timer superflui e JavaScript iniziale non necessario. Non ottimizzare alla cieca: misurare il problema e verificare che il comportamento resti invariato.
- Per ogni valore chiedersi quando cambia davvero (resize, input, navigazione) e leggerlo o scriverlo solo allora. Media pesanti senza richieste all'ingresso: la sorgente si assegna all'azione dell'utente.
- Richieste: applicare solo l'ultima risposta quando possono arrivare fuori ordine, eseguire in parallelo quelle indipendenti, bloccare i doppi invii e gestire esplicitamente gli errori di rete. Lavorare sull'entità corrente (la guild aperta) invece di ricaricare o ricontrollare tutte le altre.
- Stati espliciti: distinguere una risorsa che esiste, è abilitata ed è valida (per esempio canale o messaggio mancante). Dati mancanti restano sconosciuti, senza fallback impropri. Errori gestiti e descritti nei log, mai silenziati.
- Gestire esplicitamente timing, richieste concorrenti, cleanup, retry ed errori quando pertinenti. Deduplicare richieste e stato soltanto dove è utile, senza introdurre cache globali o complesse prima di averne bisogno.
- I dati del backend e gli eventuali checkpoint salvati sono la fonte effettiva: non dedurre il successo da un'operazione soltanto avviata e non sovrascrivere stato persistito con valori di fallback. Verificare contratti, paginazione e limiti sui dati rappresentativi prima di integrarli.
- Conservare link e contenuti importanti nell'HTML SSR; verificare che la navigazione e la pagina funzionino anche al caricamento diretto. Evitare lavoro non essenziale che blocchi la risposta iniziale.

## Confini server e sicurezza

- Le variabili `PUBLIC_` sono pubbliche. Chiavi Beebot, segreti Discord e `SESSION_SECRET` restano solo sul server: non inserirli in markup, context serializzato, bundle client, log o repository.
- Usare convenzioni server di Qwik Router e Vercel Edge per richieste e variabili d'ambiente. Verificare compatibilità Edge prima di aggiungere librerie o API Node. Non implementare OAuth, accesso ai dati o servizi esterni senza una richiesta specifica.
- Non esporre dati personali o credenziali in esempi, documentazione e test. Mantenere `.env.example` privo di valori sensibili e rispettare `.gitignore`.

## Verifica e strumenti

- Scegliere verifiche proporzionate alla modifica. Per codice applicativo eseguire almeno build e controllo TypeScript quando pertinenti; verificare nel browser navigazione, accessibilità, stati e console per le modifiche UI. Aggiungere test mirati quando coprono comportamenti o regressioni significativi.
- Riportare con precisione cosa è stato verificato, cosa non lo è e gli eventuali problemi preesistenti. Distinguere codice osservato, documentazione e deduzioni, con riferimenti `file:riga`; non presentare una diagnosi come più certa di quanto dimostrato. Non presentare una build riuscita come prova di comportamento runtime o di miglioramenti prestazionali misurati.
- Qwik MCP fornisce informazioni sul progetto e documentazione coerente con la versione installata. Il server di sviluppo è necessario per gli strumenti di ispezione live.
- Usare sempre CodeGraph per esplorare struttura, relazioni, chiamanti e consumer prima di modificare, spostare o eliminare codice, e reindicizzare dopo le modifiche; la ricerca testuale solo per stringhe e contenuti letterali.
- Il piano di fix in corso, a fasi, e il flusso con gli agenti `fix-developer`, `fix-controller` e `syntax-officer` sono in `docs/fix-plan/`. I percorsi assoluti dei server MCP vanno aggiornati se la repository viene spostata.
