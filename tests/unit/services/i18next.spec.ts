import { AsyncLocalStorage } from 'node:async_hooks'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'

import { DiiaLogger } from '@diia-inhouse/diia-logger'
import { AlsData, Languages } from '@diia-inhouse/types'

import { I18nextService } from '../../../src/services/i18next.js'

type TOptions = { ns?: string; lng?: string } | undefined

const mockInstance = {
    use: vi.fn<(this: unknown) => unknown>(function (this: unknown) {
        return this
    }),
    init: vi.fn<(this: unknown) => unknown>(function (this: unknown) {
        return this
    }),
    t: vi.fn<(key: string, options?: TOptions) => string>((key, options) => {
        if (key === 'not.found.key') {
            return key
        }

        const ns = options?.ns ? `[${options.ns}]` : ''
        const lng = options?.lng ? `(${options.lng})` : ''

        return `translated${ns}${lng}:${key}`
    }),
}

vi.mock('i18next', () => {
    return {
        createInstance: vi.fn<() => typeof mockInstance>(() => mockInstance),
    }
})

vi.mock('i18next-fs-backend', () => {
    return {
        default: {},
    }
})

vi.mock('node:path', () => {
    const mockJoin = vi.fn<(...args: string[]) => string>((...args) => args.join('/'))

    return {
        join: mockJoin,
        default: {
            join: mockJoin,
        },
    }
})

vi.mock('node:fs', () => {
    return {
        lstatSync: vi.fn<() => { isDirectory: () => boolean }>(() => ({ isDirectory: (): boolean => true })),
        readdirSync: vi.fn<() => string[]>(() => []),
    }
})

interface TestTranslations {
    some: {
        key: string
    }
    common: {
        key: string
    }
    not: {
        found: {
            key: string
        }
    }
}

describe('I18nextService', () => {
    let i18nextService: I18nextService
    const asyncLocalStorage = {
        getStore: vi.fn<() => { headers: { acceptLanguage: string } }>().mockReturnValue({ headers: { acceptLanguage: Languages.Uk } }),
    } as unknown as AsyncLocalStorage<AlsData>
    const logger = mock<DiiaLogger>()

    const localesDirectory = './test/locales'

    beforeEach(() => {
        vi.clearAllMocks()
        i18nextService = new I18nextService(localesDirectory, {}, asyncLocalStorage, logger)
    })

    describe('ns', () => {
        it('should return a translation function for the specified namespace', () => {
            const translateFunc = i18nextService.ns<TestTranslations>('test/namespace')
            const result = translateFunc('some.key')

            expect(mockInstance.t).toHaveBeenCalledWith(
                'some.key',
                expect.objectContaining({
                    ns: 'test/namespace',
                    lng: Languages.Uk,
                }),
            )
            expect(result).toBe('translated[test/namespace](uk):some.key')
        })

        it('should pass additional options to the translation function', () => {
            const translateFunc = i18nextService.ns<TestTranslations>('test/namespace')

            translateFunc('some.key', { count: 2, context: 'special' })

            expect(mockInstance.t).toHaveBeenCalledWith(
                'some.key',
                expect.objectContaining({
                    ns: 'test/namespace',
                    lng: Languages.Uk,
                    count: 2,
                    context: 'special',
                }),
            )
        })
    })

    describe('get', () => {
        it('should translate keys without namespace', () => {
            const result = i18nextService.get('common.key')

            expect(mockInstance.t).toHaveBeenCalledWith(
                'common.key',
                expect.objectContaining({
                    lng: Languages.Uk,
                }),
            )
            expect(result).toBe('translated(uk):common.key')
        })

        it('should translate keys using locale from acceptLanguage header', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { acceptLanguage: Languages.En } } as unknown as AlsData)

            const result = i18nextService.get('common.key')

            expect(mockInstance.t).toHaveBeenCalledWith('common.key', expect.objectContaining({ lng: Languages.En }))
            expect(result).toBe('translated(en):common.key')
        })

        it('should pass options to the translation function', () => {
            i18nextService.get('common.key', { count: 3 })

            expect(mockInstance.t).toHaveBeenCalledWith(
                'common.key',
                expect.objectContaining({
                    lng: Languages.Uk,
                    count: 3,
                }),
            )
        })
    })

    describe('getLocale', () => {
        it('should return supported locale from acceptLanguage header', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { acceptLanguage: Languages.En } } as unknown as AlsData)
            const result = i18nextService.getLocale()

            expect(result).toBe(Languages.En)
        })

        it('should return default locale when not set in AsyncLocalStorage', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({})
            const result = i18nextService.getLocale()

            expect(result).toBe(Languages.Uk)
        })

        it('should ignore appLocale header', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { appLocale: Languages.En } } as unknown as AlsData)
            const result = i18nextService.getLocale()

            expect(result).toBe(Languages.Uk)
        })

        it.each(['de', 'EN', 'en-US'])('should return default locale when acceptLanguage header %s is not supported', (acceptLanguage) => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { acceptLanguage } } as unknown as AlsData)
            const result = i18nextService.getLocale()

            expect(result).toBe(Languages.Uk)
        })
    })
})
