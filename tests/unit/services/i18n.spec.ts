/* oxlint-disable no-underscore-dangle */
import { AsyncLocalStorage } from 'node:async_hooks'

import { mock } from 'vitest-mock-extended'

import { AlsData } from '@diia-inhouse/types'

import { I18nService } from '../../../src/index.js'
import { LOCALE } from '../../../src/interfaces/services/i18n.js'

const mockI18nInstance = {
    configure: vi.fn<(opts: unknown) => void>(),
    __: vi.fn<(...args: unknown[]) => string>(),
    setLocale: vi.fn<(locale: string) => string>(),
}

vi.mock('i18n', () => ({
    I18n: function (): typeof mockI18nInstance {
        return mockI18nInstance
    },
}))

describe('I18nService', () => {
    const asyncLocalStorage = mock<AsyncLocalStorage<AlsData>>()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('get', () => {
        it('should return just key when item not found', () => {
            const i18nService = new I18nService(asyncLocalStorage)

            expect(i18nService.get('key', {}, true)).toBe('key')
            expect(mockI18nInstance.configure).toHaveBeenCalledWith({
                directory: './dist/locales',
                fallbacks: {
                    'en-*': LOCALE.en,
                    'uk-*': LOCALE.uk,
                },
                autoReload: false,
                updateFiles: false,
                objectNotation: true,
                header: 'appLocale',
                defaultLocale: LOCALE.uk,
            })
        })

        it('should return just found item', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { appLocale: LOCALE.uk } } as unknown as AlsData)
            mockI18nInstance.__.mockReturnValue('value')

            const i18nService = new I18nService(asyncLocalStorage)

            expect(i18nService.get('key')).toBe('value')
            expect(mockI18nInstance.configure).toHaveBeenCalledWith({
                directory: './dist/locales',
                fallbacks: {
                    'en-*': LOCALE.en,
                    'uk-*': LOCALE.uk,
                },
                autoReload: false,
                updateFiles: false,
                objectNotation: true,
                header: 'appLocale',
                defaultLocale: LOCALE.uk,
            })
        })

        it('should decode html text', () => {
            const i18nService = new I18nService(asyncLocalStorage)

            mockI18nInstance.__.mockReturnValue('Дар&#39;я')

            expect(i18nService.get('key')).toBe("Дар'я")
        })
    })

    describe('getLocale', () => {
        it('should set and return locale', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { appLocale: LOCALE.uk } } as unknown as AlsData)
            mockI18nInstance.setLocale.mockReturnValue('uk')

            const i18nService = new I18nService(asyncLocalStorage)

            expect(i18nService.getLocale()).toBe('uk')
            expect(mockI18nInstance.configure).toHaveBeenCalledWith({
                directory: './dist/locales',
                fallbacks: {
                    'en-*': LOCALE.en,
                    'uk-*': LOCALE.uk,
                },
                autoReload: false,
                updateFiles: false,
                objectNotation: true,
                header: 'appLocale',
                defaultLocale: LOCALE.uk,
            })
        })
    })
})
