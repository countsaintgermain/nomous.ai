# Dokumentacja API SAOS (System Analizy Orzeczeń Sądowych)

Niniejsza dokumentacja opisuje publiczne API serwisu [saos.org.pl](https://www.saos.org.pl), oparte na standardzie REST. Wszystkie odpowiedzi są zwracane w formacie JSON.

## Spis treści
- [Wyszukiwanie orzeczeń](#wyszukiwanie-orzeczeń)
- [Szczegóły orzeczenia](#szczegóły-orzeczenia)
- [Generowanie analiz](#generowanie-analiz)
- [Lista identyfikatorów sądów](#lista-identyfikatorów-sądów)

---

## Wyszukiwanie orzeczeń

Zwraca listę orzeczeń spełniających podane kryteria.

**Endpoint:** `GET https://www.saos.org.pl/api/search/judgments`

### Parametry zapytania

| Parametr | Typ | Opis |
| :--- | :--- | :--- |
| `pageSize` | `integer` | Liczba wyników na stronie (domyślnie 10). |
| `pageNumber` | `integer` | Numer strony (liczony od 0). |
| `sortingField` | `string` | Pole sortowania (`JUDGMENT_DATE`, `DATABASE_ID`, `CASE_NUMBER`). |
| `sortingDirection` | `string` | Kierunek sortowania (`ASC`, `DESC`). |
| `courtType` | `string` | Typ sądu (`COMMON`, `SUPREME`, `CONSTITUTIONAL_TRIBUNAL`, `NATIONAL_APPEAL_CHAMBER`). |
| `judgmentType` | `string` | Typ orzeczenia (np. `DECISION`, `SENTENCE`). |
| `all` | `string` | Dowolna fraza wyszukiwania (Full-text search). |
| `judgmentDateFrom` | `string` | Data orzeczenia od (format `YYYY-MM-DD`). |
| `judgmentDateTo` | `string` | Data orzeczenia do (format `YYYY-MM-DD`). |
| `ccCourtId` | `integer` | Identyfikator konkretnego sądu (patrz: [Lista identyfikatorów sądów](#lista-identyfikatorów-sądów)). |

### Przykładowa odpowiedź

```json
{
  "links": [
    { "rel": "self", "href": "..." },
    { "rel": "next", "href": "..." }
  ],
  "items": [
    {
      "id": 1,
      "href": "https://www.saos.org.pl/api/judgments/1",
      "courtType": "COMMON",
      "courtCases": [{ "caseNumber": "I ACa 1010/09" }],
      "judgmentType": "DECISION",
      "judges": [
        { "name": "Andrzej Struzik", "specialRoles": ["PRESIDING_JUDGE"] }
      ],
      "textContent": "Fragment treści orzeczenia...",
      "keywords": ["przywrócenie terminu procesowego"],
      "division": {
        "name": "I Wydział Cywilny",
        "court": { "id": 123, "name": "Sąd Apelacyjny w Krakowie" }
      },
      "judgmentDate": "2012-09-14"
    }
  ],
  "query": { "pageSize": 10, "pageNumber": 0 },
  "totalResults": 150
}
```

---

## Szczegóły orzeczenia

Zwraca pełne dane pojedynczego orzeczenia na podstawie jego identyfikatora.

**Endpoint:** `GET https://www.saos.org.pl/api/judgments/{id}`

### Parametry ścieżki

| Parametr | Typ | Opis |
| :--- | :--- | :--- |
| `{id}` | `integer` | Unikalny identyfikator orzeczenia w systemie SAOS. |

### Przykładowa odpowiedź

```json
{
  "id": 12345,
  "judgmentDate": "2023-10-27",
  "courtType": "COMMON",
  "courtCases": [{"caseNumber": "I C 123/22"}],
  "judges": [{"name": "Jan Kowalski", "specialRole": "PRESIDING_JUDGE"}],
  "textContent": "Pełna treść orzeczenia...",
  "legalBases": ["Art. 415 KC"],
  "referencedRegulations": [
    {
      "journalTitle": "Dz.U. z 1964 r. Nr 16, poz. 93",
      "journalNo": 16,
      "journalYear": 1964,
      "journalEntry": 93,
      "text": "Ustawa z dnia 23 kwietnia 1964 r. Kodeks cywilny"
    }
  ]
}
```

---

## Generowanie analiz

Usługa umożliwiająca generowanie danych statystycznych.

**Endpoint:** `GET https://www.saos.org.pl/analysis/generate`

### Przykładowe parametry filtrowania

- `globalFilter.courtCriteria.courtType`: Typ sądu (np. `COMMON`).
- `globalFilter.judgmentDateRange.startYear`: Rok początkowy.
- `globalFilter.judgmentDateRange.endYear`: Rok końcowy.
- `seriesFilters[0].phrase`: Fraza wyszukiwania dla serii danych.
- `ysettings.valueType`: Typ wartości wynikowej (np. `NUMBER`).

---

## Lista identyfikatorów sądów


Dokumentacja wygenerowana na podstawie danych z dnia 1 kwietnia 2026.
