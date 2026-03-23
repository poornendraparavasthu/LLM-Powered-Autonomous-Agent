# 🚀 Linux AI Assistant

An **LLM-powered autonomous Linux agent** that can:

* 🧠 Understand natural language
* ⚙️ Generate Linux commands
* 📚 Explain commands using local LLM
* 🖥️ Execute commands in a real terminal
* 🔁 Learn from previous executions (RAG)

---

## ✨ Features

* 🔹 **Task Planning (Local LLM - Mistral)**
* 🔹 **Command Generation (Local LLM + Gemini fallback)**
* 🔹 **Command Explanation (Local LLM)**
* 🔹 **Real-time Terminal Execution**
* 🔹 **Risk Classification (low / medium / high)**
* 🔹 **RAG-based Knowledge System**
* 🔹 **WebSocket-powered Interactive UI**

---

## 🧠 Architecture

```
User Prompt
     ↓
Planner (Local LLM - Mistral)
     ↓
Task Simplifier
     ↓
RAG Knowledge Base
     ↓
Local LLM Command Generator
     ↓
Gemini Fallback (if needed)
     ↓
Command Validator
     ↓
Execution (PTY Terminal)

Explain Button
     ↓
Local LLM (Ollama)
```

---

## 🛠️ Tech Stack

* **Frontend**: React + TailwindCSS
* **Backend**: Node.js + WebSocket
* **Terminal**: node-pty
* **LLM (Local)**: Ollama (Mistral)
* **Fallback LLM**: Google Gemini API
* **RAG System**: Custom lightweight knowledge store

---

## ⚡ Installation

### 1. Clone the repository

```bash
git clone https://github.com/murahari1/LLM-Powered-Autonomous-Agent
cd LLM-Powered-Autonomous-Agent
```

---

### 2. Run installer

```bash
./install.sh
```

This will:

* Install Node.js & dependencies
* Install Ollama
* Pull Mistral model
* Ask for your Gemini API key
* Create `.env` automatically

---

### 3. Start the project

```bash
./start.sh
```

---

## 🌐 Access

* Frontend → http://localhost:5173
* Backend → http://localhost:3000

---

## 💡 Example Prompts

Try these:

```
Install docker
Check disk usage
Find large files
Setup firewall
```

---

## 🖥️ Example Output

```
Step 1: install docker
$ sudo pacman -S docker

Step 2: start docker
$ sudo systemctl start docker
```

Click **Explain** to get:

```
This command installs Docker using the pacman package manager.

sudo → runs as administrator  
pacman → Arch Linux package manager  
-S → install package  
docker → container engine  
```

---

## 📂 Project Structure

```
LLM-Powered-Autonomous-Agent/
├── backend/
│   ├── planner.js
│   ├── gemini.js
│   ├── server.js
│   └── rag/
├── frontend/
│   └── src/
├── install.sh
├── start.sh
└── README.md
```

---

## 🔐 Environment Variables

Created automatically:

```
backend/.env
```

```
GEMINI_API_KEY=your_api_key
```

---

## 🧩 Key Components

### 🔹 Planner

Breaks user input into tasks using local LLM

### 🔹 Command Generator

* Local LLM first
* Gemini fallback

### 🔹 RAG System

Stores and reuses known commands

### 🔹 Validator

Prevents dangerous commands

### 🔹 Terminal

Executes commands in real-time

---

## 🚀 Future Improvements

* 🔁 Automatic error fixing (self-healing agent)
* 🧠 Memory-based reasoning
* 🐳 Docker support
* 📊 Command history analytics
* 🌍 Multi-distro optimization

---

## 🤝 Contributing

Pull requests are welcome.

If you have ideas to improve the agent, feel free to contribute.

---

## 📜 License

MIT License

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!

---

## 👨‍💻 Author

Built by **Hari**
