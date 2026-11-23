# Registro decisioni — con provenienza e cambiamenti nel tempo

Estratto manualmente dalla chat, non sostituisce ADR, test e branch reali. I numeri si riferiscono al `SOURCE_INDEX.md`; le righe `L...` puntano al file originale. `APPROVATA` indica decisione esplicita dell'utente; `DICHIARATA` indica lavoro che Codex ha detto di aver svolto, senza verifica indipendente della repository; `RINVIATA` non va implementata automaticamente; `SUPERATA` indica scelta successiva incompatibile con una precedente.

| ID | Argomento | Stato nella conversazione | Decisione / vincolo | Evidenza |
|---|---|---|---|---|
| D01 | Audit repo | APPROVATA | Audit trasversale prima di rifattorizzare; cercare duplicati e owner tra bot/API/LoL/DB | #1 L3, #4 L2673 |
| D02 | Mongo LoL | APPROVATA | Mongo usato in LoL non va spostato solo per uniformare package | #6 L7919 |
| D03 | SQL classi | APPROVATA | Conservare struttura SQL esistente; allineare solo anomalie rilevanti a `QueryRecord`/query helper | #6 L7919 |
| D04 | Owner guild | APPROVATA | Evitare triplicazione `GuildCache`/`GuildService`/`GuildSettingsDB`; dominio e cache condivisa tra bot e API | #7 L9182 |
| D05 | Piano canonico | APPROVATA | Piano in chat e documento repo sincronizzati 1:1 | #13 L10344 |
| D06 | Stile Java | APPROVATA | `withGuild` approvato, tipi espliciti nei metodi, `var` eventualmente nelle lambda, `instance` minuscolo, spacing e campi raggruppati | #17–19 L13400–16912 |
| D07 | Modifica alert | APPROVATA | `withGuild` + `AlertData.deferEdit()` + setter + `update()` è pattern esatto desiderato | #22–23 L19923–20441 |
| D08 | Conservazione formato | APPROVATA | Ripristinare spacing e banner dopo refactor; applicare lo stesso criterio al codice nuovo | #24–25 L25285–25364 |
| D09 | Guild transaction | DICHIARATA | Unit of work per blocco e commit prima della visibilità in cache; setter immediati conservati | #26–28 L26104–26649, risposta dopo #28 |
| D10 | Analytics | APPROVATA | Evitare monolite `SoundAnalytics`, metodi densissimi e responsabilità miste; refactor specifico | #32–34 L33460–34527 |
| D11 | Exceptions | APPROVATA nel refactor | Nome `Exception` preferito a `BeebotException` nel progetto | #39 L38567 |
| D12 | Auth persistence | APPROVATA | Parti concordate possono rimanere in `AuthDB` | #45 L46514 |
| D13 | Sei fasi | DICHIARATA e accettata | Refactor iniziale concluso secondo la chat; non riscrivere la milestone come task ancora aperto | risposta ~L56157, #69 L56166 |
| D14 | R2 sound base | APPROVATA per fase | Comando + DB + ID + R2/CDN; niente auth privato/pubblico aggiuntiva in quel primo giro | #48–50 L47254–48272 |
| D15 | R2 thumbnail | APPROVATA per fase | Thumbnail soundboard in bucket R2, con ID e schema storage da verificare | #56–58 L49036–49544 |
| D16 | Metadata sound | APPROVATA per fase | Durata e metadata persistiti; upload/modifica devono mantenere SQL e R2 coerenti | #63–64 L51849–52633 |
| D17 | Warning/action API | RINVIATA | Warning/action fuori dal refactor API corrente; da riprogettare separatamente | #76 L62774 |
| D18 | API documentation | APPROVATA | Prima di estendere endpoint scrivere contratto di tutte le rotte/body/filtri; creare Postman organizzato | #88 L75122, #90 L77527 |
| D19 | MariaDB | APPROVATA | Migrazioni e tipi devono funzionare su MariaDB reale; attenzione `UNSIGNED`, FK, generated columns | #92–100 L78191–78528 |
| D20 | Cache Cloudflare | DA VALUTARE | Distinguere dati LoL immutabili (match finiti) da profili soggetti a invalidazione; analisi non significa modifica | #115 L85212, #119–124 L85748–86391 |
| D21 | Search sound | APPROVATA | Ricerca per nome/tag e sorting coerente; controllare costo query e scala, non solo dataset piccolo | #125–135 L87256–88831 |
| D22 | MariaDB vs Mongo | APPROVATA | Migrare solo se un benchmark/use case giustifica il vantaggio | #142 L103069 |
| D23 | Path R2 suoni | APPROVATA | Path desiderato `sounds/{id}/{id}.{ext}` con thumbnail nel medesimo contenitore per ID, precedenti path da riallineare | #146–147 L105843–107082 |
| D24 | Settings refactor | SUPERATA / chiarita | «Potresti riscrivere» era proposta da valutare, NON autorizzazione a editare; successivo lavoro YAML su consenso esplicito | #151–152 L110058–110914, #155–157 L111084–111660 |
| D25 | Sicurezza secrets | APPROVATA | Lettura contestuale di vecchi JSON ammessa con esplicito divieto di salvarne i contenuti in memoria/documenti | #157 L111660 |
| D26 | Search unificata | APPROVATA come direzione | Suoni privati visibili al proprietario ma non promossi in ranking; ricerca estendibile a soundboard/tag e combinazioni filtro | #163 L113234, #172–173 L119548–120765 |
| D27 | Soundboard social | PROPOSTA poi autorizzata in scope | Commenti/like estesi a soundboard, sorting alfabetico/manuale, specifiche API condivise con il design | #164–165 L113455–113612 |
| D28 | Player audio | APPROVATA come comportamento | Evitare duplicazione di `play/stop`/responsabilità scheduler; overlap modifica lo stesso flusso | #177–180 L122785–123001 |
| D29 | Effetti sonori | APPROVATA per fase | Effetti attivati tramite comandi, temporanei e non persistiti su database | #183 L123353 |
| D30 | Soundboard realtime | RINVIATA come implementazione | Analizzare input come set di tasti attivi e gestire start/stop su variazione, senza implementare nel primo passaggio | #186 L123599 |
| D31 | Player generico | DA PROGETTARE | Stato/controllo player deve poter gestire musica e suoni senza diventare solo «API della soundboard» | #188 L123710 |
| D32 | Handoff cross-agent | DICHIARATA | In chat Codex crea `docs/claude-code-handoff.md`, riferendo 26 link e hash Git controllati; non incluso nella presente esportazione come file autonomo | #191 L123974, fine L124755 |

