import en from './en.json';
import fa from './fa.json';

export type Locale = 'en' | 'fa';

export const translations: Record<Locale, Record<string, string>> = { en, fa };

export function t(key: string, locale: Locale = 'en'): string {
  return translations[locale][key] || key;
}
