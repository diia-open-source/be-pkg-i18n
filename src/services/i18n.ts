import { AsyncLocalStorage } from 'async_hooks'

import { I18n, Replacements } from 'i18n'

import { AlsData } from '@diia-inhouse/types'

import { I18nKey } from '../interfaces/services/i18n'

export class I18nService<L = string> {
    private readonly i18n: I18n

    private readonly headerName = 'appLocale'

    constructor(private readonly asyncLocalStorage: AsyncLocalStorage<AlsData>) {
        this.i18n = new I18n()

        this.i18n.configure({
            directory: './dist/locales',
            fallbacks: {
                'en-*': 'en',
                'uk-*': 'uk',
            },
            autoReload: false,
            updateFiles: false,
            objectNotation: true,
            header: this.headerName,
            defaultLocale: 'uk',
        })
    }

    get(key: I18nKey<L>, valuesToReplace?: Replacements, returnKeyIfNotFound = true): string {
        const locale = this.getLocaleFromStore()

        // eslint-disable-next-line no-underscore-dangle
        const foundItem = this.i18n.__({ locale, phrase: <string>key }, valuesToReplace || {})

        if (!foundItem && returnKeyIfNotFound) {
            return <string>key
        }

        return foundItem
    }

    getLocale(): string {
        const locale = this.getLocaleFromStore()

        return <string>(<unknown>this.i18n.setLocale({}, locale))
    }

    private getLocaleFromStore(): string {
        const store = this.asyncLocalStorage.getStore()

        return store?.headers?.[this.headerName] || ''
    }
}