## Politica di supersessione

Le righe D14 e D15 descrivono una **fase iniziale**; discussioni successive su bucket pubblici/privati e thumbnail (#86–87) possono cambiarne il significato attuale. D24 non autorizza il futuro agente a cancellare classi o impostazioni: il vincolo è precisamente il contrario. Le scelte D26–D31 sono più recenti del refactor a sei fasi: verificare branch, codici e test contemporanei prima di presentarle come già implementate.

## Come aggiungere nuove decisioni

```text
ID: D33
Ambito: [globale / Java / Beebot / altro progetto]
Stato: [proposta / approvata / implementata dichiarata / verificata / superata]
Motivazione e alternativa rifiutata:
Decisione:
Esempio approvato (metodo/test/commit):
Conseguenze su API, DB, concorrenza, stile:
Fonte (chat/PR/commit):
Sostituisce decisioni:
```

### 21 novembre 2026 — Esempio canonico EventHandler: contesto → condizioni → azioni

- **Stato:** preferenza generale di stile, confermata direttamente dal proprietario nel messaggio più recente, non una modifica alla repo.
- **Evidenza:** `EventHandler.onGuildVoiceUpdate(GuildVoiceUpdateEvent e)` fornito direttamente dall'utente e valutato come «perfetto» per leggibilità e organizzazione.
- **Regola:** nei gestori di eventi ricavare in testa i riferimenti significativi, mantenere visibili i casi di business nello stesso handler e delegare a funzioni esistenti (`handleBotLeave`, `isBotAlone`, `handleGreetSound`) i comportamenti specifici.
- **Limite:** principio trasferibile a tutti gli agenti; firme, scelte JDA e logica di runtime da verificare nel progetto concreto. Esempio completo in `JAVA_STYLE_AND_PATTERNS.md` §6.
