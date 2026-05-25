import { Paths } from 'type-fest'

/**
 * @deprecated I18nKey is deprecated along with I18nService. Use I18nextService with TranslationFunction<T> instead.
 */
export type I18nKey<L> = L extends object ? Paths<L, { maxRecursionDepth: 15 }> : string

/* oxlint-disable @diia-inhouse/code/const-enum-naming, @diia-inhouse/code/const-enum-type-name */
export const LOCALE = {
    uk: 'uk',
    en: 'en',
} as const

export type LocaleType = (typeof LOCALE)[keyof typeof LOCALE]
