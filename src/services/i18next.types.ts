import * as i18next from 'i18next'

export type DotNestedKeys<T> = T extends object
    ? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${DotNestedKeys<T[K]>}` | K : K) : never }[keyof T & string]
    : ''

export type TranslationFunction<TResource> = <K extends DotNestedKeys<TResource>>(key: K, options?: i18next.TOptions) => string

export interface LocalesDirectoryContent {
    languages: string[]
    namespaces: string[]
}
