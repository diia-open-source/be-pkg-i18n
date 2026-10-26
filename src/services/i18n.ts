import { AsyncLocalStorage } from 'node:async_hooks'

import he from 'he'
import { I18n, Replacements } from 'i18n'

import { AlsData, Languages } from '@diia-inhouse/types'

import { I18nKey } from '../interfaces/services/i18n.js'
import { getSupportedLocale } from '../utils/locale.js'

/**
 * @deprecated I18nService is deprecated. Use I18nextService instead.
 *
 * Migration guide:
 * 1. Replace I18nService with I18nextService in your constructor
 * 2. Use the ns() method to create namespaced translation functions
 * 3. Replace get() calls with the namespaced translation function
 *
 * Example:
 * ```typescript
 * // Old way
 * constructor(private readonly i18n: I18nService) {}
 * const text = this.i18n.get('key.path.to.translation')
 *
 * // New way
 * constructor(private readonly i18next: I18nextService) {}
 * private readonly t = this.i18next.ns<LocalesType>('namespace/path')
 * const text = this.t('key.path.to.translation')
 * ```
 */
export class I18nService<L = string> {
    private readonly i18n: I18n

    constructor(
        private readonly asyncLocalStorage: AsyncLocalStorage<AlsData>,
        localesDirectory = './dist/locales',
    ) {
        this.i18n = new I18n()

        this.i18n.configure({
            directory: localesDirectory,
            fallbacks: {
                'en-*': Languages.En,
                'uk-*': Languages.Uk,
            },
            autoReload: false,
            updateFiles: false,
            objectNotation: true,
            defaultLocale: Languages.Uk,
        })
    }

    /**
     * @deprecated Use I18nextService with namespaced translation functions instead.
     */
    get(key: I18nKey<L>, valuesToReplace?: Replacements, returnKeyIfNotFound = true): string {
        const locale = this.getLocaleFromStore()

        // oxlint-disable-next-line no-underscore-dangle
        const foundItem = this.i18n.__({ locale, phrase: key as string }, valuesToReplace || {})

        if (!foundItem && returnKeyIfNotFound) {
            return key as string
        }

        return he.decode(foundItem)
    }

    /**
     * @deprecated Use I18nextService.getLocale() instead.
     */
    getLocale(): string {
        const locale = this.getLocaleFromStore()

        return this.i18n.setLocale({}, locale) as unknown as string
    }

    private getLocaleFromStore(): string {
        return getSupportedLocale(this.asyncLocalStorage.getStore()?.headers?.acceptLanguage) || ''
    }
}
