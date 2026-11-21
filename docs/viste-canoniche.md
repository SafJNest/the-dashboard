# Viste canoniche: Explore, server, profilo

Stato: design approvato sul canvas, nulla implementato. Sostituisce le parti in conflitto di `docs/sounds-funzionamento.md` e `docs/collegamenti-e-azioni.md`; per il resto valgono quei documenti, `docs/rifiniture-ui.md` e `AGENTS.md`.

- Canvas: "Beebot Dashboard" (https://claude.ai/artifact/Mcs4sywB2F74ig4BfXqUpP). Le tavole vecchie restano in fondo, in fila, col prefisso "Previous", solo per confronto.
- Prima di implementare, verificare ogni contratto sulla documentazione API attuale. Il §12 elenca cosa serve: un campo che l'API non espone non si inventa; la funzione resta in UI come "Coming soon" e si segnala.

## 1. Obiettivo

Oggi suoni, suoni della guild, soundboard e ricerca sembrano schermate scollegate: la stessa entità ha interfacce diverse e le responsabilità sono mescolate (analytics ed edit nella pagina del server, suoni della guild nel profilo, pagina edit separata).

Regola: **un'entità, un aspetto. Il contesto cambia solo cosa puoi fare.**

| | Explore (pubblico) | Server (dashboard) | Profilo (dashboard) |
|---|---|---|---|
| Responsabilità | trovare e ascoltare | vedere cosa c'è nel server | gestire ciò che ho pubblicato |
| Cosa mostra | tutto ciò che è pubblico: suoni e soundboard | suoni e soundboard disponibili nel server | i miei suoni e le mie soundboard, pubblici e privati |
| Azioni sul suono | play, like/dislike, commenti, copia comando, add to soundboard, greet | play, copia comando, add to soundboard, greet | tutto, più modifica inline |
| Azioni sulla soundboard | suonarla da tastiera, like, commenti, copia comando, salva una copia | suonarla, copia comando, salva una copia | modifica: nome, visibilità, tasti, post nel canale, elimina |
| Statistiche | contatori pubblici | solo aggregate del server | complete, per elemento |
| Modifica | link "Manage in My sounds/soundboards" se è mio | link "Edit in My …" se è mio | qui |

L'admin del server **non** può modificare suoni o board altrui. In futuro potrà nascondere o vietare suoni nel suo server: oggi non esiste, nessun controllo in UI.

## 2. Mappa delle route

Solo ID di entità nel path; filtri, ordinamenti, tipo, query e pannelli aperti sono stato locale (regola AGENTS). Sottodominio `sounds.` come oggi (in locale sotto `/sounds`).

### Pubblico (sito sounds)
| Route | Contenuto | Tavola |
|---|---|---|
| `/` | Explore inizio | Explore · start |
| `/` con query (stato locale) | risultati misti | Explore · results |
| `/{soundId}/` | risultati con pannello suono | Explore · results, sound open |
| `/board/{boardId}/` | pannello soundboard (con il pannello aperto l'hero lascia il posto alla sola barra di ricerca) | Explore · results, soundboard open |
| `/u/{userId}/` | creatore, tab Sounds | Creator profile |
| `/u/{userId}/boards/` | creatore, tab Soundboards | Creator profile |
| `/u/{userId}/{soundId}/`, `/u/{userId}/board/{boardId}/` | creatore con pannello | Creator profile |

Canoniche: `/{soundId}/` per il suono, `/board/{boardId}/` per la soundboard, `/u/{userId}/` per il creatore. Le URL di contesto dichiarano la canonica.

### Server
| Route | Contenuto | Tavola |
|---|---|---|
| `/dashboard/{guildId}/sounds/` (+ `{soundId}/`) | suoni disponibili, sola visione | Sounds · server |
| `/dashboard/{guildId}/soundboards/` (+ `{boardId}/`) | soundboard del server, sola visione e suonabili | Soundboards · server |

Da rimuovere: `/dashboard/{guildId}/sounds/{soundId}/edit/`.

### Profilo
| Route | Contenuto | Tavola |
|---|---|---|
| `/dashboard/me/` | Overview (greet, account collegati) | Profile |
| `/dashboard/me/sounds/` (+ `{soundId}/`) | i miei suoni, modifica inline | My sounds · profile |
| `/dashboard/me/sounds/upload/` | carica un suono nuovo | Upload a sound |
| `/dashboard/me/soundboards/` (+ `{boardId}/`) | le mie soundboard, tasti in modifica | My soundboards · profile |
| `/dashboard/me/soundboards/{boardId}/add/{soundId}/` | board aperta con il suono da piazzare | My soundboards (stato "Placing") |
| playlists | invariato | Playlists |

Da rimuovere: `/dashboard/me/sounds/{soundId}/edit/` (redirect a `/dashboard/me/sounds/{soundId}/`) e `/dashboard/me/sounds/guild/{guildId}/…` (è il lavoro della pagina del server).

## 3. Header

### 3.1 AppHeader (dashboard)
- **Prima riga**: Beebot · nav `Servers` | `Your profile` · a destra "Explore sounds" (quick search) e il menu account. Sounds, Soundboards e Playlists escono dalla nav principale.
- **Riga di contesto server** (invariata): crumb "All servers / {server}" e tab Settings, Leaderboard, Soundboards, Sounds.
- **Riga di contesto profilo** (nuova): avatar e "Sunyx · Your sounds, boards and settings", tab Overview, My sounds, My soundboards, Playlists. Compare su tutte le pagine del profilo.

### 3.2 Quick search ("Explore sounds")
Non è più un link: apre un popover sotto il pulsante.
- Campo con focus automatico; `Esc` o clic fuori chiude.
- Campo vuoto: "Jump back in" (ultimi 3 elementi aperti, suoni o board) e tag popolari.
- Digitando: fino a 4 suoni, 2 soundboard, 3 tag, con la parte cercata evidenziata.
- Clic su un risultato: pagina di quell'elemento sul sito sounds (`/{soundId}/`, `/board/{boardId}/`, ricerca per tag).
- `Invio`: Explore con la query (riga finale "See all results for …"). A campo vuoto la riga finale è "Open Explore".
- Stessa fonte dei suggerimenti di Explore (§12).

### 3.3 Menu account (clic su avatar e nome)
Sia in AppHeader sia nel SiteHeader quando si è loggati.
- In testa: avatar, nome, "Signed in with Discord".
- Link: (solo SiteHeader) Dashboard, Your profile, My sounds, My soundboards, Playlists.
- Greet attuale (link all'Overview), tema Dark/Light, "Commands and help".
- Log out (rosso) su `/auth/logout/`.
- Il selettore del tema è solo visivo finché i temi non sono implementati.

## 4. Explore (pubblico)

Layout largo: stesso spacing laterale dell'header (`--bb-gutter`), niente container centrato. Hero allineato a sinistra.

### 4.1 Inizio
1. Hero: eyebrow, titolo, testo ("Search every public sound and soundboard…"), campo di ricerca, tag popolari.
2. **Trending sounds**: griglia di tile, "See all" apre i risultati filtrati su Sounds.
3. **Soundboards to play**: tile soundboard (§4.4), "See all" apre i risultati filtrati su Soundboards.
4. **Just added**: righe compatte in griglia (2 colonne su desktop).

### 4.2 Suggerimenti
5 suoni, 2 soundboard, 3 tag; nessun utente. Il play su un suggerimento apre i risultati con il pannello e avvia l'audio. Footer: `↵` per tutti i risultati.

### 4.3 Risultati
- Barra sticky: campo compatto, **tipo** `All / Sounds / Soundboards` con conteggi, tag cliccabili (riga orizzontale scrollabile), lunghezza `Any / Short / Long` (disabilitata con tipo Soundboards, si applica solo ai suoni).
- Riga sopra la lista: "N results for “q”" e ordinamento `Relevance / Most played / Most liked / Newest`.
- **Un solo elenco** ordinato per rilevanza, suoni e soundboard mescolati. **Niente sezione "Your sounds"**: i miei elementi sono nell'elenco come gli altri, con uploader "You" in accento.
- Senza pannello: griglia di righe (2 colonne su desktop). Con pannello: lista 30% come colonna laterale sticky con scroll proprio (le tile diventano righe compatte), pannello 70% nel flusso della pagina, senza altezza massima né scroll interno: la pagina ha un solo scroll. Sotto 1080px, con un elemento aperto, la lista si nasconde e la X del pannello fa da "indietro".
- Scrollbar: ovunque sottili e gialle (`--bb-scrollbar`), `scrollbar-gutter: stable` sulla pagina. Su Windows e Linux la scrollbar nativa occupa comunque qualche pixel.
- Barra del pannello: tipo ("Sound" / "Soundboard" con icona), precedente, successivo, chiudi.
- Ospite: si ascolta e si suona; like, commento, greet, add to soundboard e salva copia aprono il gate di login.

### 4.4 Come si distinguono suono e soundboard
- **Riga suono** (compatta, ~64px): play, thumbnail, nome; sotto "uploader · #tag #tag" su una riga sola (tag come testo, non badge); a destra durata (cifre tabulari, non mono), play count, like.
- **Miniatura soundboard**: stessa forma della miniatura dei suoni (quadrata, `object-fit: cover`): l'immagine della board, altrimenti l'icona soundboard. Niente mosaico di colori, niente iniziali.
- **Riga soundboard** (~84px), senza pulsante play:
  - miniatura;
  - nome; sotto "Soundboard · uploader · N sounds";
  - mini mappa dei tasti: tre file di puntini (10/9/7) con i tasti occupati in accento;
  - play count e like.
  Sotto ~460px di larghezza della lista la mappa e i numeri secondari spariscono.
- **Tile soundboard** (home): stessa struttura e misure della tile suono: miniatura quadrata, nome, "Soundboard · N sounds" con icona, "N plays · N likes".

## 5. Pannello suono (un componente, tre modalità)

Stesso aspetto ovunque, sempre su una colonna, in ordine di priorità: testa (immagine, nome, autore, "Uploaded in {server} · data"), player, riga di azioni (like/dislike, Add to soundboard, Greet, link, copia `/play`, Manage/Edit), descrizione, facts (plays, listeners, % like) e tag, blocchi owner (su due colonne di campi quando c'è spazio), commenti in fondo al 100%.

| Blocco | public (Explore, creatore) | server | owner (My sounds) |
|---|---|---|---|
| Testa | thumbnail, nome, uploader (link creatore), "Uploaded in {server} · data" | uguale | nome modificabile (max 32), "Private" se privato |
| Player | play e onda | uguale | uguale |
| Like/dislike | sì | no | no |
| Copia comando `/play {id}`, link | sì | sì | sì |
| Add to soundboard | sì (§9) | sì | sì |
| Greet | sì | sì | sì |
| Link | "Manage in My sounds" se è mio | "Edit in My sounds" se è mio | "Public page" se pubblico |
| Facts (plays, listeners, durata, % like) e tag | sì | no | — |
| Modifica | — | — | immagine (sostituisci/rimuovi), visibilità Public/Private con spiegazione, tag (max 5, `Invio` per aggiungere), download, elimina |
| Statistiche | — | — | "How it's doing": plays, listeners, like, "on soundboards", barre degli ultimi 14 giorni. Le vede solo l'owner |
| Commenti | sì | no | sì se pubblico (moderazione dell'owner) |
| Salvataggio | — | — | SaveDock "Unsaved changes": Discard / Save changes |

**La pagina edit sparisce**: si modifica dove si apre il suono. Resta solo la pagina di **upload** (`/dashboard/me/sounds/upload/`, tavola "Upload a sound") con file, dettagli e regole; un rimando dice che le modifiche si fanno in My sounds.

## 6. Pannello soundboard (un componente, tre modalità)

- **Struttura**: una colonna sola. In alto testa e azioni sulla stessa riga, subito sotto la **tastiera a tutta larghezza** (è il contenuto principale), poi i commenti. Niente colonna info a sinistra e commenti a destra.
- **Testa**: miniatura, "Soundboard", nome (owner: input, max 40), riga "uploader (link creatore) · N of 25 keys", badge "Private" solo se privata.
- **Azioni** (a destra della testa, vanno a capo se manca spazio): like, copia comando, copia link, "Save a copy" o "Manage".
- **public**: like/dislike, copia `/soundboard play {id}`, link, "Save a copy" (se non è mia), "Manage" verso My soundboards (se è mia); tastiera; commenti (stesso componente dei commenti dei suoni; senza commenti l'ordinamento non compare).
- **server**: copia comando, "Public page" se pubblica, "Edit in My soundboards" se è mia, altrimenti "Save a copy"; tastiera. Niente like né commenti.
- **owner**: ordine testa, callout "Placing", tastiera, "Add sounds", poi impostazioni:
  - visibilità Public/Private. Private: solo l'owner, **nessun link**, non indicizzata, non in ricerca;
  - "Post to a channel" / "Post again" (messaggio 5×5 in Discord) e copia comando;
  - statistiche: plays 30 giorni, like, commenti, copie salvate;
  - "Public page" se pubblica; elimina;
  - tastiera in modalità modifica;
  - "Add sounds": i miei suoni e quelli a cui ho messo like, con ricerca. "Add" mette il suono sul primo tasto libero, poi mostra "On {lettera}"; con la board piena il pulsante è "Full" disabilitato.

## 7. Tastiera della soundboard

Componente unico, usato in public, server e owner. Tavole: "Component · soundboard keys" e "Soundboard keys · 7, 10, 12, 15, 23, 25 sounds", entrambe suonabili.

### 7.1 Mappa
- Tre file sfalsate come una tastiera vera: `Q W E R T Y U I O P` · `A S D F G H J K L` · `Z X C V B N M`. Sfalsamento: seconda fila +0,25 tasto, terza +0,75.
- Gli slot 1–25 seguono l'ordine di lettura (Q→P, A→L, Z→N), lo stesso dei bottoni Discord 5×5.
- **M non contiene mai un suono**: è "Stop all".
- Tasti vuoti: in play restano visibili, tratteggiati e tenui, perché la tastiera mantenga la forma; in modifica diventano "+ Add sound".
- Tasti con `event.code` (posizione fisica, funziona con AZERTY e QWERTZ). Etichette: `navigator.keyboard.getLayoutMap()` dove esiste (Chromium), altrimenti le lettere QWERTY.

### 7.2 Comportamento
- La tastiera ascolta i tasti **finché la board è aperta**, senza clic preliminare (listener su `document` montati con il componente e rimossi con lui). I tasti si ignorano mentre si scrive in un campo (input, textarea, select, contenteditable). Sotto la tastiera: "Press Q to N on your keyboard, or click a key. M or Esc stops everything".
- Mouse e touch: pointerdown suona, pointerup rilascia. I tasti sono `button` veri, con `aria-keyshortcuts`; la tastiera ha un `aria-label` con il numero di suoni.
- **Overlap** (switch, acceso di default): acceso, i suoni si sommano; spento, un tasto nuovo sfuma (~80ms) quello che suona.
- **Hold to play** (switch, spento di default): come un pianoforte, il suono si ferma (fade ~120ms) quando si lascia il tasto. Tenendo **Shift** i suoni continuano dopo il rilascio; lasciando Shift si fermano quelli il cui tasto non è premuto.
- **Stop**: `Esc`, il tasto M o il pulsante "Stop all", con fade di ~100ms.
- `repeat` del tasto ignorato; Ctrl/Cmd/Alt non suonano.
- Quando la finestra perde il focus si azzerano i tasti premuti e Shift; con Hold attivo si ferma tutto.
- Audio: mai nelle liste. I buffer si decodificano al primo passaggio del puntatore sulla tastiera o al primo tasto (Web Audio con buffer decodificati), non al solo caricamento della pagina.

### 7.3 Aspetto
- Tasto: solo lettera (keycap mono in alto a sinistra) e nome del suono su due righe in basso. Niente immagine né quadratino colorato. Bordo inferiore spesso (effetto tasto). Tutti i tasti (pieni, vuoti, Stop) hanno la stessa altezza: 4,25rem, 4,75rem quando la tastiera è larga almeno 50rem.
- Tasti vuoti: bordo e keycap tratteggiati, testo tenue, senza trasparenza.
- La tastiera sta in un riquadro proprio (fondo inset, bordo, raggio box) con la barra di stato in alto.
- Pressione: scende di 2px e il bordo si riduce. In riproduzione: bordo e fondo in accento tenue, keycap pieno in accento, barra di avanzamento in basso.
- Sostenuto con Shift: contorno tratteggiato. Ogni pressione riparte con una breve animazione di scala.
- Barra sopra: equalizzatore animato e "Playing {nome} + N more" o "Ready · N sounds on the keys", gli switch e Stop all.
- Niente glow; `prefers-reduced-motion` disattiva le animazioni.
- Sotto ~600px di larghezza: griglia 5×5 di pad, senza i tasti vuoti.

### 7.4 Modifica (owner)
- Clic su un tasto pieno lo seleziona; clic su un altro li scambia; clic su un vuoto con selezione attiva ci sposta il suono.
- "×" sul tasto rimuove il suono.
- "+" su un vuoto apre/aggiunge dalla libreria.
- Le lettere continuano a far sentire l'anteprima.

### 7.5 Arrivo da "Add to soundboard"
Su `/dashboard/me/soundboards/{boardId}/add/{soundId}/`: callout "Placing {suono}. Click an empty key or press its letter" con Cancel. I tasti vuoti sono evidenziati come "Place here". Piazzato il suono, il callout sparisce e si torna alla URL della board.

## 8. Server (sola visione)

### 8.1 Sounds
- Testa: "{Server} · N sounds", titolo "Sounds", testo che rimanda al profilo per gestire i propri; link "Manage my sounds".
- Striscia di 4 dati semplici: plays 7 giorni (con variazione), suoni nel server, suono più riprodotto, uploader più attivo.
- "Most played this week": top 5 con play, nome, uploader, barra e conteggio.
- Strumenti: ricerca (nome o #tag), filtro `All / Yours / Others`, ordinamento `Most played / Newest / A–Z`.
- Lista con pannello suono in modalità **server**. Niente analytics per suono, niente edit, niente tab "Your plays".

### 8.2 Soundboards
- Testa: "{Server} · N boards", "Soundboards"; link "My soundboards".
- Filtro "Made by" `All / Yours / Others`; nota "Only the maker can change a board".
- Righe soundboard (§4.4) con il canale dove è postata; pannello in modalità **server** con la tastiera suonabile.
- Nel server compaiono le board pubbliche legate al server. Le private stanno solo nel profilo dell'owner.

## 9. Add to soundboard e greet (da qualsiasi pannello suono)
- **Add to soundboard**: popover "Pick a board · you choose the key there" con le mie board (contatore N/25, "Full · free a key first" se piena) e "New soundboard". La scelta **porta** a `/dashboard/me/soundboards/{boardId}/add/{soundId}/` (§7.5). Nessuna aggiunta silenziosa.
- **Greet**: invariato (Everywhere / per server, scelta multipla).

## 10. Profilo

### 10.1 My sounds
- Testa: "Your profile · N sounds", "My sounds", pulsante "Upload sound".
- Striscia: suoni (pubblici · privati), plays 30 giorni, like, "Used as greet".
- Strumenti: ricerca, visibilità `All / Public / Private`, ordinamento.
- Righe: badge "Private" (è uno stato), server di upload, tag come testo.
- Pannello suono in modalità **owner** (§5).

### 10.2 My soundboards
- Testa: "Your profile · N boards", "My soundboards", "New soundboard".
- Filtro visibilità `All / Public / Private`.
- Righe soundboard con server/canale e badge "Private"; pannello in modalità **owner** (§6, §7.4).

### 10.3 Overview e upload
Overview = pagina Profile attuale (greet, account collegati, suoni recenti con link "Upload"). Upload come §5.

## 11. Creatore (pubblico)
- Hero: avatar, "Creator", nome, "uploading since"; "Share profile"; se sono io "Manage in your profile".
- Statistiche: suoni pubblici, soundboard, plays totali, like ricevuti.
- Tab `Sounds N / Soundboards N` (path §2), ricerca dentro la tab, ordinamento `Most played / Most liked / Newest`.
- Lista con pannello public (suono o soundboard), split 30/70 come Explore.

## 12. Dati e API necessari

Lo stato attuale del codice: soundboard **legate alla guild** (`/guilds/{id}/soundboards…`, `Soundboard { id, guildId, userId, name, thumbnailUrl, soundCount, canEdit }`), senza ordine degli slot, visibilità, like, commenti o pagina pubblica. Il nuovo modello sposta la soundboard **sull'utente**, con visibilità e pagina pubblica. Verificare sulla doc API aggiornata e segnalare ciò che manca.

| Serve per | Dati | Note |
|---|---|---|
| Ricerca unificata (Explore, creatore) | `type` (all/sounds/boards), `q`, `tag`, `length` (solo suoni), `sort` (relevance/plays/likes/newest), cursore unico; elementi con `kind` | **senza** `mine`; conteggi per tipo per il filtro |
| Suggerimenti | suoni (5), board (2), tag (3) | quick search e Explore |
| Explore inizio | trending sounds, board popolari, just added, tag popolari | |
| Soundboard pubblica | id, nome, owner, visibilità, 25 slot **ordinati** (`null` se vuoto) con suono (id, nome, durata, immagine, audio URL), plays, like/dislike e voto mio, commenti count, copie, canale/server dove è postata, data, `canEdit` | |
| Like e commenti board | stessa forma di quelli dei suoni (voto, thread, pin/heart dell'owner) | |
| Board del creatore | lista paginata delle board pubbliche di un utente | |
| Le mie board | CRUD: nome, visibilità, slot (piazza/sposta/rimuovi per indice), thumbnail, elimina, "post to channel" | slot per indice, non solo add/remove |
| Salva una copia | duplica una board pubblica nelle mie | |
| Board di un server | board pubbliche legate al server, con owner e `canEdit` | |
| Suoni del server | lista sola visione (già esiste) | togliere da UI le analytics per suono |
| Statistiche server | plays 7 giorni e variazione, suoni nel server, più riprodotto, uploader più attivo, top 5 settimana | aggregate, non per suono |
| Suono owner | PATCH nome, visibilità, tag; immagine (esiste); download; delete; plays/listeners/like 14 giorni e "on soundboards" | |
| Quick search, "Jump back in" | ultimi elementi aperti dall'utente | se non c'è l'endpoint, nascondere la sezione |
| SEO | id paginati di suoni, board e creatori pubblici per la sitemap | private escluse |

### 12.1 Verifica sulla spec "Beebot Sounds API" 1.0.0 (2026-11-20)

Coperto:
- Le mie board: `GET/POST /me/soundboards`; `GET/PATCH/DELETE /soundboards/{id}` (PATCH: `name`, `public`, `sortMode`, `soundIds` ordinati, max 25); `PUT/DELETE /soundboards/{id}/sounds/{soundId}`; `PUT /soundboards/{id}/thumbnail`.
- Board pubblica: `GET /public/soundboards/{id}` (`board` + `sounds: SoundCard[]`); ricerca `GET /public/soundboards?q&limit&cursor`.
- Like e commenti board: `PUT /soundboards/{id}/vote` (solo `LIKE`/`null`), commenti con la stessa forma dei suoni.
- Board di un server: `GET /guilds/{id}/soundboards[/{boardId}]`. Suoni e statistiche aggregate del server: `/guilds/{id}/sounds` e `/guilds/{id}/sounds/analytics` con `period=7d`.
- Suono owner: `PATCH /sounds/{id}` (`name`, `description`, `public`, `tags`), immagine, `DELETE`, `soundboardCount`, analytics personali per le barre.
- Riproduzione da board: `POST /public/sounds/{id}/plays` con `soundboardId`.

Manca (da chiedere al backend; in UI resta "Coming soon" o la sezione non compare):
- Ricerca unificata: due liste separate, senza `kind`, conteggi per tipo né cursore unico; le board non hanno `sort`, `tag` né `uploaderId`. Decisione: "All" lancia in parallelo le due ricerche con lo stesso `q` e mostra due sezioni (anteprima con "See all"), ognuna col suo cursore; con un tag attivo le board non si cercano.
- Slot per indice: `soundIds` è un array senza buchi. Decisione: tasti compatti da Q; "sposta su un vuoto" e "Placing" mettono il suono in coda.
- Board: solo `userId` (niente nome e avatar dell'owner: il pannello li legge da `/public/users/{id}`), niente dislike, canale/server dove è postata, data, copie salvate.
- "Save a copy" e "Post to a channel": nessun endpoint.
- Board del creatore: nessun filtro per utente né conteggio in `/public/users/{id}`.
- Explore: niente board popolari (si mostra la prima pagina di `/public/soundboards`) né board nei suggerimenti (si aggiunge in parallelo `/public/soundboards?q&limit=2`).
- `Sound` (dashboard) non ha `imageUrl`; `SoundCard` non ha il server di upload.
- "Jump back in", suoni a cui ho messo like, id per la sitemap.
- `/me/soundboards` è descritta come "Guild soundboards": da confermare se include le board di server create dall'utente.

## 13. SEO e visibilità
- Pubblico = indicizzabile: suoni, soundboard e creatori su sounds. Canonical (§2), `og:*` con immagine, sitemap.
- Privato: solo l'owner, nessuna pagina pubblica né link condivisibile, `noindex`, fuori da ricerca e suggerimenti.
- Dashboard e auth `noindex` (vedi `collegamenti-e-azioni.md` §3).

## 14. Regole visive da rispettare
Da `docs/rifiniture-ui.md`:
- Raggi: part 6, control 8, box 12; pill solo per avatar, play, switch e barre.
- Badge solo per stati ("Private"); i tag sono testo `#tag`.
- Mono solo per codice e scorciatoie (comandi, keycap): durate e numeri con cifre tabulari.
- Niente glow.
- Pannelli 30/70; pagine pubbliche con lo spacing dell'header.

## 15. Ordine suggerito
1. Header: nav, riga profilo, menu account, quick search.
2. Pannello suono a modalità; spostare l'edit in My sounds; route upload; rimuovere edit e `/me/sounds/guild`.
3. Semplificare Sounds del server (striscia, top 5, pannello server).
4. Componente tastiera (play, poi edit).
5. Pannello soundboard; My soundboards (owner) con flusso "Placing"; Soundboards del server.
6. Explore: risultati misti, filtro tipo, righe e tile soundboard, route `/board/{boardId}/`.
7. Creatore con tab Soundboards.
8. SEO: canonical, og, sitemap, noindex.

## 16. Fuori ambito (per ora)
- Moderazione dell'admin (nascondere/vietare suoni e board nel server).
- Tema chiaro funzionante dal menu account.
- Playlists: invariate.
