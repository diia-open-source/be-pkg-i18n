export const i18nextStubs = {
    createInstance: vi.fn(),
    init: vi.fn(),
    t: vi.fn(),
}

export const i18nextInstanceStubs = {
    init: vi.fn().mockResolvedValue(),
    t: vi.fn(),
}

export class I18nextMock {
    createInstance(): unknown {
        i18nextStubs.createInstance()

        return i18nextInstanceStubs
    }

    init(...args: unknown[]): unknown {
        return i18nextStubs.init(...args)
    }

    t(...args: unknown[]): unknown {
        return i18nextStubs.t(...args)
    }
}
