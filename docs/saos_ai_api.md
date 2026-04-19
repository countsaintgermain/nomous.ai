# SAOS-AI API Reference (v5.1)

Dokumentacja techniczna silnika semantycznego SAOS-AI. Wszystkie żądania i odpowiedzi wykorzystują format JSON.

---

## Autoryzacja
Wymagany nagłówek `X-API-Key` w każdym żądaniu.
```http
X-API-Key: 59e84b7261a84f3c9d2e1b0a7f4c3d2e1a0b9c8d7e6f5a4b
Content-Type: application/json
```

---

## 1. Wyszukiwanie Hybrydowe (Hybrid Search)
**Endpoint:** `POST /v1/search`

### Request Body (JSON)
```json
{
  "query": "odszkodowanie za wypadek przy pracy na budowie",
  "limit": 5,
  "use_rerank": true,
  "rocchio": {
    "positive_vectors": [[0.1, 0.2, "..."]],
    "negative_vectors": [],
    "alpha": 1.0,
    "beta": 0.75,
    "gamma": 0.15
  }
}
```

### Response Body (JSON)
```json
[
  {
    "saos_id": 427954,
    "score": 8.4521,
    "judgment_type": "SENTENCE",
    "judgment_date": "2020-03-19",
    "chunk_text": "Treść najbardziej trafnego fragmentu orzeczenia...",
    "summary": "Streszczenie orzeczenia...",
    "signatures": ["III Ca 2581/19"],
    "court_type": "COMMON"
  }
]
```

---

## 2. Wyszukiwanie Dokumentów (Full Document Search)
**Endpoint:** `POST /v1/fulldocsearch`

### Request Body (JSON)
```json
{
  "query": "odpowiedzialność członka zarządu",
  "limit": 3,
  "use_rerank": false
}
```

### Response Body (JSON)
```json
[
  {
    "saos_id": 12345,
    "score": 0.9231,
    "judgment_type": "SENTENCE",
    "judgment_date": "2019-05-10",
    "chunk_text": null,
    "summary": "Streszczenie dokumentu...",
    "signatures": ["V GC 12/18"],
    "court_type": "COMMON"
  }
]
```

---

## 3. Pobieranie danych (Data Retrieval)

### Batch Get (Pobieranie hurtowe)
**Endpoint:** `POST /v1/judgments/batch`

**Request:**
```json
{
  "saos_ids": [427954, 123456]
}
```

**Response:**
```json
[
  {
    "saos_id": 427954,
    "judgment_date": "2020-03-19",
    "judgment_type": "SENTENCE",
    "court_type": "COMMON",
    "signatures": ["III Ca 2581/19"],
    "text_content": "Pełna treść orzeczenia...",
    "judgment_form": "...",
    "source_url": "..."
  }
]
```

### Details by Signatures (Szczegóły z relacjami)
**Endpoint:** `POST /v1/judgments/detailsBySignatures`

**Request:**
```json
{
  "signatures": ["I ACa 1010/09"]
}
```

**Response:**
```json
[
  {
    "saos_id": 427954,
    "signatures": ["I ACa 1010/09"],
    "court": {
      "id": 123,
      "name": "Sąd Apelacyjny w Krakowie",
      "type": "APPEAL",
      "code": "SA_KRAKOW"
    },
    "chamber": { "id": 1, "name": "I Wydział Cywilny" },
    "division": { "id": 10, "name": "Sekcja Cywilna", "full_name": "..." },
    "text_content": "..."
  }
]
```

---

## 4. Wektoryzacja (Stateless Encoding)

### Encode Text
**Endpoint:** `POST /v1/encode/text`

**Request:**
```json
{
  "text": "Tekst do wektoryzacji..."
}
```

**Response:**
```json
{
  "status": "success",
  "document_vector": [0.012, -0.045, "..."],
  "chunks": [
    {
      "text": "Fragment 1...",
      "vector": [0.011, -0.040, "..."],
      "sparse": { "123": 0.5, "456": 0.2 }
    }
  ],
  "chunk_count": 1
}
```

---

## 5. Asystent Chat (Chat Helper)
**Endpoint:** `POST /chat`

**Request:**
```json
{
  "query": "Jakie są przesłanki zasiedzenia?",
  "limit": 3
}
```

**Response:**
```json
{
  "relevant_ids": [427954, 123456, 789012],
  "message": "Znaleziono 3 istotne orzeczenia dla Twojego pytania."
}
```

---

---

## 6. Przykłady Praktyczne (Use Cases)
Przykłady oparte na rzeczywistych testach systemu (Hybrid Search + Reranking).

### Przykład 1: Prawo Pracy (Wypadek)
**Query:** `"odszkodowanie za wypadek przy pracy"`

**Request:**
```json
{
  "query": "odszkodowanie za wypadek przy pracy",
  "limit": 3,
  "use_rerank": true
}
```

**Odpowiedź (fragment):**
```json
[
  {
    "saos_id": 313687,
    "score": 9.82,
    "signatures": ["VII P 31/16"],
    "chunk_text": "Pozwana uznała zdarzenie za wypadek przy pracy i nie stwierdziła by wyłączną przyczyną wypadku było naruszenie przez pracownika przepisów dotyczących ochrony życia i zdrowia..."
  }
]
```

### Przykład 2: Prawo Karne (Znieważenie)
**Query:** `"art. 216 kk znieważenie"`

**Request:**
```json
{
  "query": "art. 216 kk znieważenie",
  "limit": 1
}
```

**Odpowiedź (fragment):**
```json
[
  {
    "saos_id": 31648,
    "score": 8.91,
    "signatures": ["VI K 588/12"],
    "chunk_text": "Wypowiedzi oskarżonego skierowane do pokrzywdzonej w miejscu publicznym wyczerpały znamiona czynu z art. 216 § 1 kk..."
  }
]
```

### Przykład 3: Prawo Cywilne (Zasiedzenie)
**Query:** `"zasiedzenie nieruchomości w złej wierze"`

**Request:**
```json
{
  "query": "zasiedzenie nieruchomości w złej wierze",
  "limit": 1
}
```

**Odpowiedź (fragment):**
```json
[
  {
    "saos_id": 267081,
    "score": 9.45,
    "signatures": ["II Ca 733/16"],
    "chunk_text": "Dobra wiara zasiadującego posiadacza występuje wówczas, gdy posiadacz jest przekonany, że przysługuje mu prawo własności, a przekonanie to jest usprawiedliwione okolicznościami..."
  }
]
```

---

## Wydajność i Limity
- **Latency:** Średni czas odpowiedzi to ~1000ms (z rerankingiem).
- **Batch limit:** Zalecane pobieranie max 50 orzeczeń naraz w `batch`.
- **Model Context:** Modele gęste obsługują do 8192 tokenów, ale API wykonuje automatyczny chunking dla stabilności.

---
*Dokumentacja wygenerowana automatycznie dla wersji 5.1 (Hybrid Stella+Splade).*
