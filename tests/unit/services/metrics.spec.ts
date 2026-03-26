import { AsyncLocalStorage } from 'node:async_hooks'

import { LOCALE } from 'src/interfaces/services/i18n'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { ActionVersion, AlsData } from '@diia-inhouse/types'

import { I18nextService, missedInterpolationParamsTotalMetric, missedLocaleKeysTotalMetric } from '../../../src'

vi.mock('../../../src/metrics', () => ({
    missedLocaleKeysTotalMetric: {
        increment: vi.fn(),
    },
    missedInterpolationParamsTotalMetric: {
        increment: vi.fn(),
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
                    appLocale: 'en',
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
                    appLocale: LOCALE.uk,
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
                    appLocale: LOCALE.en,
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
                    appLocale: LOCALE.uk,
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
        expect(missedInterpolationParamsTotalMetric.increment).toHaveBeenCalledWith({ locale: LOCALE.uk })
    })

    it('should not increment missing interpolation metric when parameter is provided', () => {
        i18nextService = new I18nextService('./tests/locales', {}, mockAsyncLocalStorage, mockLogger)

        mockAsyncLocalStorage.run(
            {
                headers: {
                    appLocale: LOCALE.uk,
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
})
