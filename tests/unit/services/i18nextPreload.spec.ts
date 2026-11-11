import { AsyncLocalStorage } from 'node:async_hooks'

import { describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'

import { DiiaLogger } from '@diia-inhouse/diia-logger'
import { AlsData, Languages } from '@diia-inhouse/types'

import { I18nextService } from '../../../src/index.js'

interface TestTranslations {
    'english.only.key': string
}

describe('I18nextService preload', () => {
    const localesDirectory = './tests/locales'
    const asyncLocalStorage = new AsyncLocalStorage<AlsData>()
    const logger = mock<DiiaLogger>()

    it('should translate into a non-default language requested explicitly without any init options', () => {
        const i18nextService = new I18nextService(localesDirectory, undefined, asyncLocalStorage, logger)
        const t = i18nextService.ns<TestTranslations>('test')

        expect(t('english.only.key', { lng: Languages.En })).toBe('English only')
    })

    it.each([{ language: Languages.Uk }, { language: Languages.En }])(
        'should load the $language resources found in the locales directory on init',
        ({ language }) => {
            const i18nextService = new I18nextService(localesDirectory, undefined, asyncLocalStorage, logger)

            expect(i18nextService.getInstance().hasResourceBundle(language, 'test')).toBe(true)
        },
    )

    it('should let init options override the preloaded languages', () => {
        const i18nextService = new I18nextService(localesDirectory, { preload: [] }, asyncLocalStorage, logger)

        expect(i18nextService.getInstance().hasResourceBundle(Languages.En, 'test')).toBe(false)
    })
})
