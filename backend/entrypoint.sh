#!/bin/bash
set -e

VENV_PATH="/app/venv"

echo "Checking virtual environment at $VENV_PATH..."
if [ ! -d "$VENV_PATH" ]; then
    echo "Creating Python virtual environment in $VENV_PATH (shared with host)..."
    python3 -m venv "$VENV_PATH"
fi

echo "Activating virtual environment..."
export PATH="$VENV_PATH/bin:$PATH"

echo "Installing requirements..."
pip install --no-cache-dir --upgrade pip setuptools wheel
pip install --no-cache-dir -r /app/requirements.txt
pip install --no-cache-dir playwright

# Zainstaluj binarki chromium z poziomu venv (skrypty/binarki playwright)
# Przeglądarki i tak są pobrane do /ms-playwright w obrazie globalnym,
# ale playwright w venv potrzebuje wiedzieć, że tam są (poprzez ENV)
playwright install chromium

echo "Starting application with command: $@"
exec "$@"
