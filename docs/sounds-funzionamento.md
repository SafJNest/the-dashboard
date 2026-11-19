# Suoni — funzionamento delle pagine

Input per progettare le API dei suoni. Descrive **cosa succede** in ogni pagina: cosa si vede, cosa si filtra, cosa si può fare, chi può farlo e quali contatori cambiano. **Non** definisce endpoint, payload o tabelle: quelli vanno progettati partendo da qui, riusando ciò che esiste già (sezione "Cosa esiste già").

Fonte visiva: canvas "Beebot Dashboard", sezioni **Audio — sounds, search & creators** e **Audio — components** (tavole `ServerSounds`, `Sounds`, `SoundEditor`, `Explore*`, `SoundProfile`, `SoundPanel`, `SoundComments`, `SoundThumbs`). Regole generali: `AGENTS.md`.

## 1. Concetti comuni

### Ruoli

- **Ospite**: non loggato. Solo sulle pagine pubbliche (Explore, pannello suono, profilo creatore). Vede, cerca e ascolta; non interagisce.
- **Utente**: loggato con Discord.
- **Uploader**: l'utente che ha caricato il suono.
- **Admin della guild**: chi può aprire la dashboard di quella guild.

### Il suono

Un suono ha: id, nome (max 32), immagine opzionale (nuova, come la thumbnail delle soundboard), fino a 5 tag, visibilità pubblico/privato, guild in cui è stato caricato, uploader, durata, data di caricamento, file audio.

Numeri del suono: play, ascoltatori unici, like, dislike, commenti, visualizzazioni (nuove, vedi §4).

Stato rispetto a chi guarda: like/dislike messo da me, miei play, è mio, posso modificarlo, posso eliminarlo, è nelle mie soundboard, è il mio greet (e dove).

### Visibilità

- **Pubblico**: compare in Explore, nel profilo creatore, nei suggerimenti; chiunque lo apre via link, anche da ospite.
- **Privato**: lo vede solo l'uploader (I miei suoni, editor). Non compare in Explore né nel profilo pubblico; un link diretto a un suono privato si comporta come "non trovato" per tutti tranne l'uploader.
- Nella pagina Sounds della guild: da decidere se un admin vede i privati dei membri (§12).

### Periodi

Le analytics della dashboard hanno periodo 7d / 30d / 90d / tutto. La scelta viaggia nel cookie `beebot_period` (già così). Le pagine pubbliche mostrano solo totali "da sempre".

### URL

Solo gli identificativi vanno nel path (regola di `AGENTS.md`): suono, guild, utente. Esempi di forma, non definitivi: dominio pubblico separato (es. `sounds.<dominio>`), `/sounds/{soundId}` apre la ricerca con quel suono nel pannello, `/u/{userId}` è il profilo creatore. Testo cercato, filtri e ordinamento sono stato della vista.

## 2. Dashboard — Sounds della guild

Percorso: Server › Sounds. Accesso: admin della guild.

**Vede**

- Fascia riassuntiva del periodo: play (con variazione rispetto al periodo precedente), ascoltatori unici, like totali, miei play.
- Lista di tutti i suoni caricati in questa guild: immagine, nome, uploader, durata, like, play del periodo. Etichetta "Yours" sui miei.
- Dettaglio del suono selezionato al centro: immagine, nome, waveform, uploader (link al profilo pubblico), guild, durata, data, visibilità, tag, like/dislike.
- Analytics del suono, tab **Everyone**: play, ascoltatori, media per ascoltatore, like, dislike, play per giorno, heatmap ora×giorno, modalità di riproduzione (soundboard / comando / greet), distribuzione dei replay, chi lo riproduce (§12).
- Tab **Your plays** (solo mia): miei play, posizione rispetto agli altri, ultimo play, modalità più usata, cronologia paginata (quando, server, canale vocale, modalità).
- Panoramica della guild: play nel tempo, top suoni per play, più apprezzati, chi riproduce di più.

**Filtra e ordina**

- Ricerca per nome o tag.
- Uploader: Tutti / Miei / Altri, con conteggi.
- Ordinamento: più riprodotti (predefinito), più apprezzati, nome.
- Periodo: cambia solo i numeri, non l'elenco.

**Può fare**

- Like / dislike (toggle, esclusivi: mettere like toglie il dislike).
- Ascoltare l'anteprima nel browser.
- Copiare il comando `/play {id}` (solo client).
- Aggiungere a una soundboard (§7).
- Impostare come greet: globale o per server, multi-selezione (§7).
- Scaricare il file.
- Se è suo: aprire l'editor. Se è pubblico: aprire la pagina pubblica.

**Effetti**: anteprima nel browser → §4 (play web). Aprire il dettaglio nella dashboard **non** conta come visualizzazione.

## 3. Dashboard — I miei suoni

Percorso: header › Sounds, oppure Profile › My sounds. Accesso: utente.

Come la pagina della guild, con queste differenze:

