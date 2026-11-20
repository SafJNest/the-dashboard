# Collegamenti e azioni — design

Stato: proposta, nessuna parte implementata. Tavole visive: canvas "Beebot — Link e ruoli" (https://claude.ai/artifact/7gYzef8xYEB1hRzNQEMRoc). Completa `docs/sounds-funzionamento.md` (cosa si vede e si fa) dicendo **come si passa da una vista all'altra** e **quali controlli compaiono per ruolo**. Regole generali in `AGENTS.md`.

## 1. Principi

1. **Un'entità, una pagina canonica.** Ogni entità con una pagina (suono, creatore, soundboard, sezione, livello, streamer) ha un solo URL di riferimento. Le altre viste che la mostrano possono avere un proprio URL di contesto, ma dichiarano la canonica.
2. **Ogni menzione di un'entità è un link.** Nome di un suono, uploader, autore di un commento, server, soundboard e tag (se diventa pagina, §5) sono `<a href>`: `Link` nello stesso layout, `<a>` semplice quando si cambia layout (sito pubblico ↔ dashboard). Mai `button` + `navigate()` per andare in un'altra pagina.
3. **Le azioni sono button.** Play, like, greet, copia, aggiungi a soundboard ed elimina restano `button` o `form`. Un bottone può anche aggiornare l'URL (per esempio il play che apre il pannello), ma accanto c'è sempre il link vero.
4. **I permessi vengono dai dati.** Un controllo compare solo se il dato lo consente (`ownedByMe`, `canEdit`, `canDelete`, `board.canEdit`, guild presente in `account.guilds`). Se il dato manca, il controllo non compare: niente controlli visibili che portano a un 403 o a un 404.
5. **Indicizzare solo il pubblico.** Contano per la SEO il sito, `/sounds`, i suoni, i creatori e `/commands`. Dashboard, auth e suoni privati restano fuori dall'indice. Nella dashboard i link servono comunque, per semantica, tastiera e apertura in un'altra scheda.
6. **Andata e ritorno.** Se da una vista A si arriva a B, B offre il ritorno ad A. Il contesto si ricava solo dal path (entità come segmenti), mai da query o stato.

## 2. URL delle entità

| Entità | Canonica (pubblica) | Contesti dashboard | Indicizzabile |
|---|---|---|---|
| Suono | `/sounds/{id}/` | `/sounds/u/{userId}/{id}/` (pannello nel profilo) · `/sounds/tag/{name}/{id}/` (pannello nella pagina tag) · `/dashboard/me/sounds/{id}/` · `/dashboard/me/sounds/guild/{guildId}/{id}/` · `/dashboard/{guildId}/sounds/{id}/` | sì, se pubblico |
| Editor suono | — | oggi `/dashboard/me/sounds/{id}/edit/`; proposta §4.4 | no |
| Creatore | `/sounds/u/{userId}/` | — | sì |
| Tag | proposta `/sounds/tag/{name}/` (§5) | — | sì |
| Soundboard | — | `/dashboard/{guildId}/soundboards/{boardId}/` | no |
| Server | nessuna pagina pubblica (decisione aperta §12.4 di sounds-funzionamento) | `/dashboard/{guildId}/settings/` e sotto | no |
| Comandi | `/commands/` (ancore `#categoria`) | — | sì |

## 3. Regole SEO

Oggi non c'è nessuna di queste regole: niente `robots.txt`, niente canonical, niente `noindex`, niente sitemap. `DocumentHeadTags` è già nel `root.tsx`, quindi canonical e meta passano dagli `head` delle route.

1. **Canonical.**
   - `/sounds/{id}/`, `/sounds/u/{userId}/{id}/` e `/sounds/tag/{name}/{id}/` dichiarano tutte `<link rel="canonical" href="/sounds/{id}/">`; oggi lo stesso suono vive su due URL senza canonica.
   - "Copy link" del pannello copia la canonica, non l'URL di contesto (oggi copia `window.location.href`).
   - `/sounds/u/{userId}/` dichiara sé stessa.
   - `/sounds/` dichiara sé stessa.
2. **`robots.txt`**: consente `/`, `/sounds/`, `/commands/`, `/terms/`, `/privacy/`; esclude `/dashboard/` e `/auth/`; indica la sitemap.
3. **`noindex`.**
   - `<meta name="robots" content="noindex">` nell'head del layout `/dashboard`.
   - Suono privato aperto dal suo uploader su `/sounds/{id}/`: `noindex`; per gli altri è già un 404.
   - Errori e 404: `noindex`.
4. **Sitemap** (`/sitemap.xml`, route server): suoni pubblici e creatori con almeno un suono pubblico, con `lastmod`. Serve un endpoint backend che elenchi gli id paginati (§8). È la strada per far scoprire le pagine oltre "Load more", che resta un bottone perché cursori e filtri non vanno nell'URL.
5. **Testi e anteprime.**
   - Titolo e description esistono già per suono e creatore.
   - Aggiungere `og:title`, `og:description`, `og:image` (immagine del suono o dell'avatar) e `og:url` uguale alla canonica: la condivisione del link è già una funzione del pannello.
6. **Link interni dal sito.**
   - La card "Sound library" della landing (`features.tsx`) oggi non porta da nessuna parte: diventa un link a `/sounds/`.
   - In `/commands/`, la voce `/play` linka a `/sounds/`.
7. **Link nell'HTML SSR.**
   - Trending, Just added, le liste del profilo creatore e i suoni del pannello sono già nel SSR: restano così.
   - I risultati di ricerca sono solo client e non contano per la SEO; ci pensano sitemap e pagine tag.

## 4. Suono

### 4.1 Dove compare e dove porta

| Dove | Elemento | Oggi | Design |
|---|---|---|---|
| Explore, ricerca, suggerimenti | riga o tile | link `/sounds/{id}/` | invariato |
| Explore, ricerca | uploader nella riga | testo dentro la riga | link `/sounds/u/{id}/` sopra l'overlay della riga |
| Profilo creatore | riga | link `/sounds/u/{u}/{id}/` | invariato, con canonical §3.1 |
| Pannello | uploader | link profilo | invariato |
| Pannello | tag | `Link` a `/sounds/` + stato, stesso href per ogni tag | link `/sounds/tag/{name}/` (§5) |
| Dashboard, lista | riga | link al dettaglio di contesto | invariato |
| Dashboard, classifiche | nome | link al dettaglio | invariato |
| Dashboard, dettaglio | uploader | `<a>` profilo | invariato |
| Dashboard, dettaglio | server | testo | §4.3 |
| Dashboard, dettaglio | tag | badge statico | link come nel pannello |
| Soundboard, slot | nome | testo | server in `account.guilds` → `/dashboard/{guildId}/sounds/{id}/`; altrimenti, se pubblico → `/sounds/{id}/`; altrimenti testo |
| Soundboard, libreria | riga | nome e Add/checkbox, niente play | aggiungere il play; il nome resta testo (sta dentro `label`) |
| Editor | — | — | link pagina pubblica (§4.4) |

### 4.2 Pannello pubblico (`/sounds/{id}/`, `/sounds/u/{u}/{id}/`)

| Controllo | Ospite | Utente | Uploader | Admin del server di caricamento |
|---|---|---|---|---|
| Play, copia `/play`, copia link | ✓ | ✓ | ✓ | ✓ |
| Like / dislike | invito login | ✓ | ✓ | ✓ |
| Greet | invito login | globale + per server (§7 sounds-funzionamento) | ✓ | ✓ |
| Add to soundboard | invito login | popover delle mie board modificabili | ✓ | ✓ |
| Commenti | lettura | ✓ | + pin e cuore (esiste) | — |
| **Barra "Your sound"** | — | — | ✓ | — |
| **Manage** | — | — | — | ✓ se `canDelete` (serve API, §8) |

**Barra "Your sound"** (nuova), sotto il titolo e prima del player, solo se `viewer.ownedByMe`:

```
[badge Your sound] [badge Private, se privato]     Statistics ↗   Edit ↗
```

- `Statistics` → `<a href="/dashboard/me/sounds/{id}/">`.
- `Edit` → `<a href="/dashboard/me/sounds/{id}/edit/">`.
- Entrambi sono link `button--secondary button--sm`, perché cambiano layout. Il badge "Private" si sposta qui dalla riga meta.
- È lo stesso pattern di "Manage in dashboard" nel profilo creatore.

**Add to soundboard**: il bottone apre un popover (`details` o `dialog`) con le board modificabili, ognuna con riempimento n/25; le piene sono disabilitate se il suono non c'è già. In fondo c'è il link "New soundboard" → `/dashboard/{guildId}/soundboards/`. Finché manca l'API (§8) resta disabilitato com'è oggi.

### 4.3 Dettaglio in dashboard (guild e I miei suoni)

Intestazione: il titolo resta testo. Sotto, una riga di link al posto delle icone in fondo a destra, che oggi si perdono:

```
Public page ↗   ·   Open in My sounds   |   Open in {server}   ·   Edit
```

| Link | Condizione | Destinazione |
|---|---|---|
| Public page | `public`, oppure `ownedByMe` (anche se privato, con etichetta "Private page") | `<a href="/sounds/{id}/">` |
| Open in My sounds | vista guild e `ownedByMe` | `Link` a `/dashboard/me/sounds/guild/{guildId}/{id}/` |
| Open in {server} | vista I miei suoni e `guildId` presente in `account.guilds` (sono admin lì) | `Link` a `/dashboard/{guildId}/sounds/{id}/` |
| Edit / Manage | `canEdit` / solo `canDelete` | editor del contesto (§4.4) |

- **Server** nei fatti: nella vista I miei suoni diventa un link al filtro `/dashboard/me/sounds/guild/{guildId}/`; nella vista guild resta testo, perché sei già lì.
- **Azioni** (button): like, greet, copia `/play` (previsto al §2 di sounds-funzionamento, manca), Add to soundboard (come §4.2, limitato alle board di quella guild), Download.

### 4.4 Editor

Problema attuale: "My sounds" e "Full analytics" puntano sempre a `/dashboard/me/sounds/{id}/`.
- Un admin che gestisce il suono di un altro finisce su un 404, perché quel suono non è nella sua libreria.
- L'uploader arrivato dalla guild perde il contesto.

**Proposta: editor per albero**, con il contesto nel path come entità:

| Arrivo da | URL editor | Crumb e "Full analytics" |
|---|---|---|
| I miei suoni, pannello pubblico, profilo | `/dashboard/me/sounds/{id}/edit/` | `My sounds` → `/dashboard/me/sounds/{id}/` |
| Sounds della guild | `/dashboard/{guildId}/sounds/{id}/edit/` | `{server} › Sounds` → `/dashboard/{guildId}/sounds/{id}/` |

Stato: implementato.
- Stesso componente `SoundEditor`, con il `guildId` del path passato dalla route (`null` per I miei suoni); crumb, "Full analytics" e lista dopo l'eliminazione derivano da `soundDetailPath` ed `editSoundPath` in `src/lib/sound-library.ts`.
- Loader e action stanno in `src/lib/sound-editor.ts` e le due route li riesportano. `useSound` controlla l'albero: nella guild il suono deve essere di quella guild, in I miei suoni deve essere tuo; altrimenti 404.
- La route di guild sta dentro il layout del server, quindi tiene la barra del server. Lista e dettaglio della guild sono nel gruppo `sounds/(library)/`, come in I miei suoni, perché l'editor non erediti la lista.
- Nell'editor c'è il link "Public page" (o "Private page", stesse condizioni di §4.3) accanto a Download.
- Da verificare con un admin: che l'API restituisca `canDelete` e accetti PATCH e DELETE sui suoni altrui della guild.

## 5. Tag

Oggi il tag è stato di vista: i chip del pannello sono `Link` a `/sounds/` che impostano la ricerca, e i "Popular tags" sono `button`. Per un crawler ogni tag punta alla stessa pagina.

**Proposta: il tag diventa entità** con pagina `/sounds/tag/{name}/`:
- titolo `#name · Beebot sounds`;
- lista SSR dei suoni pubblici con quel tag, con ordinamento e lunghezza come filtri locali;
- canonica su sé stessa;
- pannello nell'URL di contesto `/sounds/tag/{name}/{id}/`, come nel profilo creatore, con canonica `/sounds/{id}/`;
- nome nell'URL in minuscolo e codificato, altre grafie con redirect 301; tag inesistente o senza suoni pubblici: 404 con `noindex`.

Tutti i tag (pannello, righe, popular tags, dashboard, landing) diventano link a quella pagina. Il campo di ricerca con `#tag` resta com'è, oppure porta lì.

Richiede di aggiornare la regola URL di `AGENTS.md`: aggiungere "tag" alla lista delle entità.

## 6. Altre entità

**Creatore**
- Menzioni: uploader nel pannello, nelle righe (§4.1), autore dei commenti, uploader nel dettaglio dashboard. Tutte link a `/sounds/u/{id}/`.
- "Manage in dashboard" quando è il mio profilo: esiste.
- "Share profile" (azione, previsto al §9 di sounds-funzionamento): manca.

**Soundboard**
- Lista → dettaglio con link: esiste.
- Slot → suono: §4.1.
- Il creatore della board non si vede (l'API dà solo `userId`): per linkarlo al profilo serve nome e avatar (§8).

**Server**
- Lista server → impostazioni con link: esiste.
- Tab Settings / Soundboards / Sounds: link, esistono.
- Leaderboard e Playlists restano `span aria-disabled` con "Soon": non sono link perché la pagina non esiste.

**Commenti**
- Autore: link, esiste.
- Permalink ai singoli commenti: non previsto.

**Comandi**
- Ancore per categoria: esistono.
- `/play` → `/sounds/` (§3.6).

## 7. Elementi cliccabili che oggi non sono link

| File | Elemento | Design |
|---|---|---|
| `src/routes/sounds/(search)/layout.tsx:47` | Popular tags (`button`) | link pagina tag (§5) |
| `src/components/catalog/sound-panel.tsx:195` | chip tag con href unico `/sounds/` | link pagina tag |
| `src/components/catalog/sound-items.tsx:60` | uploader nella riga (testo) | link profilo |
| `src/components/sounds/sound-detail.tsx:359` | server (testo) | link filtro, solo in I miei suoni |
| `src/components/sounds/sound-detail.tsx:378` | tag (badge) | link pagina tag |
| `src/components/soundboards/board-detail.tsx:104` | nome nello slot (testo) | link dettaglio guild |
| `src/components/landing/features.tsx:142` | card Sound library | link `/sounds/` |
| `src/components/catalog/sound-panel.tsx:172` | Add to soundboard disabilitato | popover (§4.2), quando c'è l'API |

## 8. Dipendenze dal backend

| Bisogno | Per | Stato |
|---|---|---|
| `canEdit` / `canDelete` su `SoundCard` | Manage dell'admin nel pannello pubblico | da chiedere |
| Elenco delle mie soundboard modificabili, su tutte le guild, con riempimento | Add to soundboard da pannello e dettaglio | da chiedere |
| Aggiunta e rimozione del suono da board di altre guild | idem | da verificare (oggi la libreria della board è solo quella della guild) |
| Elenco paginato di id di suoni pubblici e creatori con `lastmod` | sitemap | da chiedere |
| Ricerca per tag con risultato SSR | pagina tag | esiste (`tag` nella ricerca), da verificare la paginazione |
| Nome e avatar del creatore della board | link al profilo dalla board | da chiedere |
| Greet per server dal pannello | §4.2 | da verificare sull'API settings utente |

## 9. Decisioni aperte

1. **Pagine tag** (§5): consigliato sì; richiede di aggiornare `AGENTS.md`.
2. **Editor per albero** (§4.4): consigliato sì; evita il 404 dell'admin senza mettere query nell'URL.
3. **Uploader cliccabile nelle righe** (§4.1): utile per la SEO dei profili, ma aggiunge un secondo bersaglio sopra l'overlay della riga. Consigliato sì, con area di click limitata al nome.
4. **Pagina privata per l'uploader** (§4.3): il link si mostra anche per i privati? Consigliato sì, con `noindex`.

## 10. Ordine proposto

1. SEO di base (fatto): `robots.txt`, `noindex` della dashboard, canonical dei suoni e del profilo, og tags.
2. Link solo frontend, con i dati che ci sono già (fatto; i tag passano alla fase 4):
   - barra "Your sound";
   - riga di link del dettaglio dashboard;
   - server e tag nel dettaglio;
   - slot e play nella libreria della board;
   - uploader nelle righe;
   - link dalla landing e da `/commands`.
3. Editor per albero. Fatto.
4. Pagine tag.
5. Parti che dipendono dal backend: Add to soundboard, Manage dell'admin, sitemap, greet per server.
