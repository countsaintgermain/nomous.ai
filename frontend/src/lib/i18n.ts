/**
 * Zwraca aktualny identyfikator lokalizacji (locale) dla aplikacji.
 * Obecnie pobiera z .env (fallback pl-PL), w przyszłości może być bardziej dynamiczna.
 */
export const getAppLocale = (): string => {
    return process.env.NEXT_PUBLIC_APP_LOCALE || 'pl-PL';
};
