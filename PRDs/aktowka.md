# PRD - Moduł Aktówka (Briefcase)

## 1. Cel funkcjonalności
Aktówka to centralne repozytorium wiedzy o sprawie. Umożliwia gromadzenie dokumentów, dowodów i linków, ich manualną lub automatyczną analizę oraz budowanie "bazy faktów" sprawy, która zasila głównego agenta AI.

## 2. Zakres funkcjonalności (MVP)

### 2.1. Interfejs Użytkownika i Nawigacja
*   **Umiejscowienie:** Osobny widok w ramach konkretnej sprawy.
*   **Nawigacja:** Pozycja w kontekstowym, lewym menu nawigacyjnym (sidebar), widoczna dopiero po wejściu w szczegóły sprawy.

### 2.2. Zarządzanie dokumentami
*   **Upload plików:** PDF, JPG, PNG, ODT, DOCX. (Rezygnacja z .pages w MVP).
*   **Brak limitów wielkości:** Na etapie MVP nie wprowadzamy sztucznych ograniczeń wagowych (użytkownik jest informowany o czasie przetwarzania).
*   **Dodawanie linków:** Automatyczny scraping treści (Playwright-Python).
*   **Kategoryzacja:** Tagi: "Dokument", "Dowód", "Inne" (domyślny: Dokument).
*   **Przeglądarka:** Podgląd treści wyekstrahowanej oraz (jeśli możliwe) pliku źródłowego.

### 2.3. Przetwarzanie asynchroniczne (Pipeline)
*   **System kolejkowy:** TaskIQ + Redis.
*   **OCR:** PaddleOCR (rozwiązanie Open Source o wysokiej jakości dla dokumentów prawnych).
*   **Wektoryzacja:** Chunking (RecursiveCharacterTextSplitter) + OpenAI Embedding.
*   **Prywatność (Namespaces):** Każda sprawa (`case_id`) posiada własny Namespace w Pinecone. Gwarantuje to 100% separacji danych między sprawami/użytkownikami.

### 2.4. Agent "Analizator Dokumentu"
*   **Trigger (Wywołanie):** Analiza i wektoryzacja dokumentu odbywają się NA ŻĄDANIE użytkownika, a nie automatycznie po wgraniu (optymalizacja kosztów i większa kontrola).
*   **Interface:** Dedykowany czat wywoływany dla konkretnego dokumentu.
*   **Funkcje:** Streszczenie, Wykrywanie bytów (Osoby, Kwoty, Daty).
*   **Akcje:** Przycisk "Zapisz fakt/termin" bezpośrednio w czacie.
*   **Weryfikacja:** Każda informacja z AI zawiera cytat z dokumentu źródłowego.

### 2.5. Kontekst Sprawy (Case Fact-Base)
*   **Tabela Faktów:** Zamiast nieskończonego streszczenia, system buduje atomową bazę faktów (JSON/DB).
*   **Synchronizacja (RAG):** Główne AI sprawy ma dostęp do bazy faktów poprzez mechanizm wektorowego wyszukiwania (RAG), co optymalizuje zużycie tokenów (Context Window) – pobierane są tylko fakty relewantne dla aktualnego zapytania.

### 2.6. Usuwanie i Integralność
*   **Full Cleanup:** Usunięcie dokumentu z Aktówki usuwa go z DB oraz czyści wszystkie powiązane wektory w Pinecone (usuwamy "wszelkie ślady").
*   **Usuwanie kaskadowe:** Wraz z dokumentem usuwane są kaskadowo wszystkie powiązane z nim rekordy w tabeli `CaseFact`. Dowód usunięty = fakt nieistniejący.
*   **Deduplikacja:** Hash SHA-256 sprawdzany na poziomie sprawy przed uploadem.

## 3. Plan Wdrożenia (Krok po kroku)

1.  **Fundamenty DB:** Rozszerzenie tabeli `Document` o pola: `status`, `file_hash`, `content_text`, `tag`. Utworzenie tabeli `CaseFact`.
2.  **Infra:** Konfiguracja Redisa i TaskIQ w środowisku backendowym.
3.  **Workers:** Implementacja zadań OCR (PaddleOCR) oraz Scrapingu (Playwright).
4.  **RAG Core:** Logika Namespaces w Pinecone i synchronizacja przy usuwaniu.
5.  **Agent UI:** Budowa interfejsu "Aktówki" w Next.js i czatu dokumentu.

## 4. Specyfikacja Techniczna API
*   `POST /api/cases/{id}/documents` - Upload.
*   `GET /api/cases/{id}/documents` - Lista (z statusami processing/ready).
*   `DELETE /api/cases/{id}/documents/{doc_id}` - Pełne czyszczenie (SQL + Pinecone).
*   `POST /api/cases/{id}/documents/{doc_id}/analyze` - Start agenta i wektoryzacji.
*   `GET /api/cases/{id}/facts` - Pobranie bazy faktów.

## 5. Otwarte Pytania / Wyzwania (Pending Decisions)
1. **[ZAMKNIĘTE] Nawigacja:** Ustalono opcję B – menu kontekstowe widoczne dopiero po wejściu w sprawę.
2. **[ZAMKNIĘTE] Architektura MVP vs Skalowalność:** Decyzja zatwierdzona. Wersja MVP w pełni obsługuje skany bez warstwy tekstowej, wykorzystując infrastrukturę OCR (PaddleOCR) oraz system kolejkowy (Redis + TaskIQ).
3. **[ZAMKNIĘTE] Kontekst AI:** Używamy mechanizmu RAG na zgranulozowanym zbiorze faktów.
4. **[ZAMKNIĘTE] Cykl życia faktów:** Usuwamy je kaskadowo wraz z dokumentem.
