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
    curl -fsSL https://ollama.com/install.sh | sh
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

read -p "Enter your Gemini API key: " GEMINI_KEY

if [ -z "$GEMINI_KEY" ]; then
    echo "Gemini API key cannot be empty."
    exit 1
fi

echo ""
echo "Creating backend/.env file..."

echo "GEMINI_API_KEY=$GEMINI_KEY" > backend/.env

echo ".env file created."

echo ""
echo "======================================"
echo " Installation Complete"
echo "======================================"
echo ""
echo "Run the project with:"
echo ""
echo "./start.sh"
echo ""