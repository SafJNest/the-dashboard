# Fase 3 — Backend a layer e classi owner

> **Da approvare.** Per una modifica non banale al backend, la regola dell'utente è proporre prima classi, responsabilità e file, e implementare solo dopo il suo ok. Prima di scrivere codice, presentare questa tabella (aggiornata se le fasi precedenti l'hanno cambiata) e aspettare l'approvazione.

## Situazione attuale

`src/lib/beebot.server.ts` (202 righe) contiene:
- nomi dei cookie e messaggi;
- i modelli `User`/`Server`/`Me` con i loro parser;
- la validazione dell'ambiente;
- cookie e generazione dello state OAuth;
- il trasporto fetch e la mappatura degli errori;
- gli helper dei loader Qwik.

`src/lib/beebot/client.server.ts` (`BeebotClient`) fa trasporto, parsing e composizione, e definisce i modelli. Le route `src/routes/auth/{login,callback,logout}` rifanno a mano trasporto e gestione errori: catch vuoti, `response.json()` senza protezione, regex del codice d'errore duplicata.

## Classi proposte

| File | Classe | Responsabilità |
|---|---|---|
| `src/lib/beebot/config.server.ts` | `Config` | Lettura e validazione di `BEEBOT_API_URL`, `BEEBOT_API_KEY`, `BEEBOT_AUTH_CALLBACK_URI` con la factory statica `from(event)`. Costanti `LOOPBACK_HOSTS`, `TIMEOUT` |
| `src/lib/beebot/transport.server.ts` | `Transport` | Fetch con API key e token, timeout, `redirect: 'manual'`, JSON protetto. Converte gli errori in `ApiFailure` (`FAILURE_MESSAGES`, `retryAfter`) |
| `src/lib/beebot/session.server.ts` | `Session` | Cookie di sessione e di state, `cookieOptions`, `randomState`, `loginRedirect`. Richiesta autenticata (oggi `sessionFetch`) con gestione del 401 |
| `src/lib/beebot/auth.server.ts` | `Auth` | `authorize()`, `exchange(code, state)`, `logout()`. Le route auth orchestrano soltanto; gli errori oggi silenziati vengono registrati e un JSON non valido diventa 502 |
| `src/lib/beebot/client.server.ts` | `Client` (ex `BeebotClient`) | Metodi tipati dell'API sopra `Session`: è il repository generico. Si divide in repository per dominio solo se cresce molto |
| `src/lib/beebot/account.ts` | — | `User`, `Server`, `Me` con i loro parser. `DashboardGuild` (`src/components/dashboard/servers.tsx:11-16`) viene sostituito da `Server` |
| `src/lib/parse.ts` | `Parse` (statici) | Helper di validazione unici (`object`, `text`, `nullableText`, `count`…), fusi da `beebot.server.ts` e `sounds.ts`. Uniscono anche i due `parseUser` |
| `src/lib/loader.server.ts` | `Loader` (statici) | `isDocumentRequest`, `resolver`, `await`, `failure`, `apiError` e la costante delle opzioni dei loader |
| `src/lib/dashboard-path.ts` | `DashboardPath` (statici) | Unico owner dei percorsi della dashboard. Oggi sono anche in `sound-library.ts` e scritti a mano in circa 14 file (route e componenti) |

## Funzioni di dominio sparse → classi owner

| Modulo | Oggi | Dopo |
|---|---|---|
| `src/lib/sounds.ts` | 28 funzioni `parse*` | `SoundParser`, con metodi statici; pubblici solo quelli usati dal `Client` |
| `src/lib/sound-stats.ts` | 23 funzioni: modello di vista, grafici, formattatori | `SoundStats` per il modello di vista. I formattatori `Intl` e `linePath` restano funzioni generiche, vicino ai componenti |
| `src/lib/sound-library.ts` | 16 funzioni: filtri, ordinamento, selezione, modelli | `SoundLibraryModel` con le factory `forGuild()` / `forMe()` |
| `src/lib/guild.ts` | 11 funzioni: parser e presentazione | `GuildParser`. `roleLock`, `roleColor`, `initials`, `alertBadge`, `formatDuration` vanno vicino ai componenti |
| `src/lib/settings.ts` | 9 funzioni: lettura e validazione del form | `SettingsForm` |

I componenti del frontend restano come sono: lì la struttura conta meno.

## Altri interventi della fase

- **Specifica degli alert** (`MESSAGE_LIMIT`, mappa canale/ruoli/temporary): oggi è sia in `src/components/guild/alert-settings.tsx:23-86` sia in `src/lib/settings.ts:12-22`. Diventa un'unica fonte in `lib`.
- **Invalidazioni più strette**:
  - `useVoteSound` (`dashboard/layout.tsx:45`) usa la `VoteState` restituita invece di ricaricare entrambe le librerie;
  - `useSaveGreet` (`:67`) evita di ricaricare tutto `/me` se la risposta basta;
  - prima verificare come si comporta l'invalidazione in rc.5.
- **Valori di riserva che nascondono dati mancanti**:
  - `guild.ts:167-170`: `{}`/`[]`;
  - `sounds.ts`: `count()` → 0, `'Unknown user'`, `createdAt ?? ''`, `'UNKNOWN'`, `parseMyPlays` che restituisce zeri;
  - devono diventare `null` o una risposta rifiutata, ma **solo dopo** aver verificato nel contratto Beebot quali campi sono obbligatori.
- **Client solo trasporto tipato**: oggi `BeebotClient` controlla anche che l'ID restituito coincida (`sound?.id === soundId`, `client.server.ts:100,107`), riscrive i messaggi 404 (`notFound`, `:137`) e compone `parseMe` con `parseGreets` in `account()` (`:61-66`). Questi controlli si spostano nei parser di dominio (`SoundParser`, `account.ts`), che ricevono l'ID atteso.
- **Endpoint di auth**: `/auth/discord/authorize`, `/auth/session` e `/auth/logout` oggi sono scritti nelle route. Con la classe `Auth` passano in `ENDPOINTS`.
- **Configurazione validata una sola volta**: oggi viene rivalidata a ogni fetch, e due volte nel callback.
- **Richieste più ampie del necessario**:
  - `useGuild` scarica la guild completa per le pagine dei suoni;
  - `useAccount` carica i greet su tutte le route;
  - da toccare solo se Beebot offre endpoint più leggeri: verificare prima, non inventare contratti.

## Verifica della fase

Le verifiche comuni del README, più questi flussi con configurazione fittizia isolata: login, callback, logout, sessione scaduta (401), API key errata (500 di configurazione, senza loop), Beebot irraggiungibile (503), `Retry-After`. Nessun segreto in log, HTML o bundle.
