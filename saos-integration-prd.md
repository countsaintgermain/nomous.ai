# PRD: Integracja z systemem SAOS (System Analizy Orzeczeń Sądowych)

## 1. Cel i Motywacja (Objective)
Zapewnienie użytkownikom możliwości wyszukiwania, przeglądania i zapisywania orzeczeń sądowych bezpośrednio z poziomu aplikacji (z wykorzystaniem API saos.org.pl). Dodatkowo, wyposażenie asystenta AI w narzędzie (MCP) pozwalające na samodzielne wyszukiwanie orzeczeń, ich analizę oraz wsparcie w budowaniu linii orzeczniczej do sprawy.

## 2. Zakres i Wpływ (Scope & Impact)
Funkcjonalność obejmuje zarówno warstwę Frontend, Backend, bazę danych, jak i integrację z czatem AI.

*   **Frontend:**
    *   Nowy widok wyszukiwarki SAOS.
    *   Widok szczegółów orzeczenia SAOS.
    *   Nowy widok zapisanych orzeczeń z podziałem na zakładki (wzorem PISP): "Zapisane ręcznie" i "Pobrane przez AI".
*   **Backend:**
    *   Nowy serwis integrujący się z publicznym API SAOS (`https://www.saos.org.pl/api/`).
    *   Zarządzanie zapisanymi orzeczeniami w bazie danych.
    *   MCP (Model Context Protocol) wystawiający narzędzia dla agenta AI.
*   **Baza Danych:**
    *   Nowy model/tabela do przechowywania zapisanych orzeczeń ze wskazaniem źródła (użytkownik vs AI) oraz przypisaniem do sprawy/użytkownika.

## 3. Proponowane Rozwiązanie (Proposed Solution)

### 3.1. Frontend - Interfejs Użytkownika
1.  **Widok Wyszukiwarki SAOS:**
    *   Główne pole tekstowe do wprowadzania zapytań (słowa kluczowe).
    *   Rozwijany panel (Accordion/Collapsible) z zaawansowanymi filtrami, odwzorowującymi stronę SAOS (m.in. typ sądu, data wydania od/do, sygnatura akt, sędzia).
    *   Lista wyników prezentująca skrócone informacje o orzeczeniach (sygnatura, data, sąd, fragment uzasadnienia).
2.  **Widok Szczegółów Orzeczenia:**
    *   Zamiast przekierowania na zewnętrzną stronę, kliknięcie w wynik otwiera dedykowany widok wewnątrz aplikacji.
    *   Treść orzeczenia, tezy, skład sędziowski, powołane przepisy.
    *   Przycisk "Zapisz do aktówki / Zapisz orzeczenie".
3.  **Zakładki w widoku Zapisanych Orzeczeń:**
    *   Sekcja z orzeczeniami podzielona na dwie zakładki (Tab component z shadcn/ui):
        *   *Zapisane przez użytkownika* (dodane ręcznie ze szczegółów).
        *   *Pobrane przez AI* (orzeczenia, których szczegóły asystent pobrał w trakcie analizy).

### 3.2. Backend - API i Baza Danych
1.  **Integracja SAOS (Proxy/Service):**
    *   Serwis w Pythonie (np. `SaosService`) wykonujący zapytania `GET` do `https://www.saos.org.pl/api/search/judgments` i `https://www.saos.org.pl/api/judgments/{id}`.
    *   Endpointy w naszym API (np. `/api/saos/search`, `/api/saos/{id}`) udostępniające te dane dla Frontendu, aby uniknąć problemów z CORS i scentralizować logikę.
2.  **Model Danych (`SavedJudgment`):**
    *   Pola: `id`, `saos_id`, `signature`, `judgment_date`, `court_name`, `content` (opcjonalnie cache), `source` (enum: `MANUAL`, `AI`), `case_id` (relacja), `created_at`.

### 3.3. Integracja AI (MCP)
1.  **Narzędzia (Tools) dla Czata:**
    *   `search_saos_judgments`: Pozwala AI na wyszukiwanie orzeczeń na podstawie słów kluczowych i filtrów.
    *   `get_saos_judgment_details`: Pobiera pełną treść orzeczenia na podstawie jego ID.
2.  **Logika AI:**
    *   Jeżeli agent użyje narzędzia `get_saos_judgment_details`, Backend automatycznie zapisuje to orzeczenie w bazie danych z flagą `source=AI` (przypisane do aktywnej sprawy/sesji), dzięki czemu pojawia się ono w zakładce "Pobrane przez AI".

## 4. Plan Wdrożenia (Implementation Plan)

*   **Faza 1: Baza Danych i Backend Core**
    *   Dodanie modelu `SavedJudgment` (Drizzle/Alembic - zależnie od tego, gdzie trzymana jest logika, backend jest w Pythonie z Alembic/SQLAlchemy).
    *   Implementacja `SaosService` komunikującego się z publicznym API SAOS.
    *   Stworzenie endpointów REST do wyszukiwania i pobierania szczegółów.
*   **Faza 2: MCP i AI**
    *   Zarejestrowanie narzędzi SAOS w logice czata.
    *   Implementacja mechanizmu automatycznego zapisu orzeczenia jako "Pobrane przez AI" po wywołaniu narzędzia detali.
*   **Faza 3: Frontend - UI/UX**
    *   Implementacja widoku wyszukiwarki (główny input + rozwijane filtry `Lucide React`, `shadcn/ui`).
    *   Implementacja widoku szczegółów orzeczenia z akcją zapisu ręcznego.
    *   Dodanie zakładek ("Zapisane ręcznie", "Pobrane przez AI") w odpowiednim widoku (np. Aktówka / Case Details).
*   **Faza 4: Testy i Walidacja**
    *   Weryfikacja integracji z SAOS.
    *   Testy narzędzi AI.

## 5. Weryfikacja (Verification)
1.  Czy wyszukiwarka poprawnie mapuje filtry na zapytania do SAOS i zwraca wyniki?
2.  Czy szczegóły orzeczenia otwierają się poprawnie w aplikacji i pozwalają na zapis?
3.  Czy po użyciu przez AI narzędzia do pobierania szczegółów, orzeczenie ląduje w odpowiedniej zakładce?
4.  Czy widok zapisanych orzeczeń posiada działające zakładki zgodnie z założeniami?