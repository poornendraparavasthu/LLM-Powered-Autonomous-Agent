# Linux AI Assistant

A browser-based AI agent that translates plain-English instructions into validated Linux shell commands, executes them in a live terminal, and streams output in real time — all powered by a local LLM.

---

## Overview

Type a task in natural language. The assistant generates the exact shell command, explains what it does, assesses its risk level, and asks for confirmation before running anything. Output streams directly into an embedded xterm.js terminal.

**Core design principles:**
- Commands are generated locally via Ollama — no data leaves your machine by default
- Gemini is used only as a fallback when Ollama is completely unreachable
- Nothing executes without your approval; destructive commands require explicit confirmation
- No arbitrary timeouts — long-running commands (system updates, large downloads) run to completion

---

## Architecture

```
Browser (React 19 + Vite)
  ├── Chat panel          — natural language input / command review
  ├── Terminal panel      — xterm.js with live PTY output
  └── Settings drawer     — model selection, session management

Node.js / Express backend
  ├── LLM Service         — Ollama-first, Gemini fallback
  ├── Command Processor   — validation pipeline + result store
  ├── Terminal Manager    — node-pty sessions with resize sync
  └── WebSocket (Socket.IO) — real-time output + control events
```

---

## Safety Pipeline

Every generated command passes through three stages before you can run it:

1. **Syntax check** — `bash -n` dry-run catches malformed commands
2. **Regex blacklist** — blocks known destructive patterns (`rm -rf /`, fork bombs, etc.)
3. **LLM semantic review** — the model rates risk as `low / medium / high` and flags commands that require confirmation

High-risk commands display a red accent and a confirmation modal. You can always cancel.

---

## LLM Provider Strategy

| Condition | Provider used |
|-----------|---------------|
| Ollama reachable | Ollama (local, private) |
| Ollama unreachable | Gemini API (network fallback) |

Configure the Gemini API key in `backend/.env` as `GEMINI_API_KEY`. Ollama must be running locally (`ollama serve`) with at least one model pulled (e.g. `ollama pull mistral`).

---

## Quick Start

### Prerequisites

- Node.js 18+
- [Ollama](https://ollama.com) installed and running
- At least one model: `ollama pull mistral`

### Install & run

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Start both backend and frontend
npm start
```

Or use the helper scripts:

```bash
chmod +x install.sh start.sh
./install.sh
./start.sh
```

Open http://localhost:5173 in your browser.

The backend API runs on port **3000**. The frontend dev server runs on port **5173**.

---

## Environment Variables

Create `backend/.env`:

```env
GEMINI_API_KEY=your_key_here   # optional — only used as fallback
PORT=3000                       # optional, defaults to 3000
```

---

## Example Prompts

```
Install docker
Check disk usage
Find large files
Setup firewall
Update the system
```

---

## Project Structure

```
├── backend/
│   ├── server.js                  # Express + Socket.IO entry point
│   ├── routes/
│   │   └── createApiRouter.js     # REST API routes
│   └── services/
│       ├── LLMService.js          # Ollama / Gemini abstraction
│       ├── CommandProcessor.js    # Validation + execution pipeline
│       ├── TerminalManager.js     # node-pty session management
│       └── SessionManager.js      # Per-session history
├── frontend/
│   └── src/
│       ├── pages/Index.jsx        # Main application page
│       ├── components/
│       │   ├── ChatMessage.jsx
│       │   ├── ChatInput.jsx
│       │   ├── CommandBlock.jsx
│       │   ├── TerminalPanel.jsx
│       │   └── frontend-shell/
│       │       ├── SettingsDrawer.jsx
│       │       ├── HistoryPanel.jsx
│       │       ├── SetupPanel.jsx
│       │       └── ConfirmModal.jsx
│       ├── hooks/useWebSocket.jsx
│       ├── lib/
│       │   ├── api.js
│       │   └── session.js
│       └── index.css
├── Linux-AI-Assistant.pdf         # Project documentation
├── install.sh
├── start.sh
└── package.json
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Toggle settings drawer |
| `Esc` | Close settings drawer |

---

## Authors

Built by:

- **Murahari** → https://github.com/murahari1
- **Poornendra** → https://github.com/poornendraparavasthu
- **Swathi** → https://github.com/Swathimengani
- **Shrushti** → https://github.com/shrushti405

---

## License

MIT
