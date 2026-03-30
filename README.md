<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,40:0a3d62,70:1a1a2e,100:0d1117&height=220&section=header&text=Linux%20AI%20Assistant&fontSize=55&fontColor=00d4ff&animation=fadeIn&fontAlignY=40&desc=LLM-Powered%20Autonomous%20Agent&descAlignY=62&descSize=20&descColor=8892b0"/>

<br/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=20&duration=2500&pause=800&color=00D4FF&center=true&vCenter=true&random=false&width=700&height=60&lines=Natural+Language+%E2%86%92+Shell+Command;Local+LLM+%7C+Zero+data+leaves+your+machine;Real-time+PTY+Terminal+via+xterm.js;3-Stage+Safety+Validation+Pipeline;Ollama-first+%7C+Gemini+fallback)](https://git.io/typing-svg)

<br/>

[![Stars](https://img.shields.io/github/stars/murahari1/LLM-Powered-Autonomous-Agent?style=for-the-badge&logo=starship&logoColor=gold&color=gold&labelColor=0d1117)](https://github.com/murahari1/LLM-Powered-Autonomous-Agent/stargazers)
[![Forks](https://img.shields.io/github/forks/murahari1/LLM-Powered-Autonomous-Agent?style=for-the-badge&logo=git&logoColor=orange&color=orange&labelColor=0d1117)](https://github.com/murahari1/LLM-Powered-Autonomous-Agent/network)
[![Issues](https://img.shields.io/github/issues/murahari1/LLM-Powered-Autonomous-Agent?style=for-the-badge&logo=github&logoColor=red&color=red&labelColor=0d1117)](https://github.com/murahari1/LLM-Powered-Autonomous-Agent/issues)
[![License](https://img.shields.io/badge/License-MIT-58a6ff?style=for-the-badge&labelColor=0d1117)](https://github.com/murahari1/LLM-Powered-Autonomous-Agent/blob/main/LICENSE)

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:0d1117,100:0a3d62&height=2&section=header"/>

## ⚡ What is this?

<div align="center">

> Type a task in **plain English**. The agent figures out the exact Linux command, explains what it does, flags the risk level, asks for your confirmation — then runs it in a **live terminal** right in your browser.

</div>

```
  You: "update my system and clean package cache"
   ↓
  🧠  LLM generates:  sudo pacman -Syu && sudo pacman -Sc
   ↓
  🛡️  3-stage validation: syntax ✓ | blacklist ✓ | semantic ✓
   ↓
  ✅  You confirm
   ↓
  🖥️  Runs live in xterm.js PTY terminal — output streams in real time
```

---

## 🚀 Tech Stack

<div align="center">

[![My Skills](https://skillicons.dev/icons?i=react,nodejs,express,vite,tailwind&theme=dark&perline=5)](https://skillicons.dev)

| Layer | Tech |
|-------|------|
| **Frontend** | React 19 + Vite + xterm.js |
| **Backend** | Node.js + Express + Socket.IO |
| **Terminal** | node-pty (real PTY sessions) |
| **Local LLM** | Ollama (Mistral / any model) |
| **Fallback LLM** | Google Gemini API |
| **Fonts** | Geist + JetBrains Mono |

</div>

---

## 🧠 Architecture

<div align="center">

```
┌─────────────────────────────────────────────────────┐
│                   Browser (React 19)                 │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Chat Panel  │  │  Terminal   │  │  Settings   │ │
│  │  (commands)  │  │  (xterm.js) │  │  (drawer)   │ │
│  └──────┬───────┘  └──────┬──────┘  └─────────────┘ │
└─────────┼────────────────-┼───────────────────────────┘
          │   Socket.IO     │   WebSocket
┌─────────▼─────────────────▼───────────────────────────┐
│               Node.js / Express Backend                 │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ LLM Service│  │  Terminal   │  │    Command      │ │
│  │ (Ollama ↓  │  │  Manager   │  │    Processor    │ │
│  │  Gemini)   │  │ (node-pty) │  │  (validation)  │ │
│  └─────┬──────┘  └─────────────┘  └─────────────────┘ │
└────────┼──────────────────────────────────────────────-┘
         │
    ┌────▼─────┐    ┌─────────────┐
    │  Ollama  │ or │   Gemini    │
    │  (local) │    │   (cloud)   │
    └──────────┘    └─────────────┘
```

</div>

---

## 🛡️ 3-Stage Safety Pipeline

Every command is validated before you can even click run:

```
Command String
      │
      ▼
┌─────────────────┐
│  1. Syntax Check │  bash -n (dry run — catches malformed commands)
└────────┬────────┘
         │ ✓
         ▼
┌─────────────────┐
│  2. Blacklist   │  regex (rm -rf /, fork bombs, disk wipes...)
└────────┬────────┘
         │ ✓
         ▼
┌─────────────────┐
│  3. LLM Semantic│  rates: low / medium / high risk
└────────┬────────┘
         │
         ▼
   🟢 low  →  run directly
   🟡 medium  →  show warning
   🔴 high  →  confirmation modal required
```

---

## ⚙️ Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# Ollama running with a model
ollama serve
ollama pull mistral
```

### Install & run

```bash
git clone https://github.com/murahari1/LLM-Powered-Autonomous-Agent
cd LLM-Powered-Autonomous-Agent

# One-command setup
./install.sh

# Start everything
./start.sh
```

Or manually:

```bash
npm run install:all
npm start
```

Open **http://localhost:5173** — backend runs on **:3000**

---

## 🔐 Environment Variables

```bash
# backend/.env
GEMINI_API_KEY=your_key_here   # optional — fallback only
PORT=3000
```

Gemini is **never called** while Ollama is reachable. It's purely a network fallback.

---

## 💡 Example Prompts

<div align="center">

| Prompt | What happens |
|--------|-------------|
| `update my system` | Runs `sudo pacman -Syu` — streams full output live |
| `show disk usage` | Runs `df -h` — displays instantly |
| `install docker` | High-risk → confirmation modal appears |
| `find files larger than 1GB` | Safe, runs immediately |
| `check what's listening on port 3000` | `ss -tlnp \| grep 3000` |

</div>

---

## ⌨️ Keyboard Shortcuts

<div align="center">

| Key | Action |
|-----|--------|
| `S` | Toggle settings drawer |
| `Esc` | Close settings drawer |
| `Enter` | Send message |

</div>

---

## 📂 Project Structure

```
LLM-Powered-Autonomous-Agent/
├── backend/
│   ├── server.js                     ← Express + Socket.IO
│   ├── routes/createApiRouter.js     ← REST API
│   └── services/
│       ├── LLMService.js             ← Ollama / Gemini abstraction
│       ├── CommandProcessor.js       ← Validation + execution
│       ├── TerminalManager.js        ← node-pty sessions
│       ├── CommandValidator.js       ← 3-stage pipeline
│       └── SessionManager.js        ← Per-session history
├── frontend/
│   └── src/
│       ├── pages/Index.jsx           ← Main app
│       ├── components/
│       │   ├── CommandBlock.jsx      ← Command cards w/ risk colors
│       │   ├── TerminalPanel.jsx     ← xterm.js + PTY resize sync
│       │   └── frontend-shell/
│       │       ├── SettingsDrawer.jsx
│       │       ├── ConfirmModal.jsx
│       │       └── HistoryPanel.jsx
│       └── hooks/useWebSocket.jsx   ← Socket.IO hook
├── Linux-AI-Assistant.pdf            ← Project docs
├── install.sh
├── start.sh
└── package.json
```

---

## 👨‍💻 Authors

<div align="center">

| | Name | GitHub |
|-|------|--------|
| 🧑‍💻 | **Murahari** | [@murahari1](https://github.com/murahari1) |
| 🧑‍💻 | **Poornendra** | [@poornendraparavasthu](https://github.com/poornendraparavasthu) |
| 🧑‍💻 | **Swathi** | [@Swathimengani](https://github.com/Swathimengani) |
| 🧑‍💻 | **Shrushti** | [@shrushti405](https://github.com/shrushti405) |

</div>

---

<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,40:0a3d62,70:1a1a2e,100:0d1117&height=120&section=footer"/>

**MIT License** · Built with Node.js, React, Ollama, and xterm.js

⭐ Star this repo if it helped you!

</div>
