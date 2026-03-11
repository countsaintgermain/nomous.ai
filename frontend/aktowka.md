# PRD - Moduł Aktówka (Briefcase)

## 1. Cel funkcjonalności
Aktówka to centralne repozytorium wiedzy o sprawie. Umożliwia gromadzenie dokumentów, dowodów i linków, ich automatyczną analizę oraz budowanie "bazy faktów" sprawy, która zasila głównego agenta AI.

## 2. Zakres funkcjonalności (MVP)

### 2.1. Zarządzanie dokumentami
*   **Upload plików:** PDF, JPG, PNG, ODT, DOCX. (Rezygnacja z .pages w MVP).
*   **Brak limitów wielkości:** Na etapie MVP nie wprowadzamy sztucznych ograniczeń wagowych (użytkownik jest informowany o czasie przetwarzania).
*   **Dodawanie linków:** Automatyczny scraping treści (Playwright-Python).
*   **Kategoryzacja:** Tagi: "Dokument", "Dowód", "Inne" (domyślny: Dokument).
*   **Przeglądarka:** Podgląd treści wyekstrahowanej oraz (jeśli możliwe) pliku źródłowego.

### 2.2. Przetwarzanie asynchroniczne (Pipeline)
*   **System kolejkowy:** TaskIQ + Redis.
*   **OCR:** PaddleOCR (rozwiązanie Open Source o wysokiej jakości dla dokumentów prawnych).
*   **Wektoryzacja:** Chunking (RecursiveCharacterTextSplitter) + OpenAI Embedding.
*   **Prywatność (Namespaces):** Każda sprawa (`case_id`) posiada własny Namespace w Pinecone. Gwarantuje to 100% separacji danych między sprawami/użytkownikami.

### 2.3. Agent "Analizator Dokumentu"
*   **Interface:** Dedykowany czat wywoływany dla konkretnego dokumentu.
*   **Funkcje:** Streszczenie, Wykrywanie bytów (Osoby, Kwoty, Daty).
*   **Akcje:** Przycisk "Zapisz fakt/termin" bezpośrednio w czacie.
*   **Weryfikacja:** Każda informacja z AI zawiera cytat z dokumentu źródłowego.

### 2.4. Kontekst Sprawy (Case Fact-Base)
*   **Tabela Faktów:** Zamiast nieskończonego streszczenia, system buduje atomową bazę faktów (JSON/DB).
*   **Synchronizacja:** Główne AI sprawy widzi te fakty w swoim system prompcie.

### 2.5. Usuwanie i Integralność
*   **Full Cleanup:** Usunięcie dokumentu z Aktówki usuwa go z DB oraz czyści wszystkie powiązane wektory w Pinecone (usuwamy "wszelkie ślady").
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
*   `POST /api/cases/{id}/documents/{doc_id}/analyze` - Start agenta.
*   `GET /api/cases/{id}/facts` - Pobranie bazy faktów.
