# Contratto di programmazione portabile

Questo documento sintetizza le **preferenze esplicite e ricorrenti** del proprietario osservate nella chat. È un contratto di collaborazione, non uno standard universale applicabile automaticamente a tutte le repo.

## Principi prioritari

1. **Capire il sistema prima di cambiarlo.** Leggere il codice reale, seguire chiamanti e dipendenze, controllare branch, `git status`, documentazione e test. Nelle repo con CodeGraph usarlo per mappa e blast radius; il risultato non sostituisce la lettura/verifica del codice.
2. **Separare analisi e implementazione.** Se il proprietario dice «analizza», «ragioniamo», «dimmi cosa faresti», «non fare modifiche», rimanere in sola lettura. Non interpretare libertà di riscrivere una classe come permesso di farlo *subito*. Riferimenti: messaggi #16 (L12042), #163 (L113234), #151–152 (L110058, L110914).
3. **Ogni cambiamento ha uno scope concordato.** Lavorare a fasi, spiegare la prossima fase e attendere autorizzazione; rispettare esplicitamente il lavoro fuori perimetro (Mongo/LoL, warning, UI, logging, quando esclusi).
4. **Usare le responsabilità esistenti.** Prima di inventare service, manager, wrapper, helper o endpoint, controllare il proprietario corrente della funzione. Non creare percorsi paralleli se uno funzionante esiste già.
5. **Ridurre la complessità reale, non massimizzare il numero di layer.** Una classe in più deve avere un vantaggio misurabile di responsabilità, testabilità o isolamento. Evitare astrattizzazioni generiche che nascondono flussi semplici.
6. **Preservare il comportamento e il vocabolario pubblico**: comandi, nomi di metodi storici, API, DTO, embed, testo, ordine dei campi, validazioni, compatibilità. Cambiarli solo con esigenza esplicita.
7. **Il codice deve sembrare scritto per questa repo.** Preservare spacing, separatori, banner ASCII e raggruppamenti esistenti. Nuovo codice coerente con lo stile locale, non con il formattatore preferito del modello.
8. **Preferire codice esplicito e leggibile.** Tipi locali espliciti, nomi chiari, blocchi logici separati, SQL comprensibile, early return dove rende evidente il flusso. Evitare una riga di codice densa solo per essere «compatti».
9. **Rispettare concorrenza e durabilità.** Distingue stato in cache, scritture persistenti e transazioni. Se si pubblicano mutazioni, farlo dopo successo della persistenza; gestire rollback e conflitti per unità logica.
10. **Riutilizzare ciò che funziona.** Enum, mapper, parsing, HTTP utility, query helper, oggetti di dominio e percorsi di autenticazione hanno proprietari. Non duplicare switch e adapter senza ragione concreta.
11. **Misurare prima di ottimizzare.** Soprattutto SQL e cache: guardare query, cardinalità, EXPLAIN, esiti e costi. Una nuova tecnologia (Mongo, Redis, Cloudflare) non è un miglioramento per definizione. Riferimento: #142 (L103069).
12. **Non confondere compilazione con correttezza.** Riesaminare il diff per stile e semantica; eseguire test pertinenti; distinguere prove locali, integrazioni simulate e ambiente live.
13. **Non sacrificare operazioni esistenti per la nuova feature.** Le estensioni audio e API devono preservare semantica di `play`, `stop`, comandi, embed e contratti nel resto del bot.
14. **Controllare e comunicare precisamente le modifiche.** Dire file toccati, ragioni, test, limiti, punti non verificati e cambiamenti lasciati fuori.
15. **Commit e push sono autorizzazioni diverse.** Non fare push quando è stato chiesto solo commit. Non modificare o cancellare worktree altrui; non fare merge/squash/ripristini senza specifica autorizzazione. Riferimenti #182 (L123272), #152 (L110914).

16. **Eventi come orchestrazione leggibile.** Negli event handler estrarre all’inizio il contesto utile in variabili locali dai nomi chiari e con tipi espliciti, mostrare direttamente le condizioni operative e delegare gli effetti a funzioni esistenti ben denominate. Il `EventHandler.onGuildVoiceUpdate` fornito e approvato il 21 novembre 2026 è un esempio positivo; vedere `JAVA_STYLE_AND_PATTERNS.md` §6. Non introdurre layer intermedi per il solo gusto di astrarre.


## Come rispondere quando il proprietario propone una soluzione

- Identificare **che problema vuole risolvere**, non solo l'implementazione proposta.
- Confrontare la soluzione con le classi esistenti e proporre una soluzione concreta con firma di metodo o percorso chiamante.
- Esplicitare trade-off tecnici quando c'è un rischio o una semplificazione reale.
- Se il proprietario corregge la soluzione, preservare il resto del lavoro già valido, rivedere il piano e aggiornare la documentazione.
- Non fingere che una scelta discussa sia un fatto definitivo: usare «proposta», «approvata», «implementata secondo la chat», «verificata nel checkout corrente».

## Cosa non è una regola globale

Il nome `instance`, il modello `GuildData.deferEdit()` e le query `BotDB` sono **convenzioni Java/Beebot**. Il principio generale è rispettare stile locale, owner chiari e atomicità; in un nuovo progetto gli strumenti possono essere diversi.

## Evidenze principali

- #7 L9182: unificare responsabilità `GuildService`/`GuildCache`; mantenere persistenza sugli oggetti.
- #13 L10344: piano della chat identico a quello nel repository.
- #17 L13400: approvazione `withGuild`, no `var` diffuso, delimitazione delle fasi.
- #19 L16912, #24 L25285: spacing, gruppi logici e banner ASCII non cosmetici.
- #22 L19923, #23 L20441: rifiuto di indirezione e approvazione di `deferEdit → update`.
- #32 L33460, #34 L34527: rifiuto di analytics monolitico e metodi compressi.
- #50 L48272: stop ai layer d'auth non richiesti.
- #152 L110914: proteste per modifiche effettuate durante una discussione non autorizzata.
- #177–179 L122785–122886: richieste di preservare proprietari e semantica dello scheduler audio.
