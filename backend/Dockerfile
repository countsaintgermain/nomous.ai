FROM python:3.13-slim

# Instalacja zależności systemowych
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    python3-dev \
    libpq-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalacja najnowszego pip i setuptools dla 3.13
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Kopiowanie i instalacja wymagań
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Domyślna komenda
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
