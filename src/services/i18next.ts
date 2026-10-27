import { AsyncLocalStorage } from 'node:async_hooks'
import { lstatSync, readdirSync } from 'node:fs'
import path from 'node:path'

import * as i18next from 'i18next'
import FsBackend, { FsBackendOptions } from 'i18next-fs-backend'

import { AlsData, Language, Languages, Logger, WithLocales } from '@diia-inhouse/types'

import { missedInterpolationParamsTotalMetric, missedLocaleKeysTotalMetric } from '../metrics/index.js'
import { getSupportedLocale } from '../utils/locale.js'

type DotNestedKeys<T> = T extends object
    ? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${DotNestedKeys<T[K]>}` | K : K) : never }[keyof T & string]
    : ''

export type TranslationFunction<TResource> = <K extends DotNestedKeys<TResource>>(key: K, options?: i18next.TOptions) => string

export class I18nextService {
    private readonly i18nextInstance: i18next.i18n

    constructor(
        private readonly localesDirectory = './dist/locales',
        private readonly initOptions: Partial<i18next.InitOptions> | undefined = {},
        private readonly asyncLocalStorage: AsyncLocalStorage<AlsData>,
        private readonly logger: Logger,
        private readonly defaultLocale: Language = Languages.Uk,
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

    getLocalized<T>(entity: WithLocales<T>, key?: undefined, language?: Language): T

    getLocalized<T, K extends keyof T>(entity: WithLocales<T>, key: K, language?: Language): T[K]

    getLocalized<T, K extends keyof T>(
        { locales }: WithLocales<T>,
        key?: K,
        language: Language = this.getLocaleFromStore(),
    ): T | T[K] | undefined {
        const getValue = (locale: T | undefined): T | T[K] | undefined => (key === undefined ? locale : locale?.[key])

        const value = getValue(locales[language])
        if (value !== undefined && value !== null) {
            return value
        }

        const fallbackValue = getValue(locales[this.defaultLocale])
        if (fallbackValue === undefined || fallbackValue === null) {
            missedLocaleKeysTotalMetric.increment({ locale: language, status: 'missing' })
            this.logger.error('Missing localized value', { locale: language, key })
        } else {
            missedLocaleKeysTotalMetric.increment({ locale: language, status: 'fallback_used' })
        }

        return fallbackValue
    }

    getInstance(): i18next.i18n {
        return this.i18nextInstance
    }

    private getLocaleFromStore(): Language {
        return getSupportedLocale(this.asyncLocalStorage.getStore()?.headers?.acceptLanguage) || this.defaultLocale
    }

    private initializeI18next(): i18next.i18n {
        const namespaces = this.findAllNamespaces()

        this.logger.info(`Found namespaces: ${namespaces.join(', ')}`)

        const defaultOptions: Partial<i18next.InitOptions> = {
            fallbackLng: this.defaultLocale,
            lng: this.defaultLocale,
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
            // oxlint-disable-next-line security/detect-non-literal-fs-filename
            const dirs = readdirSync(this.localesDirectory)
            const langDirs = dirs.filter(
                // oxlint-disable-next-line security/detect-non-literal-fs-filename
                (dir) => lstatSync(path.join(this.localesDirectory, dir)).isDirectory(),
            )

            for (const lang of langDirs) {
                const langDir = path.join(this.localesDirectory, lang)

                this.findJsonFiles(langDir, namespaces)
            }
        } catch (err) {
            this.logger.error(`Error finding namespaces: ${String(err)}`)
        }

        return namespaces
    }

    private findJsonFiles(dir: string, namespaces: string[], prefix = ''): void {
        // oxlint-disable-next-line security/detect-non-literal-fs-filename
        const entries = readdirSync(dir)

        for (const entry of entries) {
            const fullPath = path.join(dir, entry)
            // oxlint-disable-next-line security/detect-non-literal-fs-filename
            const isDir = lstatSync(fullPath).isDirectory()

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
