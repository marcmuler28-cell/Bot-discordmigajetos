# AI-Powered Discord Bot (TypeScript)

![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2)
![MongoDB](https://img.shields.io/badge/DB-MongoDB-47A248)

A Discord bot combining an **LLM assistant** with **25+ slash commands**: music playback, gamification, moderation, TTS and AI chat with per-user memory. ~3,600 lines of TypeScript, hosted 24/7.

## Features

- 🤖 **AI chat (`/ia`)** — GPT-4o-mini via the OpenAI SDK routed through **OpenRouter**, with a custom persona system prompt and **per-user conversation memory persisted in MongoDB**
- 📊 **Structured output** — a dedicated analyzer module (`src/ai/analisis.ts`) that forces the LLM to return **validated JSON** for media analysis
- 🎵 **Music system** — play / pause / resume / skip / queue / now-playing / volume powered by `lavalink-client` (server config in my [Lavalink repo](https://github.com/marcmuler28-cell/Lavalink))
- 🎮 **Gamification** — user profiles, points, server ranking, a guessing game and story commands, all MongoDB-backed
- 🛡️ **Moderation** — ban, kick, bulk clear, channel creation
- 🔊 **Text-to-speech** — `/tts` backed by a small Python TTS microservice (`tts_server.py`, ~190 lines)
- 👋 **Events** — welcome messages for new members, message handling
- ☁️ **24/7 hosting** — Express `keep_alive` server + `Procfile` (Replit)

## Commands (25+)

| Category | Commands |
|---|---|
| AI | `/ia`, `/historia` |
| Music | `/play`, `/pause`, `/resume`, `/stop`, `/skip`, `/queue`, `/nowplaying`, `/volumen` |
| Gamification | `/perfil`, `/ranking`, `/registrar`, `/adivina` |
| Moderation | `/ban`, `/kick`, `/clear`, `/crearcanal` |
| Fun | `/meme`, `/broma` |
| Utility | `/ping`, `/help`, `/info`, `/tts`, `/actualizar` |

## Tech stack

TypeScript · Node.js · discord.js v14 · MongoDB (official driver) · OpenAI SDK + OpenRouter · lavalink-client · Express · Python (TTS microservice)

## Project structure

```
src/
├── index.ts            # client bootstrap + command/event registration
├── ai/
│   ├── client.ts       # OpenAI SDK client (OpenRouter base URL)
│   ├── analisis.ts     # structured JSON output analyzer
│   └── stories.ts
├── commands/           # 25+ slash commands
├── events/             # ready, messageCreate, guildMemberAdd
├── db/                 # MongoDB connection + user/points models
├── music/              # Lavalink manager, queue, game state
├── lib/                # interaction helpers
└── keep_alive.ts       # Express server for 24/7 hosting
tts_server.py           # Python TTS microservice
Procfile                # process definition for hosting
```

## Getting started

```bash
git clone https://github.com/marcmuler28-cell/Bot-discordmigajetos.git
cd Bot-discordmigajetos
npm install
```

Create a `.env` file (all secrets are read from environment variables — none are hardcoded):

```env
DISCORD_TOKEN=your_bot_token
MONGODB_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openrouter_or_openai_key
LAVALINK_HOST=...      # optional music config
LAVALINK_PORT=...
LAVALINK_PASSWORD=...
TTS_SERVER_URL=...     # optional TTS microservice
PORT=3000
```

```bash
npm start        # node --import tsx/esm src/index.ts
npm run dev      # tsx src/index.ts (development)
```