- La lista contiene solo i miei suoni, di tutte le guild, pubblici e privati.
- Selettore guild al posto del filtro uploader: "Tutte" o una guild, con numero di suoni. Mostra solo le guild che hanno miei suoni, senza caricare dati amministrativi della guild.
- I numeri sono di tutti i server, oppure solo della guild scelta.
- Analytics in più: "dove viene riprodotto" (ripartizione per server) quando è selezionato "Tutte".
- Pulsante Upload verso l'editor.

## 4. Contatori ed eventi

| Evento | Dove | Effetto |
|---|---|---|
| Play da Discord (soundboard, `/play`, greet) | bot | +1 play, aggiorna ascoltatori, modalità, heatmap, cronologia dell'utente. Esiste già. |
| Anteprima nel browser (premere play) | dashboard, Explore, profilo creatore, suggerimenti | Da decidere se conta e come (§12). Proposta: modalità separata "web", non mescolata ai play Discord. Mai da ospite senza deduplica. |
| Apertura del suono | pannello in Explore o profilo creatore, link diretto `/sounds/{id}` | +1 visualizzazione, deduplicata per spettatore (utente o ospite anonimo) e finestra di tempo. Non contano l'uploader, la dashboard, i bot. |
| Like / dislike | ovunque ci sia il pulsante | toggle, esclusivi; aggiorna i totali e "messo da me". Solo utente. |
| Commento / risposta | pannello suono | +1 commenti sul suono. |
| Like a un commento | commenti | contatore del commento. |
| Aggiunta a soundboard | pannello, dettaglio dashboard | il suono entra nella soundboard (max 25). |
| Greet | pannello, dettaglio, editor, profilo | imposta/toglie il greet globale o per server. |
| Copia comando, condividi link | pannello | nessun effetto lato server. |

I totali pubblici (play, like, visualizzazioni) devono essere coerenti tra Explore, pannello, profilo creatore e dashboard.

## 5. Explore (pubblico)

Accesso: chiunque. Header pubblico: da ospite "Log in" e "Add to Discord", da utente "Dashboard" e avatar.

### 5.1 Inizio

- Campo di ricerca grande.
- Tag popolari (i più usati tra i suoni pubblici): cliccando si apre l'elenco filtrato per quel tag.
- **Trending this week**: suoni pubblici con più attività negli ultimi 7 giorni (criterio da definire: play, like, visualizzazioni).
- **Just added**: ultimi suoni pubblici caricati.
- Play su un elemento: apre l'elenco con quel suono nel pannello e parte l'anteprima.

### 5.2 Suggerimenti mentre si scrive

