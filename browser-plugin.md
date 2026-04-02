# Product Requirements Document (PRD): LegalFlow Browser Extension (Full Spec)

**Wersja:** 1.2 (Comprehensive)  
**Data:** 17 marca 2026 r.  
**Komponent:** Rozszerzenie Wieloplatfomowe (Chrome, Edge, Safari macOS/iOS)  
**Status:** Dokumentacja wykonawcza  

---

## 1. Cel i Definicja Produktu

**LegalFlow Automator** to rozszerzenie przeglądarkowe typu "Bridge", którego zadaniem jest bezinwazyjne pobieranie danych z Portali Informacyjnych Sądów Powszechnych (PISP)

**Kluczowa wartość:** Eliminacja ręcznego kopiowania danych ("Copy-Paste") oraz obejście limitów zapytań (rate limits) poprzez wykonywanie operacji w kontekście legalnej sesji użytkownika.

---

## 2. Architektura i Środowisko (Host Permissions)

### 2.1. Zakres Domenowy

Plugin musi posiadać uprawnienia `host_permissions` dla wszystkich apelacji regionalnych w Polsce:

* `https://*.portal.wroclaw.sa.gov.pl/*`
* `https://*.portal.warszawa.sa.gov.pl/*`
* `https://*.portal.poznan.sa.gov.pl/*`
* `https://*.portal.gdansk.sa.gov.pl/*`
* `https://*.portal.katowice.sa.gov.pl/*`
* `https://*.portal.krakow.sa.gov.pl/*`
* `https://*.portal.lublin.sa.gov.pl/*`
* `https://*.portal.bialystok.sa.gov.pl/*`
* `https://*.portal.lodz.sa.gov.pl/*`
* `https://*.portal.rzeszow.sa.gov.pl/*`
* `https://*.portal.szczecin.sa.gov.pl/*`
* `https://*.ms.gov.pl/*` (Portal Orzeczeń i KRS API)

### 2.2. Standard Techniczny

* **Engine:** Manifest V3 (Chrome/Edge).
* **Safari Support:** Wykorzystanie `safari-web-extension-converter` dla macOS i iOS (App Wrapper w Swift).
* **Polyfills:** Zastosowanie `webextension-polyfill` dla zapewnienia kompatybilności `browser.*` API na różnych silnikach.

---

## 3. Funkcjonalności Szczegółowe

### 3.1. Mechanizm Autoryzacji (Session Sharing)
* **Brak pośrednictwa w logowaniu:** Plugin nie prosi o login/hasło do Profilu Zaufanego.

* **Detekcja Sesji:** `content_script.js` monitoruje obecność ciasteczek sesyjnych portalu. W przypadku braku sesji, plugin wyświetla powiadomienie z przyciskiem przekierowującym do logowania.
* **CORS Bypass:** Wykorzystanie uprawnień rozszerzenia do wysyłania zapytań do własnego API bez ograniczeń Same-Origin Policy.

### 3.2. Ekstrakcja Danych (Scraping & Parsing)
* **Widok Listy Spraw:** Automatyczne parsowanie tabeli głównej w celu pobrania sygnatur, statusów i dat ostatnich czynności.
* **Widok Szczegółów Sprawy:** * Pobieranie składu sędziowskiego (Przewodniczący, sprawozdawcy).
    * Pobieranie danych stron (powód, pozwany, pełnomocnicy) z automatycznym wyszukiwaniem ich numerów KRS w tle.
    * Eksport historii dokumentów (nazwa pisma, data, status doręczenia).
* **Pobieranie Plików:** Możliwość pobrania PDF/DOCX z akt sprawy bezpośrednio do chmury LegalFlow (wykorzystanie `XHR/Fetch` z nagłówkami aktywnej sesji).

### 3.3. Interfejs Użytkownika (UI Injection)
* **Floating Action Button (FAB):** Przycisk "Importuj sprawę" wstrzykiwany w prawym dolnym rogu strony PISP.
* **Grid Buttons:** Przycisk "Sync" dodawany w każdym wierszu tabeli spraw.
* **Contextual Suggestions:** Wstrzykiwanie linków do podobnych orzeczeń z bazy **SAOS** bezpośrednio pod sygnaturą w portalu PISP (tzw. "Smart Insights").

---

## 4. Integracje Zewnętrzne

### 4.1. SAOS (System Analizy Orzeczeń Sądowych)
* Plugin wysyła sygnaturę do Backend LegalFlow.
* Backend odpytuje SAOS API.
* Plugin wyświetla w popupie lub sidebarze treść uzasadnienia z SAOS, jeśli jest dostępne dla danej sprawy.

### 4.2. KRS API
* Plugin wykrywa nazwy firm w aktach sprawy.
* Backend pobiera odpis z KRS i przesyła go do pluginu w celu wyświetlenia danych reprezentacji podmiotu.

---

## 5. Bezpieczeństwo i Prywatność (Compliance)
* **Szyfrowanie:** Wszystkie dane (JSON) przesyłane do backendu są szyfrowane (TLS 1.3).
* **Local Processing:** Parsowanie HTML odbywa się w "Isolated World" przeglądarki – skrypty PISP nie widzą działania pluginu.
* **RODO:** Minimalizacja przesyłanych danych osób fizycznych (opcjonalna anonimizacja na poziomie klienta).

---

## 6. Obsługa Błędów (Error Management)
* **Selector Monitoring:** W przypadku zmiany struktury HTML przez MS, plugin wysyła anonimowy raport o błędzie selektora.
* **Offline Storage:** `chrome.storage.local` przechowuje kolejkę synchronizacji w przypadku braku stabilnego łącza.

---

**Podpisano:** System Gemini (AI Collaborator)