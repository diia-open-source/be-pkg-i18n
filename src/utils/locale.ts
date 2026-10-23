import { LOCALE, LocaleType } from '../interfaces/services/i18n.js'

export function getSupportedLocale(value?: string): LocaleType | undefined {
    return Object.values(LOCALE).find((locale) => locale === value)
}
