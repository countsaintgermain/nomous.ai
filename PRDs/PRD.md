# Product Requirements Document (PRD) - Nomous.ia (Wersja Robocza)

## 1. Wizja i Cel Produktu
Stworzenie kompleksowej platformy SaaS dla adwokatów i kancelarii prawnych, która automatyzuje, wspomaga i przyspiesza prowadzenie spraw. System działa jako inteligentny partner i asystent (AI), łącząc zarządzanie dokumentami sprawy z potężnymi funkcjami analitycznymi, automatycznym pozyskiwaniem orzecznictwa oraz zarządzaniem terminami.

## 2. Główni Użytkownicy (Target Audience)
* **Adwokaci / Radcowie Prawni:** Prowadzenie spraw, analiza prawna, planowanie strategii procesowej.
* **Aplikanci / Asystenci Prawni:** Zbieranie materiałów dowodowych, wstępna kategoryzacja dokumentów, wyszukiwanie orzecznictwa.
* **Partnerzy zarządzający:** Przegląd obciążenia zespołu, pilnowanie kluczowych terminów (risk management).

## 3. Kluczowe Moduły i Funkcjonalności (Core Features)

### 3.1. Moduł Zarządzania Sprawą i Dokumentami (Cyfrowa Aktówka)
* **Wprowadzanie danych:** Możliwość uploadu skanów (PDF, JPG), dokumentów tekstowych (DOCX) oraz dodawania linków.
* **OCR i Ekstrakcja:** Automatyczne odczytywanie tekstu ze skanów i kategoryzacja dokumentów (np. pozew, odpowiedź na pozew, załącznik, dowód).
* **Indeksowanie:** Każda sprawa stanowi odrębny kontekst wektorowy (RAG - Retrieval-Augmented Generation), z którym AI potrafi pracować.

### 3.2. Partner AI (Analiza i Strategia)
* **Analiza bieżącej sytuacji:** Po wgraniu akt, agent AI (np. bazujący na modelach Gemini) dokonuje streszczenia sprawy i identyfikuje luki w materiale dowodowym.
* **Rekomendacje:** Generowanie propozycji dalszych kroków prawnych (np. "brakuje dowodu doręczenia", "warto powołać świadka X w kontekście zarzutu Y").
* **Draftowanie:** Automatyczne przygotowywanie projektów pism procesowych na podstawie zgromadzonych akt i orzecznictwa.

### 3.3. Moduł Zbierania Materiałów i Orzecznictwa (Scrapery & APIs)
* **Integracja z europejskimi trybunałami (API):** Pobieranie orzecznictwa z TSUE (CURIA), ETPC (HUDOC).
* **Krajowe bazy orzeczeń (Portal Orzeczeń, SN, NSA):** Pobieranie jawnych orzeczeń za pomocą dostępnych API lub dedykowanych scraperów.
* **Web Crawler Sądowy (Zastępstwo adwokata):** Zautomatyzowany skrypt (np. Playwright/Puppeteer) logujący się (za zgodą i w imieniu adwokata) do Portalu Informacyjnego Sądów Powszechnych w celu pobierania nowych pism i orzeczeń w prowadzonych sprawach.

### 3.4. Prywatna Baza Wiedzy Kancelarii (Private Knowledge Base)
* **Zasada Izolacji Danych:** Wszelkie informacje niepubliczne, dokumenty i akta związane ze sprawą są w 100% odizolowane i przechowywane w prywatnej przestrzeni, do której dostęp mają wyłącznie uprawnieni użytkownicy danej kancelarii.
* **Wyszukiwarka Wektorowa (Semantic Search):** Asystent AI oraz mechanizmy wyszukiwania (np. Pinecone, Qdrant) operują wyłącznie w obrębie prywatnego zasobu użytkownika (wgrane akta sprawy oraz orzecznictwo celowo pobrane w ramach jego spraw). Na tym etapie system nie zakłada budowy centralnej, współdzielonej bazy wiedzy.

### 3.5. Moduł Terminów i Linii Czasu (Timeline UI)
* **Ekstrakcja dat (AI/NLP):** Automatyczne wychwytywanie terminów zawitych i procesowych z wgranych pism (np. "7 dni na wniesienie zażalenia" liczone od daty doręczenia).
* **Linia Czasu (Timeline):** Wizualna prezentacja przebiegu sprawy z naniesionymi przeszłymi i nadchodzącymi zdarzeniami (rozprawy, deadliny).
* **System Powiadomień:** Alerty e-mail / push / SMS dla użytkownika o zbliżających się ostatecznych terminach.

