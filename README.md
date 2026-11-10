# Beebot Dashboard

Dashboard web per il bot Discord Beebot.

## Stack e requisiti

- Qwik 2 e Qwik Router 2, TypeScript, Vite 8 e CSS nativo
- Node.js 26 LTS e npm
- Deployment previsto su Vercel con adapter Edge

## Avvio

```sh
npm install
cp .env.example .env
npm run dev
npm run build
```

Configurare `.env` a partire da `.env.example`. Solo le variabili con prefisso `PUBLIC_` sono pubbliche; le credenziali backend, OAuth e di sessione devono essere lette esclusivamente lato server tramite le API di Qwik Router e le variabili d'ambiente Vercel.

La home viene generata staticamente durante la build. `DISCORD_CLIENT_ID` deve essere disponibile in fase di build su Vercel; se cambia, è necessario un nuovo deployment per aggiornare il link di invito.

Le route della dashboard condividono `src/routes/dashboard/layout.tsx`. I futuri elementi comuni vanno nel layout; i contenuti e i loader specifici vanno nelle singole route, collegate tramite `Link` per navigare senza ricaricare il documento.

## Struttura

- `src/routes/`: pagine
- `src/root.tsx` e `src/entry.*.tsx`: documento e punti di ingresso
- `adapters/vercel-edge/`: configurazione della build Vercel
- `AGENTS.md`: linee guida condivise; `CLAUDE.md` le richiama per Claude
- `.codex/config.toml` e `.mcp.json`: server MCP per Codex e Claude Code

Qwik MCP usa il server di sviluppo per gli strumenti di ispezione. CodeGraph indicizza la repository in modalità strutturale, senza embeddings. Le configurazioni MCP usano percorsi assoluti: aggiornarli se la repository viene spostata. Riavviare la sessione dell'agente dopo la configurazione.
