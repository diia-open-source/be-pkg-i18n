import { AsyncLocalStorage } from 'node:async_hooks'
import { lstatSync, readdirSync } from 'node:fs'
import path from 'node:path'

import * as i18next from 'i18next'
import FsBackend, { FsBackendOptions } from 'i18next-fs-backend'

import { AlsData, Logger } from '@diia-inhouse/types'

import { LOCALE } from '../interfaces/services/i18n'
import { missedInterpolationParamsTotalMetric, missedLocaleKeysTotalMetric } from '../metrics'

type DotNestedKeys<T> = T extends object
    ? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${DotNestedKeys<T[K]>}` | K : K) : never }[keyof T & string]
    : ''

export type TranslationFunction<TResource> = <K extends DotNestedKeys<TResource>>(key: K, options?: i18next.TOptions) => string

export class I18nextService {
    private readonly i18nextInstance: i18next.i18n
    private readonly headerName = 'appLocale'

    constructor(
        private readonly localesDirectory = './dist/locales',
        private readonly initOptions: Partial<i18next.InitOptions> = {},
        private readonly asyncLocalStorage: AsyncLocalStorage<AlsData>,
        private readonly logger: Logger,
    ) {
        this.i18nextInstance = this.initializeI18next()
    }

    ns<TResource>(namespace: string): TranslationFunction<TResource> {
        return (key: DotNestedKeys<TResource>, options: i18next.TOptions = {}): string => {
            const locale = this.getLocaleFromStore()

            return this.i18nextInstance.t(key, {
                lng: locale,
                ns: namespace,
                ...options,
            })
        }
    }

    get(key: string, options: object = {}): string {
        const locale = this.getLocaleFromStore()

        return this.i18nextInstance.t(key, {
            lng: locale,
            ...options,
        })
    }

    getLocale(): string {
        return this.getLocaleFromStore()
    }

    getInstance(): i18next.i18n {
        return this.i18nextInstance
    }

    private getLocaleFromStore(): string {
        const store = this.asyncLocalStorage.getStore()

        return store?.headers?.[this.headerName] || LOCALE.uk
    }

    private initializeI18next(): i18next.i18n {
        const namespaces = this.findAllNamespaces()

        this.logger.info(`Found namespaces: ${namespaces.join(', ')}`)

        const defaultOptions: Partial<i18next.InitOptions> = {
            fallbackLng: LOCALE.uk,
            lng: LOCALE.uk,
            returnEmptyString: false,
            returnNull: false,
            returnObjects: true,
            initImmediate: false,
            initAsync: false,
            saveMissing: true,
            interpolation: {
                escapeValue: false,
            },
            backend: {
                loadPath: path.join(this.localesDirectory, '{{lng}}/{{ns}}.json'),
            },
            ns: namespaces.length > 0 ? namespaces : ['translation'],
            defaultNS: namespaces.length > 0 ? namespaces[0] : 'translation',
            missingKeyHandler: (_lngs, ns, key, fallbackValue) => {
                const requestedLocale = this.getLocaleFromStore()
                const isFallbackUsed = fallbackValue && fallbackValue !== key

                if (isFallbackUsed) {
                    missedLocaleKeysTotalMetric.increment({ locale: requestedLocale, status: 'fallback_used' })
                    this.logger.warn(`Using fallback for key: ${key} in locale: ${requestedLocale}, namespace: ${ns}`)
                } else {
                    missedLocaleKeysTotalMetric.increment({ locale: requestedLocale, status: 'missing' })
                    this.logger.error(`Missing translation key: ${key} for locale: ${requestedLocale}, namespace: ${ns}`)
                }
            },
            missingInterpolationHandler: (text, value) => {
                const requestedLocale = this.getLocaleFromStore()

                missedInterpolationParamsTotalMetric.increment({ locale: requestedLocale })
                this.logger.error(`Missing interpolation parameter: ${value[1]} in text: ${text} for locale: ${requestedLocale}`)
            },
        }

        const mergedOptions = { ...defaultOptions, ...this.initOptions }

        const instance = i18next.createInstance()

        void instance.use(FsBackend).init(mergedOptions as i18next.InitOptions & FsBackendOptions)

        return instance
    }

    private findAllNamespaces(): string[] {
        const namespaces: string[] = []

        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const dirs = readdirSync(this.localesDirectory) // nosemgrep: eslint.detect-non-literal-fs-filename
            const langDirs = dirs.filter(
                (dir) =>
                    // eslint-disable-next-line security/detect-non-literal-fs-filename
                    lstatSync(path.join(this.localesDirectory, dir)).isDirectory(), // nosemgrep: eslint.detect-non-literal-fs-filename
            )

            for (const lang of langDirs) {
                const langDir = path.join(this.localesDirectory, lang)

                this.findJsonFiles(langDir, namespaces)
            }
        } catch (err) {
            this.logger.error(`Error finding namespaces: ${err}`)
        }

        return namespaces
    }

    private findJsonFiles(dir: string, namespaces: string[], prefix = ''): void {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const entries = readdirSync(dir) // nosemgrep: eslint.detect-non-literal-fs-filename

        for (const entry of entries) {
            const fullPath = path.join(dir, entry)
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const isDir = lstatSync(fullPath).isDirectory() // nosemgrep: eslint.detect-non-literal-fs-filename

            if (isDir) {
                this.findJsonFiles(fullPath, namespaces, `${prefix}${entry}/`)
            } else if (entry.endsWith('.json')) {
                const ns = `${prefix}${entry.replace('.json', '')}`

                if (!namespaces.includes(ns)) {
                    namespaces.push(ns)
                }
            }
        }
    }
}
