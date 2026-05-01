# Propozycja Architektury Technicznej - Nomous.ia (Faza 1)

Wizja opiera się na stworzeniu "Chat-first UI", gdzie interfejs rozmowy z asystentem AI jest głównym elementem ekranu. Poniżej znajduje się rekomendowany stos technologiczny dopasowany do szybkiego dostarczenia skalowalnego MVP (Minimum Viable Product).

## 1. Architektura Systemu (Overview)

Aplikacja będzie się składać z trzech głównych warstw:
* **Frontend (Web App):** Interfejs użytkownika (UI) z widokiem spraw i panelem konwersacyjnym.
* **Backend (API & Orchestrator):** Serwer zarządzający autoryzacją, sprawami i sterujący tzw. "łańcuchami myślowymi" (LLM Chains).
* **AI & Dane (RAG Pipeline):** Mechanika OCR, Baza Wektorowa oraz połączenie z modelami LLM (BYOK).

## 2. Proponowany Tech Stack (Zalecany)

### 2.1. Frontend (Interfejs Użytkownika)
* **Framework:** Next.js (React) + TypeScript.
    * *Dlaczego:* Idealny do szybkiego tworzenia interfejsów opartych na stanie (Chat UI wymaga płynnego aktualizowania wiadomości).
* **Styling:** Tailwind CSS + komponenty shadcn/ui.
    * *Dlaczego:* Pozwala na błyskawiczne i estetyczne zbudowanie interfejsu przypominającego środowiska IDE/AI (panele boczne, czat).
* **Zarządzanie stanem chatu:** Vercel AI SDK (lub dedykowana logika w React).
    * *Dlaczego:* Moduł Vercel AI SDK posiada świetne wbudowane hooki (`useChat`) do obsługi strumieniowania odpowiedzi (streaming) od modeli LLM.

### 2.2. Backend (Logika Biznesowa & API)
* **Środowisko:** Python (FastAPI).
    * *Rekomendacja:* Python jest natywnym środowiskiem dla operacji AI (LangChain, LlamaIndex), ciężkiej obróbki plików (OCR, chunking) oraz budowy crawlerów (Playwright). FastAPI zapewni asynchroniczność i olbrzymią wydajność.
* **Baza Danych Relacyjna:** PostgreSQL (Self-hosted na serwerze Ubuntu).
    * *Przeznaczenie:* Przechowywanie użytkowników, konfiguracji BYOK (bezpieczne, szyfrowane klucze API), struktury spraw i metadanych. Brak zależności od zewnętrznych serwisów (BaaS) gwarantuje 100% kontroli nad danymi wrażliwymi.
* **Magazyn Plików (Object Storage / Local Storage):** System plików serwera (Linux /mnt) za warstwą serwera WWW lub MinIO (Self-hosted S3-compatible).
    * *Przeznaczenie:* Składowanie fizycznych plików z zachowaniem całkowitej prywatności na własnej maszynie.

### 2.3. Warstwa AI (RAG & Przetwarzanie)
* **Orkiestracja LLM:** LangChain (Python) lub LlamaIndex.
    * *Dlaczego:* Umożliwia wdrożenie zaawansowanych pipeline'ów "Chat with documents".
* **Baza Wektorowa:** Pinecone (Serverless) lub Qdrant (Self-hosted na Ubuntu).
    * *Rekomendacja:* Jeśli chcemy zmaksymalizować prywatność, możemy postawić darmowy, potężny silnik wektorowy Qdrant na własnym serwerze obok PostgreSQL. Ewentualnie pozostajemy przy Pinecone dla wygody startu.
* **Embeddings Model:** np. `text-embedding-3-small` (OpenAI).
* **OCR:** Tesseract lub inne narzędzia open-source wykonywane w izolowanym kontenerze.

### 2.4. Crawlery (Moduł zewnętrznego researchu)
* **Narzędzie:** Python + Playwright / BeautifulSoup4.
    * *Działanie:* Pobieranie metadanych spraw z darmowych baz (uruchamiane jako Background Tasks w FastAPI).

### 2.5. Środowisko Wdrożeniowe (Deployment - Self-Hosted)
* **Serwer:** Dedykowany serwer VPS (np. AWS EC2 Ubuntu), zapewniający pełną jurysdykcję nad danymi klienta (kluczowy argument sprzedażowy dla kancelarii).
* **Konteneryzacja:** Docker + Docker Compose.
    * *Zastosowanie:* Izolacja środowisk (osobny kontener dla Next.js, FastAPI, PostgreSQL, i ewentualnie bazy Qdrant oraz instancji Nginx-a jako Reverse Proxy z certyfikatami Let's Encrypt SSL).
