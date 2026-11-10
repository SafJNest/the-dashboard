# Beebot Dashboard

Dashboard web per il bot Discord Beebot.

## Stack e requisiti

- Qwik 2 e Qwik Router 2, TypeScript, Vite 8 e CSS nativo
- Node.js 24 LTS e npm
- Deployment previsto su Vercel con adapter Edge

## Avvio

```sh
npm install
cp .env.example .env
npm run dev
npm run build
```

Configurare `.env` a partire da `.env.example`. Solo le variabili con prefisso `PUBLIC_` sono pubbliche; le credenziali backend, OAuth e di sessione devono essere lette esclusivamente lato server tramite le API di Qwik Router e le variabili d'ambiente Vercel.

## Struttura

- `src/routes/`: pagine
- `src/root.tsx` e `src/entry.*.tsx`: documento e punti di ingresso
- `adapters/vercel-edge/`: configurazione della build Vercel
- `.codex/config.toml` e `.mcp.json`: server MCP per Codex e Claude Code

Qwik MCP usa il server di sviluppo per gli strumenti di ispezione. CodeGraph indicizza la repository in modalità strutturale, senza embeddings. Le configurazioni MCP usano percorsi assoluti: aggiornarli se la repository viene spostata. Riavviare la sessione dell'agente dopo la configurazione.
