# Beebot — contesto di dominio e decisioni storiche

**Attenzione:** questo è un estratto della conversazione, **non** una fotografia verificata della repository `SafJNest/Beebot` al 21 novembre 2026. Prima di ogni modifica confrontare con branch, codice, schema SQL e documentazione correnti. Nel corso della chat alcune decisioni sono state riformulate: il `DECISION_LOG.md` esplicita le sostituzioni.

## Obiettivo del refactor originale

La repo conteneva troppe responsabilità sovrapposte: errori Spring/auth, guild/alert, cache, sound e componenti LoL. Il proprietario voleva **un ordine architetturale per proprietari chiari**, evitando l'accumulo di service e helper non necessari, in preparazione del layer R2 per i suoni (messaggio #1 L3).

Il refactor fu diviso in sei fasi con piano documentato. Intorno a L56157, la chat dichiara chiuso e committato tale refactor. **Gli sviluppi successivi non fanno parte di quelle sei fasi** e non vanno riportati come «ancora da fare in fase 1–6».

## Principi confermati

### Cache e dominio condivisi

- Bot e API dovrebbero accedere agli **stessi oggetti e allo stesso percorso di cache** quando condividono processo (#7 L9182 e approvazione #23 L20441).
- Cache bulk: recuperare dal DB solo gli ID richiesti e assenti, non tutti quelli richiesti ogni volta.
- `GuildCache.withGuild(...)` delimita il lavoro sullo stesso owner. `GuildData` e `AlertData` sono responsabili del proprio stato persistente; setter immediati conservati.
- Per modifiche composte, `deferEdit()` crea una copia privata, `update()` persiste il blocco e pubblica dopo commit. Il sync in memoria riguarda **il processo**: non promette sincronizzazione tra più istanze o scrittori esterni.
- Preferire query esplicite e unità transazionali ben delimitate ai mapping generici `field → SQL column` nascosti dietro mappe (#22 L19923).

### Spring, autenticazione e errori

- L'utente ha suggerito auth vicino a Spring (#11 L10303), ma la conversazione ha registrato riorganizzazioni successive. **Non ricreare package basandosi sull'affermazione storica**: prendere come canonico il checkout attuale e ADR.
- Centralizzare il mapping degli errori e ridurre duplicazioni HTTP, senza forzare oggetti di risposta identici su domini che hanno contratti diversi.
- Preferenza dichiarata per la classe `Exception` anziché `BeebotException` nel refactor specifico (#39 L38567); non alterare le eccezioni Java standard o inventare package da questo dettaglio.
- SQL di auth, quando esiste, può rimanere in `AuthDB` (#45 L46514).

### SQL e Mongo

- Evitare di spostare MongoDB per ragioni puramente strutturali: era usato da LoL, quindi il proprietario lo considerava già nel dominio corretto (#6 L7919).
- Non migrare a Mongo solo perché disponibile: il proprietario vuole un vantaggio concreto in performance, interrogazione o gestione dati prima di cambiare MariaDB (#142 L103069).
- Per MariaDB richiede query direttamente compatibili con la **versione e schema reali**, con attenzione a `UNSIGNED`, foreign key, reserved keywords e generated columns; nella chat furono segnalati errori concreti (#94–100 L78292–78528).
- Controllare piani di esecuzione e cardinalità delle query, non solo il tempo attuale con pochi suoni (#125, #132–134 L87256–88831).

### Audio e Soundboard

- La parte sound ha API, bot Discord, cache, SQL, storage Cloudflare R2 e interfaccia dashboard. Cercare sempre l'owner reale del caso d'uso **attraverso tutti questi confini**.
- R2: preferenza per storage e metadati allineati con SQL, URL CDN, download/cache locali quando necessari. Evitare layer di autenticazione non richiesti (#48–50 L47254–48272); attenzione: la configurazione privacy dei bucket venne discussa e modificata più avanti, quindi verificare l'ultima implementazione nel checkout.
- L'utente ha richiesto una struttura di path sound normalizzata `sounds/{id}/{id}.{ext}` con thumbnail associate nella stessa directory e migrazione di percorsi precedenti (#146–149 L105843–108401). **Verificare cosa è stato eseguito**.
- L'API di ricerca deve rispettare visibilità e ranking: un suono proprio non va privilegiato nel sorting solo perché è dell'utente loggato (#163 L113234). Per sound + soundboard + tag, preferenza per un endpoint di ricerca composito e filtro opzionale per tipo, senza perdere i singoli endpoint dove necessari (#172–173 L119548–120765). È una decisione da validare sul codice attuale.
- Refactor audio overlap: mantenere `play()` e `stop()` dove hanno già la responsabilità corretta; non introdurre catene `playSound`/`stopSounds`/`stopPlayback` senza motivo (#177–179 L122785–122886). Il flag di overlap deve modificare il comportamento nello stesso flusso, non crearne uno completamente parallelo (dominio descritto verso fine chat; verifica nel codice).
- Effetti audio di test inizialmente temporanei, senza persistirli nel DB (#183 L123353).
- Futuro controllo da web soundboard: concetto «tasti premuti» e suoni che partono/si fermano alla variazione di stato, simile a una tastiera musicale; al momento della domanda l'utente chiese **solo analisi** (#186 L123599). Successivamente ha chiesto un modello generico di player che copra anche musica e queue (#188 L123710). **Non assumere queste feature già implementate**.

### Configurazione

- La chat discuteva un sistema di configurazione più modulare e YAML che comprendesse Spring e il bot (#155–161 L111084–112571). In seguito ci sono indicazioni di commit (#162 L113139), ma va verificato nella repo quanto è effettivamente attivo.
- Configurazioni reali, API key, OAuth e JSON contenenti segreti **non vanno copiati nelle istruzioni né salvati in memoria**. Il proprietario ha concesso lettura contestuale con restrizione esplicita (#157 L111660).

## Area fuori scope o rinviata durante il refactor originale

- Mongo e parte di LoL: non stravolgere per uniformità (#6 L7919).
- Warning/action: esclusi dal giro degli endpoint, da riprogettare in seguito (#76 L62774).
- Logging: riconosciuto brutto ma deliberatamente non urgente (#66–68 L54302–55775).
- `Chronos` e altri ritocchi minori: rimandati al termine delle sei fasi (L56157).
- R2, sound, endpoint, search, YAML e audio overlap: **successivi al refactor**; leggere decision log più recente.

## Dove cercare le fonti originali in repository

La chat cita (ma **questo pacchetto non contiene**) `AGENTS.md`, `docs/architecture/repository-review.md`, `docs/architecture/refactor-workflow.md`, `docs/HANDBOOK.md`, `docs/api/...`, `docs/claude-code-handoff.md`, `.agents/agents/beebot-refactor.md`, `.codex/agents/beebot-refactor.toml`. La prima operazione di ogni agente deve essere verificare quali esistono oggi, quali sono versionati e quali divergono dalle decisioni finali.
