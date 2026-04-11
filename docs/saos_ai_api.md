# Dokumentacja API SAOS-AI (System Wyszukiwania Semantycznego v5.0)

Wewnętrzne API zaprojektowane do hybrydowego wyszukiwania orzeczeń sądowych (Qdrant), wspierania czatu RAG oraz bezstanowej wektoryzacji dokumentów klienckich.

## Baza url: `http://<api_host>:9001/v1`

Wszystkie żądania do API wymagają następujących nagłówków:
- `Content-Type: application/json` (za wyjątkiem uploadu plików)
- `X-API-Key: <Twoj_Klucz_API>` (wymagane do autoryzacji każdego żądania)

Odpowiedzi zwracane są w formacie JSON.

---

## 1. Wektoryzacja Tekstu (Encode Text - Stateless)
**Endpoint:** `POST /v1/encode/text`

Przyjmuje dowolny tekst. Tekst jest dzielony na chunki, a każdy chunk jest wektoryzowany. Endpoint jest bezstanowy – wynik nie jest zapisywany w bazie danych. Zwraca listę wszystkich chunków wraz z ich wektorami oraz jeden uśredniony i znormalizowany wektor dla całego dokumentu (Mean Pooling + L2 Normalization).

**Format żądania:**
```json
{
  "text": "Treść dokumentu do wektoryzacji...",
  "metadata": {
    "optional": "data"
  }
}
```

**Przykładowa odpowiedź:**
```json
{
  "status": "success",
  "document_vector": [0.012, -0.045, "..."],
  "chunks": [
    {
      "text": "Fragment tekstu 1...",
      "vector": [0.011, -0.040, "..."]
    },
    {
      "text": "Fragment tekstu 2...",
      "vector": [0.013, -0.050, "..."]
    }
  ],
  "chunk_count": 2
}
```

---

## 2. Wektoryzacja Dokumentu (Encode Document - Stateless)
**Endpoint:** `POST /v1/encode/document`

Służy do uploadu pliku (PDF, HTML, TXT) lub wysłania tekstu. API automatycznie czyści tekst, wykonuje chunking, a następnie generuje **jeden uśredniony i znormalizowany wektor** (Mean Pooling + L2 Normalization) dla całego dokumentu. 
Endpoint jest bezstanowy – wynik nie jest zapisywany w Qdrant.

**Parametry żądania (Multipart Form Data):**
- `file` (File, opcjonalne) - Plik dokumentu.
- `document_text` (String, opcjonalne) - Tekst dokumentu.

**Przykładowa odpowiedź:**
```json
{
  "status": "success",
  "vector": [0.012, -0.045, "..."],
  "chunk_count": 12
}
```

---

## 3. Wyszukiwanie Zaawansowane (Search)
**Endpoint:** `POST /v1/search`

Wyszukiwanie semantyczne w Qdrant. Obsługuje algorytm **Rocchio Relevance Feedback** oraz reranking modelem **Cross-Encoder**. API automatycznie oczyszcza pole `chunk_text` z wstrzykniętych nagłówków systemowych (np. `[Sygnatura: ... | Sąd: ... | Data: ...]`), zwracając czystą treść orzeczenia.

**Format żądania:**
```json
{
  "query": "kara umowna za opóźnienie",
  "limit": 10,
  "use_rerank": true,
  "rocchio": {
    "positive_vectors": [[...], [...]],
    "negative_vectors": [[...]],
    "alpha": 1.0,
    "beta": 0.75,
    "gamma": 0.15
  }
}
```

**Przykładowa odpowiedź:**
```json
[
  {
    "saos_id": 427954,
    "score": 0.985,
    "judgment_type": "SENTENCE",
    "judgment_date": "2020-03-19",
    "chunk_text": "Oczyszczony tekst fragmentu orzeczenia...",
    "summary": "Krótkie streszczenie orzeczenia pobrane z API...",
    "signatures": ["III Ca 2581/19"],
    "court_type": "COMMON"
  }
]
```

---

## 4. Asystent Chat (Lekki)
**Endpoint:** `POST /chat`

Zwraca listę identyfikatorów orzeczeń najbardziej trafnych dla zapytania. Klient powinien wykorzystać te ID do pobrania pełnych danych z SQL i syntezy odpowiedzi przez własny model LLM.

**Format żądania:**
```json
{
  "query": "Czy spóźnienie z winy podwykonawcy zwalnia z kary umownej?",
  "limit": 5,
  "use_rerank": true
}
```

**Przykładowa odpowiedź:**
```json
{
  "relevant_ids": [427954, 123456, 789012],
  "message": "Znaleziono 3 istotne orzeczenia dla Twojego pytania."
}
```

---

## 5. Pobieranie Hurtowe Orzeczeń (Batch Get)
**Endpoint:** `POST /v1/judgments/batch`

Zwraca pełne dane orzeczeń dla podanej listy identyfikatorów `saos_id`. Służy aplikacji klienckiej do dociągnięcia szczegółów po otrzymaniu wyników wyszukiwania z endpointu `/chat` lub `/v1/search`.

**Format żądania:**
```json
{
  "saos_ids": [427954, 123456, 789012]
}
```

**Przykładowa odpowiedź:**
```json
[
  {
    "saos_id": 427954,
    "judgment_date": "2020-03-19",
    "judgment_type": "SENTENCE",
    "court_type": "COMMON",
    "signatures": ["III Ca 2581/19"],
    "text_content": "Pełna treść orzeczenia..."
  }
]
```

---

## 6. Pobieranie Szczegółów po Sygnaturach (Details by Signatures)
**Endpoint:** `POST /v1/judgments/detailsBySignatures`

Zwraca pełne dane orzeczeń dla podanej listy sygnatur spraw. W przeciwieństwie do standardowego batcha, ten endpoint dołącza pełne informacje słownikowe (sąd, izba, wydział).

**Format żądania:**
```json
{
  "signatures": ["I ACa 1010/09", "II BK 123/20"]
}
```

**Przykładowa odpowiedź:**
```json
[
  {
    "saos_id": 427954,
    "judgment_date": "2020-03-19",
    "judgment_type": "SENTENCE",
    "court_type": "COMMON",
    "signatures": ["III Ca 2581/19"],
    "text_content": "Pełna treść orzeczenia...",
    "summary": "Streszczenie...",
    "court": {
      "id": 123,
      "name": "Sąd Apelacyjny w Krakowie",
      "type": "APPEAL",
      "code": "SA_KRAKOW"
    },
    "chamber": {
      "id": 1,
      "name": "I Wydział Cywilny"
    },
    "division": {
      "id": 10,
      "name": "Sekcja Cywilna",
      "full_name": "Wydział I Cywilny - Sekcja Cywilna"
    }
  }
]
```
