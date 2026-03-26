/* eslint-disable no-underscore-dangle */
export const i18nStubs = {
    configure: vi.fn(),
    __: vi.fn(),
    setLocale: vi.fn(),
}

export class I18nMock {
    configure(...args: unknown[]): unknown {
        return i18nStubs.configure(...args)
    }

    __(...args: unknown[]): unknown {
        return i18nStubs.__(...args)
    }

    setLocale(...args: unknown[]): unknown {
        return i18nStubs.setLocale(...args)
    }
}
