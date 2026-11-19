# Fase 0 — Regole di scrittura del codice

Sono la fonte delle regole controllate da `syntax-officer`. Le regole decise sono anche in `AGENTS.md`, nella sezione "Formattazione".

## Regole decise dall'utente

- Spazi attorno a tutti gli operatori binari: `1 * 2 * 3`, mai `1*2*3`.
- Un `if` con corpo di una sola riga si scrive su una riga, con graffe, `;` e spazi dentro le parentesi:
  ```ts
  if ( result == null ) { return; }
  ```
  Mai `if(){}`, mai `{ return }` senza `;`, mai corpo senza graffe (`if (x) return;` non va bene).
- Un `if` con corpo di più righe ha le graffe su più righe, senza spazi dentro le parentesi:
  ```ts
  if (condition) {
    first();
    second();
  }
  ```
- La condizione di un `if` non si spezza mai su più righe. Le sue parti diventano costanti con un nome:
  ```ts
  const isOwner = member.id === guild.ownerId;
  const canEdit = permissions.includes('manage');
  if ( isOwner && canEdit ) { return; }
  ```
- Azioni semplici inline: `condition && fn()` / `!condition && fn()`.
- Valori condizionali con il ternario: `const value = condition ? a : b`.
- Mai commenti.
- Funzioni:
  - gli helper generici e riusabili (parsing di base, formattatori) restano funzioni;
  - le funzioni di dominio scritte libere in un modulo diventano metodi della classe owner (vedi fase 3);
  - nel frontend la struttura conta meno.
- Restano valide le regole TypeScript di `AGENTS.md`: niente `#private`, ordine dei membri, `async/await`, `for...of` invece di `forEach`, early return, arrow function per le callback, nomi espliciti senza abbreviazioni.

Quando ci sono tanti `if` di guardia uno sotto l'altro, l'utente valuterà se allinearli. Per ora non è una regola.

## Proposte da confermare con l'utente

Non applicarle finché l'utente non le approva in modo esplicito. Quando una viene approvata, spostarla tra le regole decise, qui e in `AGENTS.md`.

1. Sempre `===`/`!==`; `== null` solo per controllare insieme `null` e `undefined`.
2. Niente ternari annidati (oggi ce ne sono 24): early return oppure un oggetto di lookup.
3. Niente `else` dopo un `return`.
4. `const` di default; `let` solo se la variabile viene riassegnata.
5. Nomi dei booleani con prefisso `is`/`has`/`can`/`should`.
6. Righe sotto circa 140 caratteri (oggi 97 la superano): si spezzano oggetti, argomenti e JSX, mai le condizioni `if`.
7. Oggetti di lookup al posto di catene `if`/`switch` che mappano un valore su un altro.
8. Template literal al posto della concatenazione con `+`.
9. Con più di due parametri, o con parametri opzionali, si usa un oggetto `options` destrutturato.
10. Gli `await` indipendenti si eseguono insieme con `Promise.all`.

## Passata meccanica (commit separato, prima della fase 1)

Stato misurato il 2026-11-15 su `src/**/*.{ts,tsx}`:

- **Circa 221 `if` inline senza graffe** (`if (x) return y;`): diventano `if ( x ) { return y; }`.
  - Si convertono solo i casi su una riga, che finiscono con `;` e hanno parentesi bilanciate.
  - I casi in cui il corpo continua sulla riga dopo vanno sistemati a mano.
- **4 condizioni `if` spezzate su più righe**: si estraggono costanti booleane con un nome.
  - `src/lib/guild.ts:159`
  - `src/lib/beebot.server.ts:58`
  - `src/lib/beebot.server.ts:67`
  - `src/routes/auth/callback/index.ts:22`
  - In `src/components/guild/role-picker.tsx:39` c'è un `&&` in JSX, che non è un `if`: va lasciato.
- **Un commento**: il blocco "WHAT IS THIS FILE?" in `src/entry.vercel-edge.tsx:1-9`, da eliminare.
- Gli operatori senza spazi risultano già assenti. Ricontrollare comunque sui file toccati.

Come procedere:

1. Usare CodeGraph e la ricerca testuale per elencare i casi.
2. Convertire con uno script temporaneo tenuto fuori dalla repo, poi rileggere il diff file per file.
3. Correggere a mano i casi multi-riga.
4. Non cambiare nessun comportamento.

Verifica: `npx tsc --noEmit`, `node --test tests/*.test.mjs`, `npm run build`, poi `syntax-officer` su tutto il diff.
