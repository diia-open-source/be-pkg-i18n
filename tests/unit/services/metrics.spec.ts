import { AsyncLocalStorage } from 'node:async_hooks'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'

import { DiiaLogger } from '@diia-inhouse/diia-logger'
import { ActionVersion, AlsData, Languages, WithLocales } from '@diia-inhouse/types'

import { I18nextService, missedInterpolationParamsTotalMetric, missedLocaleKeysTotalMetric } from '../../../src/index.js'

vi.mock('../../../src/metrics/index.js', () => ({
    missedLocaleKeysTotalMetric: {
        increment: vi.fn<(labels: Record<string, string>) => void>(),
    },
    missedInterpolationParamsTotalMetric: {
        increment: vi.fn<(labels: Record<string, string>) => void>(),
    },
}))

const mockLogger = mock<DiiaLogger>()
const mockAsyncLocalStorage = new AsyncLocalStorage<AlsData>()

describe('I18nextService Metrics', () => {
    let i18nextService: I18nextService

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(missedLocaleKeysTotalMetric.increment).mockClear()
    })

    it('should increment missing metric when key is not found', () => {
        i18nextService = new I18nextService('./tests/locales', {}, mockAsyncLocalStorage, mockLogger)

        mockAsyncLocalStorage.run(
            {
                headers: {
                    acceptLanguage: 'en',
                    actionVersion: ActionVersion.V1,
                    traceId: 'test-trace-id',
                },
            },
            () => {
                const t = i18nextService.ns<{ 'nonexistent.key': string }>('test')

                t('nonexistent.key')
            },
        )

        expect(mockLogger.error).toHaveBeenCalledWith('Missing translation key: nonexistent.key for locale: en, namespace: test')
        expect(missedLocaleKeysTotalMetric.increment).toHaveBeenCalledWith({ locale: 'en', status: 'missing' })
    })

    it('should not increment metric when key exists in requested locale', () => {
        i18nextService = new I18nextService('./tests/locales', {}, mockAsyncLocalStorage, mockLogger)

        mockAsyncLocalStorage.run(
            {
                headers: {
                    acceptLanguage: Languages.Uk,
                    actionVersion: ActionVersion.V1,
                    traceId: 'test-trace-id',
                },
            },
            () => {
                const t = i18nextService.ns<{ 'existing.key': string }>('test')

                t('existing.key')
            },
        )

        expect(mockLogger.warn).not.toHaveBeenCalled()
        expect(missedLocaleKeysTotalMetric.increment).not.toHaveBeenCalled()
    })

    it('should handle fallback usage correctly', () => {
        i18nextService = new I18nextService('./tests/locales', {}, mockAsyncLocalStorage, mockLogger)

        mockAsyncLocalStorage.run(
            {
                headers: {
                    acceptLanguage: Languages.En,
                    actionVersion: ActionVersion.V1,
                    traceId: 'test-trace-id',
                },
            },
            () => {
                const t = i18nextService.ns<{ 'existing.key': string }>('test')
                const result = t('existing.key')

                expect(result).toBe('Це існуючий ключ')
            },
        )

        // For fallback usage, i18next doesn't call missingKeyHandler
        // because the key was found in the fallback locale
        expect(mockLogger.warn).not.toHaveBeenCalled()
        expect(missedLocaleKeysTotalMetric.increment).not.toHaveBeenCalled()
    })

    it('should increment missing interpolation metric when parameter is not provided', () => {
        i18nextService = new I18nextService('./tests/locales', {}, mockAsyncLocalStorage, mockLogger)

        mockAsyncLocalStorage.run(
            {
                headers: {
                    acceptLanguage: Languages.Uk,
                    actionVersion: ActionVersion.V1,
                    traceId: 'test-trace-id',
                },
            },
            () => {
                const t = i18nextService.ns<{ greeting: string }>('test')

                t('greeting')
            },
        )

        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Missing interpolation parameter: name'))
        expect(missedInterpolationParamsTotalMetric.increment).toHaveBeenCalledWith({ locale: Languages.Uk })
    })

    it('should not increment missing interpolation metric when parameter is provided', () => {
        i18nextService = new I18nextService('./tests/locales', {}, mockAsyncLocalStorage, mockLogger)

        mockAsyncLocalStorage.run(
            {
                headers: {
                    acceptLanguage: Languages.Uk,
                    actionVersion: ActionVersion.V1,
                    traceId: 'test-trace-id',
                },
            },
            () => {
                const t = i18nextService.ns<{ greeting: string }>('test')
                const result = t('greeting', { name: 'Тест' })

                expect(result).toBe('Привіт Тест')
            },
        )

        expect(missedInterpolationParamsTotalMetric.increment).not.toHaveBeenCalled()
    })

    describe('getLocalized', () => {
        interface TemplateLocale {
            text: string
            description?: string
        }

        const template: WithLocales<TemplateLocale> = { locales: { [Languages.Uk]: { text: 'текст' }, [Languages.En]: { text: 'text' } } }

        beforeEach(() => {
            i18nextService = new I18nextService('./tests/locales', {}, mockAsyncLocalStorage, mockLogger)
        })

        it('should increment missing metric when there is no value for key in requested and Ukrainian locales', () => {
            const result = i18nextService.getLocalized(template, 'description', Languages.En)

            expect(result).toBeUndefined()
            expect(mockLogger.error).toHaveBeenCalledWith('Missing localized value', { locale: Languages.En, key: 'description' })
            expect(missedLocaleKeysTotalMetric.increment).toHaveBeenCalledTimes(1)
            expect(missedLocaleKeysTotalMetric.increment).toHaveBeenCalledWith({ locale: Languages.En, status: 'missing' })
        })

        it('should increment missing metric when there are no requested and Ukrainian locales', () => {
            const result = i18nextService.getLocalized({ locales: {} } as WithLocales<TemplateLocale>, undefined, Languages.En)

            expect(result).toBeUndefined()
            expect(mockLogger.error).toHaveBeenCalledWith('Missing localized value', { locale: Languages.En, key: undefined })
            expect(missedLocaleKeysTotalMetric.increment).toHaveBeenCalledTimes(1)
            expect(missedLocaleKeysTotalMetric.increment).toHaveBeenCalledWith({ locale: Languages.En, status: 'missing' })
        })

        it('should increment fallback used metric when requested locale is missing', () => {
            const ukOnlyTemplate: WithLocales<TemplateLocale> = { locales: { [Languages.Uk]: { text: 'текст' } } }

            i18nextService.getLocalized(ukOnlyTemplate, undefined, Languages.En)

            expect(missedLocaleKeysTotalMetric.increment).toHaveBeenCalledTimes(1)
            expect(missedLocaleKeysTotalMetric.increment).toHaveBeenCalledWith({ locale: Languages.En, status: 'fallback_used' })
            expect(mockLogger.error).not.toHaveBeenCalled()
        })

        it('should increment fallback used metric when requested locale is missing and key is provided', () => {
            const ukOnlyTemplate: WithLocales<TemplateLocale> = { locales: { [Languages.Uk]: { text: 'текст' } } }

            i18nextService.getLocalized(ukOnlyTemplate, 'text', Languages.En)

            expect(missedLocaleKeysTotalMetric.increment).toHaveBeenCalledTimes(1)
            expect(missedLocaleKeysTotalMetric.increment).toHaveBeenCalledWith({ locale: Languages.En, status: 'fallback_used' })
            expect(mockLogger.error).not.toHaveBeenCalled()
        })

        it('should increment fallback used metric when requested locale has no value for key', () => {
            const result = i18nextService.getLocalized(
                { locales: { [Languages.Uk]: { text: 'текст', description: 'опис' }, [Languages.En]: { text: 'text' } } },
                'description',
                Languages.En,
            )

            expect(result).toBe('опис')
            expect(missedLocaleKeysTotalMetric.increment).toHaveBeenCalledWith({ locale: Languages.En, status: 'fallback_used' })
        })

        it('should not increment metric when value exists in requested locale', () => {
            i18nextService.getLocalized(template, 'text', Languages.En)

            expect(missedLocaleKeysTotalMetric.increment).not.toHaveBeenCalled()
        })
    })
})
