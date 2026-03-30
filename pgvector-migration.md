# Background & Motivation
Migracja wektorowej bazy danych z zewnętrznej usługi Pinecone do PostgreSQL za pomocą natywnego rozszerzenia `pgvector`. 
Dzięki temu pozbędziemy się osobnego serwisu, uprościmy stack technologiczny i zyskamy potężną możliwość tzw. zapytań hybrydowych (Hybrid Search) – jednoczesnego filtrowania relacyjnego (np. po ID sprawy - `case_id`) oraz wyszukiwania semantycznego na wektorach w jednym zapytaniu SQL. Redukuje to również potencjalne koszty przy skalowaniu.

# Scope & Impact
- Zmiana obrazu bazy danych w `docker-compose.yml`.
- Dodanie nowych zależności do backendu.
- Aktualizacja schematu bazy danych (Alembic) – włączenie rozszerzenia `vector` oraz utworzenie tabeli pod wektory (chunkowanie dokumentów).
- Refaktoryzacja logiki parsowania i przeszukiwania dokumentów w `document_parser.py` / `chat_service.py` z Pinecone API na zapytania SQLAlchemy.
- Usunięcie pakietu i zmiennych Pinecone.

# Proposed Solution & Implementation Steps

## Krok 1: Zmiana infrastruktury (Docker)
- W pliku `docker-compose.yml` zmienimy obraz bazy z `postgres:15-alpine` na `pgvector/pgvector:pg15`. Ponieważ korzystamy z tej samej bazy bazowej (PG 15), dotychczasowy wolumen `postgres_data_dev` powinien zostać poprawnie podpięty bez utraty danych relacyjnych.

## Krok 2: Zależności i konfiguracja
- Dodanie paczki `pgvector` (oraz upewnienie się, że mamy zaktualizowane `SQLAlchemy`) do `backend/requirements.txt`.

## Krok 3: Migracje bazy danych (Alembic)
- Wygenerowanie nowej migracji w Alembic.
- Dodanie komendy aktywującej rozszerzenie w funkcji upgrade: `op.execute('CREATE EXTENSION IF NOT EXISTS vector')`.
- Utworzenie nowego modelu SQLAlchemy `DocumentChunk` w `app/models/document.py` (lub w nowym pliku), który będzie zawierał:
  - `id` (Primary Key)
  - `document_id` (ForeignKey do dokumentu, kaskadowe usuwanie)
  - `content` (Tekst - fragment dokumentu)
  - `embedding` (Kolumna typu `Vector` o wymiarze używanego modelu, np. 768)

## Krok 4: Refaktoryzacja serwisów
- **Zapis (Wektoryzacja):** Modyfikacja kodu, który obecnie używa Pinecone do wrzucania embeddingów. Nowy kod podzieli dokument na chunki, wygeneruje wektory z LLM (tak jak do tej pory) i po prostu zapisze obiekty `DocumentChunk` w bazie (przez `db.add_all()` i `db.commit()`).
- **Odczyt (Wyszukiwanie/RAG):** Modyfikacja funkcji budującej kontekst dla czatu (prawdopodobnie w `chat_service.py`). Zamiast odpytywać Pinecone, zastosujemy zapytanie SQLAlchemy np. `DocumentChunk.embedding.cosine_distance(question_embedding)`, dodając filtry relacyjne (`filter(Document.case_id == id)`).

## Krok 5: Cleanup
- Usunięcie bibliotek Pinecone z `requirements.txt`.
- Wyczyszczenie zmiennych środowiskowych `PINECONE_API_KEY` itd. z `.env` i dokumentacji.

# Verification
- Uruchomienie przebudowanych kontenerów (szczególnie `db` i `api`).
- Wgranie nowego dokumentu i sprawdzenie, czy wiersze w tabeli `document_chunks` pojawiają się z wypełnionymi wektorami.
- Przetestowanie czatu z dokumentami w aplikacji (wygenerowanie zapytania odesłanego na frontend i weryfikacja kontekstu).

# Migration & Rollback
- W przypadku konfliktów obrazu Dockera na środowisku lokalnym konieczne może być zrobienie zrzutu `pg_dump`, usunięcie i odtworzenie wolumenu Dockera i wgranie danych (`pg_restore`).
- Istniejące wektory z Pinecone nie będą przenoszone 1:1 – zamiast tego zostanie uruchomiony jednorazowy skrypt (np. reindeksujący), który przejdzie po tekstach w `documents` i wygeneruje wektory ponownie do bazy lokalnej (jeśli to środowisko developerskie to można po prostu wygenerować je na nowo wrzucając ponownie pliki, albo stworzymy skrypt `reindex_all.py`).
