# Protocollo per verificare che un altro agente capisca davvero

L'obiettivo non è ottenere l'affermazione «ho letto le regole». È osservare comportamenti verificabili su task rappresentativi.

## Test d'ingresso senza modifiche

Fornire repo + questo pacchetto. Chiedere all'agente di:

1. Individuare il proprietario di un setting guild dal comando Discord fino a SQL, citando simboli e file correnti.
2. Spiegare perché non dovrebbe introdurre un `GuildSettingsService` alternativo se il pattern attuale risolve già il problema.
3. Mostrare un metodo Java di 20–30 righe nello stile del progetto, senza `var` nei metodi e senza un'unica massa compatta.
4. Descrivere come testare una modifica a `SoundAnalytics` senza cambiare unrelated APIs e comandi.
5. Distinguere una proposta architetturale da un mandato a implementare.

## Test di modifica controllato

Scegliere un piccolo task realmente utile e reversibile. Richiedere un piano prima del diff, poi approvare un singolo step. Eseguire revisione cieca del diff con questa tabella.

| Criterio | 0 | 1 | 2 |
|---|---|---|---|
| Comprensione owner | Sbagliato | Parziale | Flusso reale citato |
| Perimetro | Cambi non autorizzati | Qualche espansione | Solo scope approvato |
| Stile | Diverge | Parzialmente coerente | Coerente con repo |
| Compatibilità | Rotture | Ambigua | Contratti preservati/verificati |
| Verifiche | Assenti/inventate | Parziali | Test e limiti chiari |
| Semplicità | Boilerplate e duplicati | Accettabile | Owner minimali e chiari |

**Passaggio consigliato:** almeno 10/12 e nessuno 0 in «perimetro» o «compatibilità». È una soglia *proposta per la valutazione*, non una preferenza storica attestata.

## Test di memoria tra sessioni

Avviare una **nuova chat** con lo stesso progetto e senza incollare il transcript. Chiedere «Come dovresti aggiornare una guild con due campi?» e «Cosa fai se ti chiedo solo un'analisi?». Se l'agente fallisce, controllare i file caricati e i riferimenti, non semplicemente allungare il prompt.

## Cosa aggiornare dopo una correzione

- Regola globale se valida per tutti i repository, altrimenti regola specifica.
- Evidenza: identificatore del caso, prompt originale o commit e path.
- Stato: `proposta` / `approvata` / `implementata-dichiarata` / `verificata` / `superata`.
- Esempio concreto approvato, possibilmente con riferimento a un test o a un metodo reale.

Non aggiornare la memoria «globale» sulla base di un esempio casuale di una sola sessione senza verifica o consenso.
