/**
 * Zwraca aktualny identyfikator lokalizacji (locale) dla aplikacji.
 * Obecnie pobiera z .env (fallback pl-PL), w przyszłości może być bardziej dynamiczna.
 */
export const getAppLocale = (): string => {
    return process.env.NEXT_PUBLIC_APP_LOCALE || 'pl-PL';
};

export const JUDGMENT_TYPE_MAP: Record<string, string> = {
    "SENTENCE": "Wyrok",
    "REASONS": "Uzasadnienie wyroku",
    "DECISION": "Postanowienie",
    "RESOLUTION": "Uchwała",
    "REGULATION": "Zarządzenie",
    "ORDER": "Zarządzenie",
    "UNKNOWN": "Nieznany"
};

export const COURT_TYPE_MAP: Record<string, string> = {
    "COMMON": "Sąd Powszechny",
    "SUPREME": "Sąd Najwyższy",
    "ADMINISTRATIVE": "Sąd Administracyjny",
    "CONSTITUTIONAL_TRIBUNAL": "Trybunał Konstytucyjny",
    "NATIONAL_APPEAL_CHAMBER": "Krajowa Izba Odwoławcza"
};

/**
 * Formatuje typ orzeczenia na czytelną etykietę.
 */
export const formatJudgmentType = (type: string | undefined): string => {
    if (!type) return "Orzeczenie";
    return JUDGMENT_TYPE_MAP[type] || type;
};

/**
 * Formatuje typ sądu na czytelną etykietę.
 */
export const formatCourtType = (type: string | undefined): string => {
    if (!type) return "Sąd";
    return COURT_TYPE_MAP[type] || type;
};
