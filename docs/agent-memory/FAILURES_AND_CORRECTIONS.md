# Casebook — correzioni che hanno reso utile la sessione

Questi casi sono più informativi di un elenco di «buone pratiche»: mostrano che cosa l'utente ha rifiutato, quale criterio ha usato e quale esito ha accettato. `L...` indica la riga dell'esportazione, `#...` il numero del turno utente ricavato dalla chat.

## F01 — Copiare il pattern esistente, non aggiungere service

- **Esigenza:** unificare `GuildService`, `GuildCache`, `GuildData` e alert; le mutazioni dei dati devono poter salvare come in precedenza.
- **Correzione:** #7 L9182, #22 L19923: troppi owner e troppe mappe generiche campo/colonna, dubbi sulla relazione `AlertData` → `Guild`.
- **Esempio accettato:** #23 L20441, `GuildCache.withGuild(... guild.getAlert(...).deferEdit() ... update())`.
- **Regola trasferibile:** prima individuare l'owner semantico. La separazione in classi non è un valore se sposta una semplice operazione su più passaggi inutili.

## F02 — Lo spacing è struttura del codice

- **Correzione:** #19 L16912, #24 L25285: `hydrate` e i campi avevano perso raggruppamenti; banner ASCII rimossi.
- **Diagnosi riportata da Codex:** formattazione uniforme applicata a blocchi troppo ampi e test più concentrati sul comportamento che sulla qualità del diff (risposta dopo L25285).
- **Approvazione della riparazione:** #25 L25364 e #20 L17619 (su un passaggio precedente).
- **Regola:** preservare leggibilità locale e verificare diff oltre ai test; i commenti decorativi storici non vanno rimossi in un refactor funzionale non pertinente.

## F03 — `var` non rende automaticamente il codice moderno

- **Correzione preventiva:** #17 L13400 («al massimo in una arrow function ma mai dentro un metodo»); #18 L16659 preferenza `instance` minuscolo.
- **Regola:** non applicare una moda di sintassi in modo indiscriminato, rispettare convenzioni concrete e usarle con criterio.

## F04 — SoundAnalytics troppo compatto

- **Correzione:** #32–34 L33460–34527: l'utente rifiutò metodi lunghi/densi e il mancato rispetto dei pattern già negoziati.
- **Regola:** separare lettura/query, calcolo, aggregazione e output; se la classe ha più responsabilità, proporre uno split mirato, non costruire ulteriore boilerplate.

## F05 — Non anticipare l'implementazione

- **Scambio:** #151 L110058 («per quanto mi riguarda puoi completamente radere al suolo tutta la classe» nel contesto di una valutazione); #152 L110914 («non ti ho detto in nessun modo di farlo»).
- **Regola:** discutere alternative non equivale ad autorizzarne l'esecuzione. Chiedere scope esplicito o restare read-only se l'utente chiede «ragioniamo».

## F06 — R2: niente auth immaginaria

- **Esigenza:** flusso download/upload corretto e integrazione con CDN.
- **Correzione:** #50 L48272: ignorare privato/pubblico e non introdurre layer di autenticazione non richiesti *in quella fase*.
- **Regola:** preparare una funzionalità futura non è permesso tacito di implementarne ora tutte le politiche.

## F07 — SQL deve funzionare sul database reale

- **Correzioni:** #94–100 L78292–78528: incompatibilità del dialetto MariaDB, `UNSIGNED`, FK, generated column e tabelle mancanti.
- **Regola:** verificare DBMS/versione/DDL reale, non produrre query genericamente «simili» a MySQL. Testare migrazioni su schema realistico.

## F08 — Ottimizzazione, non entusiasmo tecnologico

- **Correzione:** #142 L103069: valutare Mongo solo con vantaggio misurabile; non passare a Mongo perché già presente. #133 L88737: pensare ai costi con decine di migliaia di suoni, non con dataset piccolo.
- **Regola:** ipotesi di performance → piano di misura → decisione; non saltare direttamente all'implementazione.

## F09 — Stop e play devono avere un significato uniforme

- **Correzioni:** #177–179 L122785–122886: preferenza per `getTrackScheduler().play(track, AudioType.SOUND)` e `stop()`, invece di introdurre `playSound`, `stopPlayback`, `stopSounds` laddove diluiscono l'owner.
- **Regola:** nuova feature deve passare dalla logica già deputata alla funzione; stesso contratto pubblico, branch condizionale interno quando appropriato.

## F10 — Lo stesso owner deve controllare API e stato persistito

- **Richieste:** #63–64 L51849–52633: durata/metadata non ricalcolati a ogni chiamata, allineamento SQL ↔ R2. #163 L113234: visibilità di propri suoni senza promozione artificiale nel ranking.
- **Regola:** stato derivato e ranking devono essere coerenti attraverso bot, database, storage e API; evitare incoerenze causate da due sistemi con logiche proprie.

## F11 — Il perimetro cambia nel tempo: non cristallizzare un momento

- **Sequenza:** la privacy R2 è prima rimandata (#50), poi discussa nuovamente (#86–87 L73183–73697). Il refactor iniziale è dichiarato terminato (L56157), ma la stessa chat prosegue per decine di modifiche.
- **Regola:** una memoria deve registrare la data/ordine, lo stato e il superamento delle decisioni.

## F12 — Ogni approvazione va registrata, ma non inventata

- «proprio questo volevo, per me procedi» (#23 L20441) = approvazione esplicita.
- «mi sembra andare tutto R2» (#54 L49004) = impressione/smoke test dell'utente, non certificazione dei casi limite.
- «le sei fasi chiuse» (risposta Codex intorno a L56157) = **stato dichiarato dall'agente** e poi accettato dall'utente (#69 L56166), non prova tecnica indipendente.
- «procedi» autorizza la proposta immediatamente precedente, non qualsiasi opportunità associata.
