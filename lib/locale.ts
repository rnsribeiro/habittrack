export type AppLocale = "pt" | "en";

export const LOCALE_STORAGE_KEY = "habittrack.locale";
export const LOCALE_COOKIE_KEY = "habittrack.locale";

export function normalizeLocale(value: string | null | undefined): AppLocale {
  return value === "en" ? "en" : "pt";
}

export function intlLocale(locale: AppLocale) {
  return locale === "en" ? "en-US" : "pt-BR";
}
