import { Language, Languages } from '@diia-inhouse/types'

export function getSupportedLocale(value?: string): Language | undefined {
    return Object.values(Languages).find((locale) => locale === value)
}
