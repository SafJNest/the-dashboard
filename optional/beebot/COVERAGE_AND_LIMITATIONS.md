# Copertura, confidenza e limiti

## Che cosa è stato effettivamente estratto

- 191 interventi dell'utente: indicizzati in ordine con riferimento alla riga originale in `SOURCE_INDEX.md`.
- 32 decisioni significative: etichettate per stato in `DECISION_LOG.md`.
- 12 casi correttivi: spiegazione di errore, feedback e criterio appreso.
- Regole globali, Java e flusso di autorizzazione; esempi concreti approvati nella chat.
- Contesto Beebot e tre adapter d'ingresso (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`).
- Prompt per onboarding, cambio fase, diagnosi, handoff e prova comparativa.

## Cosa NON significa questa estrazione

- Non è un'analisi semantica/verifica indipendente di ogni riga dei 6,2 MB di chat: il registro è una **curatela dei casi più significativi**, accompagnata dall'indice dei 191 messaggi.
- Non contiene tutti i testi delle risposte e degli strumenti: il transcript originale va conservato per approfondimenti.
- Non contiene i file sorgenti della repository, l'ultimo schema MariaDB, i diff Git, né il contenuto effettivo di `docs/claude-code-handoff.md` prodotto nella sessione originale.
- Non garantisce che le decisioni della chat siano ancora applicabili al branch corrente o che l'agente le esegua correttamente.
- Non include API key, secret, token, file di configurazione reali, log grezzi o screenshot.

## Livelli di evidenza usati

- **E1 — istruzione esplicita:** l'utente dichiara direttamente una preferenza o un limite, con riferimento a #turno/riga.
- **E2 — approvazione esplicita:** dopo una proposta specifica l'utente dice chiaramente che è quella desiderata e autorizza.
- **E3 — risultato dichiarato:** Codex riferisce modifiche/test/commit. Non è prova indipendente dell'ultimo stato del codice.
- **E4 — verifica nel repo corrente:** non eseguita durante la generazione di questo pacchetto; da raccogliere quando il pacchetto viene installato in Beebot.

## Passaggio indispensabile per fare della memoria una fonte attendibile

Nella repo corrente, confrontare le istruzioni esistenti e `docs/claude-code-handoff.md` con questo pacchetto, controllare i commit e associare i pattern preferiti ai **metodi approvati effettivamente presenti**. Poi compilare `CURRENT_PROJECT_STATE_TEMPLATE.md` e fare il test in `AGENT_EVALUATION.md` su un task ripetibile. Solo così si può distinguere una preferenza ben documentata da una pratica effettivamente riproducibile con un altro agente.
