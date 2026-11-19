# Fase 1 — Bug confermati e affidabilità

Ogni punto è stato verificato leggendo il codice il 2026-11-15, senza eseguirlo. Prima di intervenire rileggere i file: le righe possono essersi spostate dopo la fase 0.

## 1. Dettaglio di una guild diversa dal filtro (My sounds)

**Meccanismo**
- `/dashboard/me/sounds/guild/G1/S2/`, con S2 che appartiene a G2, restituisce 200.
- `src/routes/dashboard/me/sounds/(library)/layout.tsx:31` cerca il suono in tutti i gruppi.
- `select()` in `src/lib/sound-library.ts:109-113` lo cerca in `all` invece che in `entries` (chiamata alla riga 171).
- Risultato: la lista mostra G1, il dettaglio "Server: G2", la didascalia delle analytics "In G1".
- Ci si arriva tramite URL, bookmark e il redirect legacy `?guild=` (`layout.tsx:20-22`). Con la navigazione interna non succede.

**Fix**
- `sound-library.ts:171` → `select(entries, filter ? entries : all, soundId)`. Il ramo `missing` già presente (`src/components/sounds/sound-library.tsx:90-96`) mostra "Sound not found".
- `layout.tsx:31`: quando `guildId` è presente, controllare il suono nel gruppo di quella guild, riusando `groups`.
- `mySoundTitle` (`sound-library.ts:234-240`) deve rispettare lo stesso filtro.

**Verifica**: l'URL G1 con un suono di G2 dà 404 alla richiesta del documento e "Sound not found" nel modello; le URL corrette funzionano ancora.

## 2. Dirty azzerato per modifiche fatte durante il salvataggio

**Meccanismo**
- `dirty` è un booleano (`src/components/dashboard/save-dock.tsx:7`).
- `src/components/guild/settings-form.tsx:53-56` e `src/components/sounds/sound-editor.tsx:125-127` lo mettono a `false` a ogni risultato ok.
- Se l'utente modifica i campi mentre il salvataggio è in corso, all'arrivo della risposta il dock sparisce, il guard (`unsaved-guard.ts:10`) non avvisa più e compare "Changes saved", ma le modifiche nuove non sono salvate.

**Fix**
- In entrambi gli `onSubmitCompleted$`, azzerare `dirty` solo se `new FormData(form)` (il form arriva come secondo argomento) ha le stesse voci di `action.formData` (`ActionStore.formData`, `node_modules/@qwik.dev/router/lib/index.d.ts:134`).
- Un piccolo helper `sameFormData(a, b)` in `src/components/dashboard/`, usato dai due form.
- `SaveDock` resta com'è. Gli input nascosti `tags[]` fanno parte del form, quindi anche i tag sono coperti.

**Verifica**: si salva, durante l'invio si modifica un campo, la risposta arriva → il dock resta visibile e il guard continua ad avvisare.

## 3. Cache suoni obsoleta dopo il salvataggio

**Meccanismo**
- `useMySounds` e `useGuildSoundLibrary` (`src/lib/sound-loaders.ts:11,24`) hanno `cacheControl: { private: true, maxAge: 300 }`.
- Il JSON del loader ha un solo URL per ogni libreria.
- `useUpdateSound` e `useDeleteSound` (`src/routes/dashboard/me/sounds/[soundId]/edit/index.tsx:42,49`) non invalidano niente. Non potrebbero comunque: l'edit è fuori da `(library)`, e in rc.5 si invalidano solo i loader montati.
- Indietro/Avanti, il link "Sounds" dell'header e il prefetch mostrano quindi fino a 5 minuti di dati vecchi.

