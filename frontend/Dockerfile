FROM node:22-alpine

WORKDIR /app

# Skopiowanie plików package.json do cache'owania npm install
COPY package.json package-lock.json* ./

# Instalacja zależności
RUN npm install

# Kopiowanie całego kodu źródłowego
COPY . .

# Port
EXPOSE 3000

# Komenda uruchomienia dev servera z obsługą reładowania
CMD ["npm", "run", "dev"]