## 4. Wyzwania Technologiczne i Architektura (Sugestie)

* **Bezpieczeństwo i Poufność (GDPR/RODO):** Dokumenty prawnicze zawierają dane wrażliwe. Wymagane jest solidne szyfrowanie (at-rest i in-transit) oraz polityka no-training dla przetwarzanych dokumentów przez modele AI.
* **Architektura modeli AI (BYOK - Bring Your Own Key):** System musi być agnostyczny względem wybranego modelu LLM. Użytkownik w ustawieniach wkleja własny klucz API (np. do OpenAI, Anthropic czy Google) lub wybiera klucz domyślny udostępniany przez platformę z możliwością łatwego i szybkiego przełączania silników AI.
* **Scraping i Logowanie do Sądów:** Funkcjonalność odłożona na późniejsze fazy rozwoju (poza obszarem MVP ze względu na kapryśność portali sądowych i MFA/2FA).
* **Baza Danych Wektorowa (Pinecone/ChromaDB):** Niezbędna dla wydajnego systemu "chat with your documents" w obrębie prywatnego zbioru sprawy.

## 5. Faza 1: Surowe MVP (Dla zaprzyjaźnionych kancelarii)
Wersja udostępniana pierwszym użytkownikom pozbawiona będzie wszelkich "ozdobników", skupiając się na twardej wartości dla spraw cywilnych:
1. **Zarządzanie Sprawą i Aktami (Sprawy Cywilne):** Tworzenie kontekstu sprawy (pozew, odpowiedź na pozew, załączniki). Wgrywanie plików tekstowych i skanów PDF.
2. **Interfejs Oparty na Stałym Chacie (Chat-First UI):** Panel konwersacyjny (podobnie jak w IDE lub asystentach AI) jest łatwo dostępnym wysuwanym panelem. widocznym punktem aplikacji na ekranie szczegółów sprawy. Pozwala użytkownikowi na ciągłą asystę AI niezależnie od przeglądania wgranych akt.
3. **Automatyczny Research (Otwarte API i darmowe bazy):** Bezpośrednio po utworzeniu sprawy i wgraniu dokumentów, system automatycznie przeczesuje internet oraz darmowe/jawne bazy orzeczeń (Portal Orzeczeń Sądów Powszechnych, SN, NSA, EUR-Lex) w poszukiwaniu powiązanych informacji. Korzysta z dostępnych API oraz prostego scrapingu ogólnodostępnych, niezabezpieczonych stron.
4. **Chat z Aktami (RAG) pod KPC:** Asystent AI, do którego użytkownik zadaje pytania odnośnie zgromadzonych w sprawie dokumentów własnych oraz *automatycznie dociągniętego badaniem zewnętrznym orzecznictwa*.
5. **Research na polecenie użytkownika** - uzytkownik moze poprosić o poszerzenie researchu o określone zagadnienia, o których AI nie pomyślało. Np. "Poszukaj mi jeszcze informacji o..."
6. **Konfiguracja API AI (BYOK):** Prosty mechanizm do wpięcia własnego klucza API z wybranego modelu chmurowego (wymodelowane pod łatwość zmiany modelu).
7. **Skupienie na AI i Danych:** Pomijamy na tym etapie interfejsy osi czasu (Timeline UI) i integracje z płatnymi serwisami.

## 6. Faza 2: Zaawansowani Agenci i Bazy Komercyjne (Rozwój popremierowy)
Gdy Faza 1 zostanie zwalidowana z sukcesem, platforma zostanie rozbudowana o skomplikowane skrypty (Agentów):
1. **Agenci Scrapujący z Logowaniem:** Dedykowane headless crawlery (np. Playwright z obsługą proxy) symulujące przeglądarkę pod kątem logowania do serwisów zamkniętych.
2. **Integracja z Bazami Komercyjnymi (LEX, Legalis):** Autoryzowane przeszukiwanie komercyjnych baz orzecznictwa przy użyciu poświadczeń/wykupionych subskrypcji użytkownika.
3. **Zautomatyzowany Agent Sądowy:** Bezpośrednie podpięcie pod Portale Informacyjne Sądów Powszechnych, celem automatycznego pobierania pism od razu po ich publikacji w e-Sądzie (z obsługą potwierdzania logowania 2FA).
4. **Zarządzanie Terminami (Timeline UI):** W pełni interaktywna mapa sprawy analizująca terminy procesowe i powiadamiająca o deadlinach.
