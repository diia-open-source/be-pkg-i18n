import { AsyncLocalStorage } from 'node:async_hooks'

import { I18nService } from 'src'
import { LOCALE } from 'src/interfaces/services/i18n'
import { mock } from 'vitest-mock-extended'

import { AlsData } from '@diia-inhouse/types'

const mockI18nInstance = {
    configure: vi.fn(),
    __: vi.fn(),
    setLocale: vi.fn(),
}

vi.mock('i18n', () => ({
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    I18n: function () {
        return mockI18nInstance
    },
}))

describe(`${I18nService.name}`, () => {
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
            // eslint-disable-next-line no-underscore-dangle
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

            // eslint-disable-next-line no-underscore-dangle
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
