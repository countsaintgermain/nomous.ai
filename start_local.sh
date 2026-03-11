#!/bin/bash

# Ustawienie kolorow dla logow
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=====================================${NC}"
echo -e "${YELLOW}      START NOMOUS.IA DOCKER         ${NC}"
echo -e "${YELLOW}=====================================${NC}\n"

# 1. Sprawdzanie kluczy
echo -e "Weryfikacja środowiska AI w pliku backend/.env..."

MISSING_KEYS=0
# Prosty check czy plik istnieje
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}[+] Znaleziono backend/.env${NC}"
else
    echo -e "${RED}[-] Nie znaleziono pliku backend/.env. Skopiuj backend/.env.example do backend/.env i uzupełnij klucze!${NC}"
    MISSING_KEYS=1
fi

if [ $MISSING_KEYS -eq 1 ]; then
    echo -e "\n${YELLOW}Wskazówka: ${NC}Upewnij się, że posiadasz prawidłowe klucze OPENAI_API_KEY, PINECONE_API_KEY, GOOGLE_API_KEY w pliku .env."
    echo ""
fi

# 2. Uruchamianie calego stosu dockera
echo -e "${GREEN}[1/1] Podnoszenie kontenerów (Postgres, Redis, API, Worker, Frontend)...${NC}"
docker compose up --build -d

echo -e "\n${YELLOW}=====================================${NC}"
echo -e "${GREEN}   Wszystkie usługi wystartowały!    ${NC}"
echo -e "${YELLOW}=====================================${NC}"
echo -e "Gotowa Platforma (Portal Klienta): ${GREEN}http://localhost:3000${NC}"
echo -e "Struktura API (Backend/Swagger):   ${YELLOW}http://localhost:8000/docs${NC}"
echo -e "\nAby zobaczyć logi na żywo, wpisz: ${YELLOW}docker compose logs -f${NC}"
echo -e "Aby zamknąć środowisko, wpisz: ${RED}docker compose down${NC}\n"