**Fix (scelto dall'utente)**
- Togliere `maxAge: 300` solo da `useMySounds` e `useGuildSoundLibrary`, che tornano al default `private, no-cache`. Le analytics restano a 300.
- Tenere i link `<a>` di reload dell'editor.
- Aggiornare il README (righe ~74-77, 108, 125) e `docs/claude-navigation-loading.md` (~358-359).

**Verifica**: si modifica un suono, poi Indietro o "Sounds" dell'header → il dato è aggiornato. Muoversi tra i suoni dentro la libreria non rifà la richiesta.

## 4. Comandi: ricerca e filtro per tipo non si combinano

- `src/routes/(site)/commands/index.tsx:26-49` calcola le voci visibili senza considerare il radio "kind". Il CSS (`commands.css:308-329`) nasconde per tipo in modo separato.
- Con "Prefix" più una ricerca che trova solo comandi slash, l'empty state non compare e restano sezioni vuote.
- **Fix**: il filtro JS considera anche il tipo selezionato.
- **Verifica**: "Prefix" più una ricerca che trova solo comandi slash → empty state visibile e nessuna sezione con il solo titolo.

## 5. Moltiplicatore XP vuoto diventa 0

- `src/lib/settings.ts:84`: `Number('')` vale `0` e passa la validazione.
- **Fix**: rifiutare la stringa vuota prima di `Number()` con `SettingsInputError`.
- **Verifica**: un moltiplicatore vuoto viene rifiutato con l'errore sul campo; `0` esplicito resta valido. Aggiornare `tests/settings.test.mjs`.

## 6. Experience: valori di default rimandati come salvati

- `settings.ts:79-92` rimanda `statisticsEnabled` e `leagueShard` presi dal JSON nascosto `orig:`. Quel JSON è generato da `DEFAULT_CHANNEL_SETTINGS` in `experience-settings.tsx:43,49`, senza validazione.
- **Fix**:
  - prima verificare nel repo Beebot (`docs/api/beebot-guilds.md`) se il POST accetta campi parziali per canale; in quel caso, inviare solo i campi XP modificati;
  - altrimenti validare `leagueShard` con `LEAGUE_SHARDS` e `statisticsEnabled` come booleano.
- **Verifica**: un `orig:` manomesso o con uno shard non valido viene rifiutato; salvare solo l'XP non cambia statistiche e shard salvati.

## 7. Errori di rete non gestiti

- `src/components/sounds/vote-buttons.tsx:20`: `await action.submit()` senza try/catch.
- `src/components/sounds/greet-picker.tsx:34`: come sopra, e in più la checkbox resta invertita.
- `sound-editor.tsx:39`: `search.submit` dentro un `setTimeout` può lasciare una rejection non gestita.
- **Fix**: try/catch che ripristina lo stato e mostra un messaggio con il toast esistente.
- **Verifica**: con la rete offline (DevTools), voto e greet tornano allo stato precedente e mostrano il messaggio; nessuna rejection non gestita in console.

## 8. Audio scaricato all'ingresso della libreria

- `src/components/sounds/sound-wave.tsx:56-68`: `useVisibleTask$` scarica e decodifica l'intero file.
- `SoundDetail` lo monta subito e `select()` sceglie il primo suono, quindi ogni ingresso nella libreria scarica un audio.
- **Fix**: avviare `readPeaks` solo dopo il primo play (tracciando `playing`), con l'onda sintetica `SYNTH` finché i picchi non ci sono. `async/await` al posto di `.then`.
- **Verifica**: nel pannello Rete nessuna richiesta audio entrando nella libreria o cambiando suono, finché non si preme play.

## 9. Audio dell'editor

- `sound-editor.tsx:328-335`: `src={sound.url}` viene impostato già al render. Mancano `onPause$` e `onError$`: dopo un errore `playing` resta `true`.
- **Fix**: impostare `src` in `togglePlay` e aggiungere i due eventi.
- **Verifica**: nessuna richiesta audio prima del play nell'editor; dopo un errore o una pausa il pulsante torna a "play".

## 10. Filtri Mine/Others con conteggio 0

- `src/components/sounds/sound-list.tsx:151-165`: restano cliccabili anche con conteggio 0.
- **Fix**: `disabled` quando `model.ownerCounts[owner]` vale 0.
- **Verifica**: un filtro senza suoni è visibile ma disabilitato; "All" resta sempre attivo.

## 11. Errore silenziato nel layout della guild

- `src/routes/dashboard/[guildId]/layout.tsx:34` cattura qualsiasi errore e perde il campo di `SettingsInputError`.
- **Fix**: catturare solo `SettingsInputError`, conservando il campo, e rilanciare tutto il resto.
- **Verifica**: un input non valido indica il campo giusto; un errore inatteso non viene trasformato in errore di input.

## Da verificare prima di intervenire (incerti)

- `GreetPicker` offre tutte le guild anche per i suoni privati, che secondo l'hint dell'editor "restano nel loro server". La disponibilità andrebbe ricavata da `public`/`guildId`: verificare prima il contratto.
- In `general-settings.tsx:51` l'opzione "Not set" sparisce dopo aver scelto una regione. Chiedere all'utente se tornare al valore vuoto deve essere possibile.
- Il reset non funziona allo stesso modo ovunque: le impostazioni rimontano il form tramite `key`, l'editor dei suoni rimette a mano i signal (`sound-editor.tsx:56-62`). Valutare se usare un solo meccanismo dopo il fix del punto 2.

## Verifica della fase

Le verifiche comuni del README, più gli scenari di verifica indicati sotto ogni punto. Per i punti 1-3 usare anche `nav-reviewer`, perché toccano libreria, cache e dirty guard.
