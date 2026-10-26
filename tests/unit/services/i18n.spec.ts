/* oxlint-disable no-underscore-dangle */
import { AsyncLocalStorage } from 'node:async_hooks'

import { mock } from 'vitest-mock-extended'

import { AlsData, Languages } from '@diia-inhouse/types'

import { I18nService } from '../../../src/index.js'

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
                    'en-*': Languages.En,
                    'uk-*': Languages.Uk,
                },
                autoReload: false,
                updateFiles: false,
                objectNotation: true,
                defaultLocale: Languages.Uk,
            })
        })

        it('should return just found item', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { acceptLanguage: Languages.Uk } } as unknown as AlsData)
            mockI18nInstance.__.mockReturnValue('value')

            const i18nService = new I18nService(asyncLocalStorage)

            expect(i18nService.get('key')).toBe('value')
            expect(mockI18nInstance.configure).toHaveBeenCalledWith({
                directory: './dist/locales',
                fallbacks: {
                    'en-*': Languages.En,
                    'uk-*': Languages.Uk,
                },
                autoReload: false,
                updateFiles: false,
                objectNotation: true,
                defaultLocale: Languages.Uk,
            })
        })

        it('should use supported locale from acceptLanguage header', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { acceptLanguage: Languages.En } } as unknown as AlsData)
            mockI18nInstance.__.mockReturnValue('value')

            const i18nService = new I18nService(asyncLocalStorage)

            expect(i18nService.get('key')).toBe('value')
            expect(mockI18nInstance.__).toHaveBeenCalledWith({ locale: Languages.En, phrase: 'key' }, {})
        })

        it('should ignore appLocale header', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { appLocale: Languages.En } } as unknown as AlsData)
            mockI18nInstance.__.mockReturnValue('value')

            const i18nService = new I18nService(asyncLocalStorage)

            i18nService.get('key')

            expect(mockI18nInstance.__).toHaveBeenCalledWith({ locale: '', phrase: 'key' }, {})
        })

        it.each(['de', 'EN', 'en-US'])('should ignore not supported acceptLanguage header %s', (acceptLanguage) => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { acceptLanguage } } as unknown as AlsData)
            mockI18nInstance.__.mockReturnValue('value')

            const i18nService = new I18nService(asyncLocalStorage)

            i18nService.get('key')

            expect(mockI18nInstance.__).toHaveBeenCalledWith({ locale: '', phrase: 'key' }, {})
        })

        it('should decode html text', () => {
            const i18nService = new I18nService(asyncLocalStorage)

            mockI18nInstance.__.mockReturnValue('Дар&#39;я')

            expect(i18nService.get('key')).toBe("Дар'я")
        })
    })

    describe('getLocale', () => {
        it('should set and return locale', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { acceptLanguage: Languages.Uk } } as unknown as AlsData)
            mockI18nInstance.setLocale.mockReturnValue('uk')

            const i18nService = new I18nService(asyncLocalStorage)

            expect(i18nService.getLocale()).toBe('uk')
            expect(mockI18nInstance.configure).toHaveBeenCalledWith({
                directory: './dist/locales',
                fallbacks: {
                    'en-*': Languages.En,
                    'uk-*': Languages.Uk,
                },
                autoReload: false,
                updateFiles: false,
                objectNotation: true,
                defaultLocale: Languages.Uk,
            })
        })
    })
})
