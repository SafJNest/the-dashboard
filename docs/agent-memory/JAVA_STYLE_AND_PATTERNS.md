# Java — esempi concreti approvati e anti-pattern

Non generalizzare automaticamente a Java fuori da Beebot. Quando la classe ha una convenzione migliore o diversa, discuterla prima di uniformare.

## 1. Pattern approvato: operazione delimitata da un proprietario chiaro

**Approvato esplicitamente nella chat (#17, L13400):**

```java
boolean saved = GuildCache.withGuild(
    guildId,
    guild -> guild.setPrefix(prefix)
);
```

**Approvato esplicitamente (#23, L20441):**

```java
boolean saved = GuildCache.withGuild(guildId, guild -> {
    AlertData edit = guild.getAlert(AlertType.LEAVE).deferEdit();

    edit.setMessage(message);
    edit.setPrivateMessage(privateMessage);

    return edit.update();
});
```

Perché funziona: il chiamante descrive l'intento, il dominio contiene la mutazione, il boundary `withGuild` coordina l'accesso, `deferEdit` separa la copia temporanea dalla pubblicazione della modifica.

**Non inventare l'API `deferEdit` in qualunque codebase:** è un pattern concreto di Beebot da verificare sui file attuali prima dell'uso.

## 2. Spaziatura che comunica intenzione

L'utente ha corretto metodi `hydrate` troppo compressi (#19 L16912) e ha chiesto che guardie, preparazione, query, trasformazione e ritorno siano separati. Esempio **illustrativo**, non codice verbatim della repo:

```java
private Map<String, GuildData> hydrate(List<QueryRecord> rows) {
    if (rows.isEmpty())
        return Map.of();

    List<String> ids = new ArrayList<>();
    for (QueryRecord row : rows)
        ids.add(row.get("guild_id"));

    Map<String, List<QueryRecord>> channels = group(BotDB.getChannelData(ids));
    Map<String, List<QueryRecord>> actions = group(BotDB.getWarnings(ids));

    Map<String, GuildData> result = new LinkedHashMap<>();
    for (QueryRecord row : rows) {
        String id = row.get("guild_id");
        result.put(id, GuildData.fromRows(
            row,
            channels.getOrDefault(id, List.of()),
            actions.getOrDefault(id, List.of())
        ));
    }

    return result;
}
```

Il caso non richiede che *ogni* operazione sia su più righe: il criterio è la leggibilità dei blocchi, non un formatter meccanico.

## 3. Preferenze esplicite di sintassi

- **Tipi locali espliciti** nei corpi dei metodi. `var` eventualmente nelle lambda, non come sostituto universale (#17 L13400).
- Singleton: preferenza per `instance` minuscolo, non `INSTANCE` (#18 L16659).
- Per `if`, `for`, `while`, anche con un solo statement, corpo su nuova riga indentata quando si introducono o si modificano metodi (#19 L16912).
- **Non compattare** metodi di servizio complessi in code-golf; il problema emerse in `SoundAnalytics` (#32–34 L33460–34527).
- Raggruppamenti di campi, costruttori e banner ASCII esistenti vanno preservati (#24 L25285). Una migrazione di package non autorizza una riscrittura di stile.
- Gli enum e le utility già presenti sono preferibili a nuovi switch o wrapper semantici analoghi.
- Metodi chiamati `play()` e `stop()` non devono proliferare in `playSound`, `stopSounds`, `stopPlayback` se trasformano in duplicazione una responsabilità che già esiste (#177–179 L122785–122886).

## 4. Persistenza: principio e limiti

Nel refactor Beebot è stato concordato:

- Setter di dominio già persistenti restano immediati.
- Mutazioni composte: copia privata → setter → `update()` per un blocco.
- SQL esplicito/prepared, transazioni per unità logica, pubblicazione dello stato dopo commit.
- In caso di fallimento, evitare di rendere visibile in cache uno stato che il DB non ha salvato.
- Per la cache: caricare in bulk solo gli ID mancanti; non ricaricare tutte le entry già presenti.

La conversazione riporta test locali e H2 in modalità MariaDB per il refactor di guild/alert; **non** costituiscono una verifica live indipendente del database attuale.

## 5. Checklist di review per stile

- [ ] Diff minimo rispetto alla feature richiesta.
- [ ] Metodi nuovi seguono lo stile locale di quelli ben scritti.
- [ ] Tipi e nomi leggibili; nessun `var` diffuso nei metodi.
- [ ] Separatori di campi e blocchi logici preservati.
- [ ] Nessun cambio di nomi o responsabilità non autorizzato.
- [ ] Nessuna riscrittura di formattazione fuori scope.
- [ ] Output del diff controllato visivamente, oltre a build/test.


## 6. Esempio canonico approvato — EventHandler come orchestratore

**Fonte:** esempio fornito direttamente dal proprietario il 21 novembre 2026 e qualificato come un modo «perfetto» di gestire un `GuildVoiceUpdateEvent`. È un **riferimento positivo di stile e struttura**, non una verifica automatica della correttezza semantica in tutti gli stati JDA.

```java
public class EventHandler extends ListenerAdapter {

    @Override
    public void onGuildVoiceUpdate(GuildVoiceUpdateEvent e) {
        Guild guild = e.getGuild();
        User self = e.getJDA().getSelfUser();
        User userJoined = e.getMember().getUser();
        

        AudioChannel channelJoined = e.getChannelJoined();
        AudioChannel channelLeft = e.getChannelLeft();
        AudioChannel connectChannel = guild.getAudioManager().getConnectedChannel();
        VoiceChannel afkChannel = guild.getAfkChannel();

        if(e.getMember().getId().equals(self.getId()) && channelJoined == null)
            Functions.handleBotLeave(guild);

        if (Functions.isBotAlone(connectChannel, channelLeft))
            Functions.handleBotLeave(guild);
        
        if (!App.isTesting() && channelJoined != null && (afkChannel != null && channelJoined.getIdLong() != afkChannel.getIdLong()) &&
            (connectChannel == null || channelJoined.getId().equals(connectChannel.getId())) && !userJoined.isBot()) {
            Functions.handleGreetSound(channelJoined, userJoined, guild);
        }
    }
}
```

**Perché l'utente lo considera un modello da imitare:**

1. **Contesto estratto subito:** `guild`, `self`, `userJoined`, `channelJoined`, `channelLeft`, `connectChannel`, `afkChannel`. Variabili locali tipizzate e semanticamente riconoscibili mostrano rapidamente tutto ciò che serve al flusso.
2. **Metodo evento come punto di coordinamento:** nello stesso metodo si vede chi ha effettuato l'azione, dove e quali scenari devono essere gestiti. Non occorre navigare un albero di service per ricostruire il flusso dell'evento.
3. **Condizioni esplicite con scopi distinti:** uscita del bot, bot rimasto solo, ingresso di un utente da salutare. La logica decisionale rimane leggibile nel listener.
4. **Azioni delegate a funzioni con un nome chiaro:** `handleBotLeave`, `isBotAlone`, `handleGreetSound`; il listener non reimplementa i dettagli del comando, del player o del database.
5. **Nessuna astrazione inventata solo per delegare:** non aggiungere un `VoiceEventOrchestrator`, tre service o nuovi wrapper se questo listener con funzioni già esistenti espone chiaramente la responsabilità.

**Come applicarlo altrove:** quando si gestiscono eventi, webhook, route o entrypoint simili, privilegiare una sequenza comprensibile `raccogli contesto → valuta casi → delega azioni`, se si adatta al codice e alla complessità reali. Questo principio non impone di centralizzare tutta la business logic nel listener né di copiare meccanicamente ogni condizione. In fase di modifica, verificare separatamente nullabilità, scenari sovrapposti, idempotenza e comportamenti runtime; non correggere o riscrivere l'esempio solo per ragioni di stile.
