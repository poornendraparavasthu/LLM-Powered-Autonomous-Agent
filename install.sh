#!/usr/bin/env bash

set -e

echo "======================================"
echo " Linux AI Assistant Installer"
echo "======================================"
echo ""

echo "Detecting Linux distribution..."

if command -v pacman >/dev/null 2>&1; then
    DISTRO="arch"
elif command -v apt >/dev/null 2>&1; then
    DISTRO="debian"
elif command -v dnf >/dev/null 2>&1; then
    DISTRO="fedora"
else
    echo "Unsupported Linux distribution."
    exit 1
fi

echo "Detected: $DISTRO"
echo ""

echo "Installing system dependencies..."

if [ "$DISTRO" = "arch" ]; then
    sudo pacman -Sy --needed --noconfirm nodejs npm git curl

elif [ "$DISTRO" = "debian" ]; then
    sudo apt update
    sudo apt install -y nodejs npm git curl

elif [ "$DISTRO" = "fedora" ]; then
    sudo dnf install -y nodejs npm git curl
fi

echo ""
echo "Node version:"
node -v
npm -v
echo ""

echo "Installing root dependencies..."
npm install

echo ""
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "Checking Ollama installation..."

if ! command -v ollama >/dev/null 2>&1; then
    echo "Installing Ollama..."
    OLLAMA_INSTALLER="$(mktemp /tmp/ollama-install-XXXXXX.sh)"
    curl -fsSL -o "$OLLAMA_INSTALLER" https://ollama.com/install.sh
    echo ""
    echo "Review the installer at $OLLAMA_INSTALLER before proceeding."
    read -p "Proceed with Ollama installation? [y/N] " CONFIRM_OLLAMA
    if [ "$CONFIRM_OLLAMA" = "y" ] || [ "$CONFIRM_OLLAMA" = "Y" ]; then
        bash "$OLLAMA_INSTALLER"
    else
        echo "Ollama installation skipped. Install manually from https://ollama.com"
    fi
    rm -f "$OLLAMA_INSTALLER"
else
    echo "Ollama already installed."
fi

echo ""
echo "Pulling Mistral model..."
ollama pull mistral

echo ""
echo "======================================"
echo " Gemini API Setup"
echo "======================================"
echo ""

read -p "Enter your Gemini API key (or press Enter to skip): " GEMINI_KEY

echo ""
echo "Creating backend/.env file from .env.example..."

if [ -f backend/.env.example ]; then
    cp backend/.env.example backend/.env
else
    echo "PORT=3000" > backend/.env
    echo "LLM_PROVIDER=ollama" >> backend/.env
    echo "OLLAMA_URL=http://127.0.0.1:11434" >> backend/.env
    echo "OLLAMA_MODEL=mistral" >> backend/.env
    echo "GEMINI_MODEL=gemini-2.5-flash" >> backend/.env
    echo "EXECUTION_TIMEOUT_MS=30000" >> backend/.env
    echo "SESSION_TTL_MS=1800000" >> backend/.env
    echo "RATE_LIMIT_WINDOW_MS=60000" >> backend/.env
    echo "RATE_LIMIT_MAX=30" >> backend/.env
    echo "ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173" >> backend/.env
fi

if [ -n "$GEMINI_KEY" ]; then
    sed -i "s|^GEMINI_API_KEY=.*|GEMINI_API_KEY=$GEMINI_KEY|" backend/.env
    echo "Gemini API key configured."
else
    echo "Skipped Gemini API key. You can add it later in backend/.env"
fi

echo ""
echo "======================================"
echo " Installation Complete"
echo "======================================"
echo ""
echo "Run the project with:"
echo ""
echo "./start.sh"
echo ""
