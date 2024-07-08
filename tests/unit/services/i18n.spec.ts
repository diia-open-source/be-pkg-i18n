/* eslint-disable no-underscore-dangle */
import { AsyncLocalStorage } from 'node:async_hooks'

import { mockInstance } from '@diia-inhouse/test'
import { AlsData } from '@diia-inhouse/types'

// eslint-disable-next-line import/order
import { I18nMock, i18nStubs } from '../../mocks/i18n'

jest.mock('i18n', () => ({
    I18n: I18nMock,
}))

// eslint-disable-next-line import/order
import { I18nService } from '../../../src'

describe(`${I18nService.name}`, () => {
    const asyncLocalStorage = mockInstance(AsyncLocalStorage)

    describe('get', () => {
        it('should return just key when item not found', () => {
            const store = undefined

            jest.spyOn(asyncLocalStorage, 'getStore').mockReturnValue(store)

            const i18nService = new I18nService(<AsyncLocalStorage<AlsData>>asyncLocalStorage)

            expect(i18nService.get('key', {}, true)).toBe('key')
            expect(i18nStubs.configure).toHaveBeenCalledWith({
                directory: './dist/locales',
                fallbacks: {
                    'en-*': 'en',
                    'uk-*': 'uk',
                },
                autoReload: false,
                updateFiles: false,
                objectNotation: true,
                header: 'appLocale',
                defaultLocale: 'uk',
            })
        })
        it('should return just found item', () => {
            jest.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { appLocale: 'uk' } })
            i18nStubs.__.mockReturnValue('value')

            const i18nService = new I18nService(<AsyncLocalStorage<AlsData>>asyncLocalStorage)

            expect(i18nService.get('key')).toBe('value')
            expect(i18nStubs.configure).toHaveBeenCalledWith({
                directory: './dist/locales',
                fallbacks: {
                    'en-*': 'en',
                    'uk-*': 'uk',
                },
                autoReload: false,
                updateFiles: false,
                objectNotation: true,
                header: 'appLocale',
                defaultLocale: 'uk',
            })
        })
    })

    describe('getLocale', () => {
        it('should set and return locale', () => {
            jest.spyOn(asyncLocalStorage, 'getStore').mockReturnValue({ headers: { appLocale: 'uk' } })
            i18nStubs.setLocale.mockReturnValue('uk')

            const i18nService = new I18nService(<AsyncLocalStorage<AlsData>>asyncLocalStorage)

            expect(i18nService.getLocale()).toBe('uk')
            expect(i18nStubs.configure).toHaveBeenCalledWith({
                directory: './dist/locales',
                fallbacks: {
                    'en-*': 'en',
                    'uk-*': 'uk',
                },
                autoReload: false,
                updateFiles: false,
                objectNotation: true,
                header: 'appLocale',
                defaultLocale: 'uk',
            })
        })
    })
})