- Partono dopo pochi caratteri, con debounce; si applica solo l'ultima risposta.
- Fino a **5 suoni** per nome (prima chi inizia col testo, poi per popolarità) con immagine, nome evidenziato, avatar e nome uploader, guild, durata.
- Fino a **3 tag** che contengono il testo, con numero di suoni.
- **Niente utenti** nei suggerimenti.
- Click o play su un suono: esegue la ricerca e apre il pannello di quel suono (play avvia anche l'anteprima).
- Click su un tag: elenco filtrato per tag.
- Invio: elenco completo dei risultati.
- `#testo` cerca per tag.

### 5.3 Risultati

- Il campo sale in una barra fissa; sotto, i filtri.
- Ricerca su nome e tag, solo suoni pubblici.
- Ogni risultato: immagine, nome evidenziato, uploader, guild, primi tag, durata, play, like, numero commenti.
- Filtri: tag (scelti tra quelli presenti nei risultati, con conteggio), lunghezza (qualsiasi / breve / lunga).
- Ordinamento: rilevanza (predefinito), più riprodotti, più apprezzati, più recenti.
- Paginazione "Load more", ordine stabile tra le pagine.
- Click su un risultato: pannello a destra (§6) senza lasciare la ricerca. Frecce su/giù passano al risultato precedente/successivo.
- Nessun risultato: stato vuoto con "Clear filters".

### 5.4 Ospite

Vede, cerca e ascolta tutto. Like, dislike, soundboard, greet, commento, risposta e like ai commenti aprono un invito "Log in with Discord". Dopo il login torna allo stesso suono e alla stessa ricerca; l'azione non viene eseguita da sola.

## 6. Pannello del suono

Usato in Explore e nel profilo creatore. Stesso contenuto da link diretto.

**Vede**: immagine, nome, uploader (link al profilo creatore) con numero di suoni pubblici, guild di caricamento, data, player con waveform e durata, like/dislike, play, ascoltatori, percentuale di like, tag (link alla ricerca per tag), commenti.

**Può fare (utente)**

- Like / dislike.
- Copiare `/play {id}`.
- Condividere il link.
- Aggiungere/togliere da una o più delle **mie** soundboard. Mostra il riempimento di ognuna (n/25); quelle piene sono disabilitate se il suono non c'è già; link "New soundboard".
- Impostare come greet: Everywhere (globale) e/o uno o più server. Per ogni voce mostra il greet attuale.
- Commentare (§8).

Riprodurre il suono in un server dal web: **non previsto**.

**Effetti**: aprirlo conta una visualizzazione (§4).

## 7. Soundboard e greet dal suono

- Soundboard: solo quelle dell'utente o delle guild in cui può modificarle (stessa regola della pagina soundboard). Max 25 suoni. Un suono privato si può aggiungere solo alle proprie.
- Greet: un greet globale e uno per server; quello del server vince sul globale. Impostarne uno nuovo sostituisce il precedente in quel posto.

## 8. Commenti

Stile YouTube, sotto il pannello del suono.

- Lettura per tutti, ospiti inclusi.
- Ordinamento: **Top** (fissato prima, poi più like) e **Newest**.
- Thread: risposta a un commento e risposta alla risposta. Si mostrano tre livelli; oltre, "Continue this thread" apre il resto.
- Risposte chiuse di default con "N replies", caricate all'apertura.
- Ogni commento: autore (link al profilo), etichetta Uploader se è l'uploader, etichetta You se è mio, tempo relativo, testo, like, dislike, Reply.
- Like/dislike al commento: toggle, esclusivi. Il dislike non mostra un numero.
- L'uploader può **fissare** un commento ("Pinned by …", uno per suono) e mettere il **cuore** a un commento.
- L'autore può modificare ed eliminare i propri. Eliminare un commento con risposte: da decidere se resta "commento eliminato" (§12).
- Paginazione "Show more comments"; il totale include le risposte.
- Ospite: al posto del campo, invito al login. Like e Reply aprono l'invito.

## 9. Profilo creatore (pubblico)

Percorso: nome dell'uploader ovunque (dashboard, pannello, commenti). Accesso: chiunque.

- Avatar, nome, "uploading since", server più attivo.
- Numeri: suoni pubblici, play totali, like ricevuti (con percentuale di like), commenti ricevuti.
- Tag più usati, con conteggio, link alla ricerca.
- Elenco dei suoi suoni pubblici con ricerca interna e ordinamento (più riprodotti, più apprezzati, più recenti); click apre lo stesso pannello.
- Solo suoni pubblici: i privati non contano nei numeri pubblici.
- Se è il mio profilo: "Manage in dashboard".
- Pulsante "Share profile".

## 10. Editor del suono

Esiste già; si aggiunge l'**immagine**.

- Immagine: carica, sostituisci, rimuovi. PNG, JPG o GIF, ritaglio quadrato. Senza immagine si mostra il riquadro neutro con waveform.
- Il resto invariato: nome, visibilità, tag (max 5 con suggerimenti), greet, scarica, elimina.
- Passare un suono da pubblico a privato lo toglie subito da Explore, profilo creatore e suggerimenti.

## 11. Cosa esiste già

Dal frontend attuale (`src/lib/beebot/endpoints.ts`, `src/lib/sounds.ts`), da verificare sul backend prima di riusarlo:

- Libreria e analytics della guild, libreria e analytics dei miei suoni, dettaglio e analytics del suono, voto like/dislike, elenco tag, settings utente (greet).
- Il modello `Sound` ha già: uploader con avatar, visibilità, tag, play, ascoltatori, like, dislike, miei play, flag "mio" e permessi.
- Le analytics hanno già: play per giorno, heatmap, sorgenti, distribuzione replay, cronologia personale paginata, play per utente (`users`).

Mancano, per quanto visto nel frontend:

- ricerca pubblica con suggerimenti
- dettaglio del suono senza sessione
- profilo pubblico di un utente
- commenti
- visualizzazioni
- immagine del suono
- nome e icona della guild sul suono
- aggiunta a soundboard dal suono
- trending e "just added"

## 12. Decisioni aperte

1. **Chi riproduce i suoni nella guild**: le API restituiscono già i play per utente (`users`), ma il testo del design dice "Beebot never shows who played a sound". Mostrarlo agli admin della guild? Allineare poi il testo.
2. **Play dal browser**: contano come play? In una modalità "web" separata? Contano da ospite?
3. **Visualizzazioni**: finestra di deduplica, identificazione degli ospiti, se mostrarle in pubblico o solo all'uploader e in dashboard.
4. **Guild in pubblico**: nome e icona della guild di caricamento visibili a tutti (rivela dove sta l'uploader)?
5. **Privati dei membri**: un admin della guild li vede nella pagina Sounds della guild?
6. **Trending**: criterio e finestra.
7. **Commenti**: eliminazione con risposte, moderazione (segnalazione, chi può eliminare commenti altrui: uploader? admin?), limiti di lunghezza e frequenza, mention `@utente`.
8. **Testo cercato nell'URL**: per condividere una ricerca servirebbe; `AGENTS.md` oggi tiene filtri e ricerca fuori dall'URL.
