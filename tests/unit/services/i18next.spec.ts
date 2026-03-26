import { AsyncLocalStorage } from 'node:async_hooks'

import { LOCALE } from 'src/interfaces/services/i18n'
import { I18nextService } from 'src/services/i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { AlsData } from '@diia-inhouse/types'

const mockInstance = {
    use: vi.fn(function () {
        return this
    }),
    init: vi.fn(function () {
        return this
    }),
    t: vi.fn((key, options) => {
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
        createInstance: vi.fn(() => mockInstance),
    }
})

vi.mock('i18next-fs-backend', () => {
    return {
        default: {},
    }
})

vi.mock('node:path', () => {
    const mockJoin = vi.fn((...args) => args.join('/'))

    return {
        join: mockJoin,
        default: {
            join: mockJoin,
        },
    }
})

vi.mock('node:fs', () => {
    return {
        lstatSync: vi.fn(() => ({ isDirectory: (): boolean => true })),
        readdirSync: vi.fn(() => []),
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
        getStore: vi.fn().mockReturnValue({ headers: { appLocale: LOCALE.uk } }),
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
                    lng: LOCALE.uk,
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
                    lng: LOCALE.uk,
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
                    lng: LOCALE.uk,
                }),
            )
            expect(result).toBe('translated(uk):common.key')
        })

        it('should pass options to the translation function', () => {
            i18nextService.get('common.key', { count: 3 })

            expect(mockInstance.t).toHaveBeenCalledWith(
                'common.key',
                expect.objectContaining({
                    lng: LOCALE.uk,
                    count: 3,
                }),
            )
        })
    })

    describe('getLocale', () => {
        it('should return the current locale from AsyncLocalStorage', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { appLocale: LOCALE.en } } as unknown as AlsData)
            const result = i18nextService.getLocale()

            expect(result).toBe(LOCALE.en)
        })

        it('should return default locale when not set in AsyncLocalStorage', () => {
            vi.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({} as unknown as AlsData)
            const result = i18nextService.getLocale()

            expect(result).toBe(LOCALE.uk)
        })
    })
})
