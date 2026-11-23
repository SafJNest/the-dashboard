# Workflow e autorizzazioni — riproducibilità della sessione

## Fase A — scoperta (sola lettura)

1. `git status`, branch e diff non propri; identificazione di documenti di progetto e ADR.
2. Analisi degli owner e dei flussi end-to-end del caso d'uso: Discord / API / domain model / cache / SQL / Redis / LoL / storage, dove coinvolti.
3. Consultare CodeGraph se disponibile: stato dell'indice, simboli, callers, blast radius, test. Validare sul codice corrente, non fidarsi di indici stantii.
4. Individuare percorsi duplicati, policy divergenti, opportunità e regressioni potenziali.
5. Restituire **proposta senza modifiche**, quando richiesto. Ogni alternativa deve dire cosa si sposta, cosa resta, cosa rimuovere dopo migrazione e test da fare.

## Fase B — decisione

Proporre passi piccoli con prerequisiti e vincoli. Il proprietario può approvare alcuni elementi e rifiutarne altri. Salvare le decisioni nel repository prima di una lunga implementazione. Il piano in chat e il piano salvato devono combaciare 1:1 (#13 L10344).

**Esempio reale:** Codex propose una forma di `withGuild` e, dopo discussione, il proprietario approvò la modifica composte con `deferEdit()` + `update()` (#17 L13400, #22–23 L19923–20441).

## Fase C — implementazione autorizzata

1. Verificare se `procedi` si riferisce alla fase appena concordata: implementare **solo quella**.
2. Migrare i chiamanti prima di eliminare vecchi file/classi. Preservare contratti e test.
3. Evitare riscritture di stile nei file estranei.
4. Non introdurre layer speculativi, auth non richiesta, nuove tecnologie perché già presenti o API duplicative.
5. Se un vincolo viene chiarito a metà: non buttare via tutto il lavoro; riconciliare il piano e il diff.
6. Non modificare configurazioni segrete senza consenso e non registrare i contenuti in memorie/documenti. L'utente ha espressamente limitato la lettura di JSON sensibili (#157 L111660).

## Fase D — verifica e passaggio di consegne

- Test mirati e build; per query SQL compatibilità con il dialetto reale (MariaDB), tipi FK, indici e EXPLAIN se rilevante. Non assumere che PostgreSQL/MySQL/MariaDB siano equivalenti.
- Diff e naming review: ogni riga aggiunta è necessaria? Il codice nuovo rispetta l'owner corretto?
- Verificare limiti: concorrenza, rollback, error handling, permessi, regressioni HTTP e Discord, cache, presentazione.
- Distingue test unitari, simulazioni e test live.
- Riassumere «modificato / preservato / testato / non testato / prossimo step».
- Chiedere commit se manca autorizzazione. **Non fare push automaticamente.**

## Semantica rigorosa delle richieste

| Formula dell'utente | Azione autorizzata |
|---|---|
| «Analizza / ragioniamo / come faresti?» | Studio e proposta, senza diff |
| «Fammi esempi» | Esempi, non modifiche |
| «Procedi» dopo un piano specifico | Solo quella fase/piano |
| «Per ora ignora X» | Escludere X, senza preparare di nascosto la sua architettura |
| «Commit» | Commit delle sole modifiche concordate; non push |
| «Push» | Solo quanto esplicitamente incluso e dopo controllo stato/branch |
| «Non toccare il frontend» | Backend soltanto |
| «Spiega perché è successo» | Diagnosi prima del fix |

## Caso d'errore da prevenire

Nel confronto sui settings l'utente disse che poteva riscrivere radicalmente una classe **come direzione architetturale**; l'agente passò all'esecuzione prima del permesso esplicito, ricevendo una correzione (#151–152 L110058–110914). Questa è una regola di sicurezza del flusso di lavoro, non solo di stile.

## Handoff minimo a fine fase

```text
Fase: ...
Decisioni applicate: ...
File cambiati: ...
Compatibilità preservata: ...
Verifiche effettuate (comandi + esito): ...
Non verificato: ...
Decisioni ancora aperte: ...
Next step proposto: ...
Commit / push: stato esatto
```
