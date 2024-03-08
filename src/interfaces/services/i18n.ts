import { Paths } from 'type-fest'

export type I18nKey<L> = L extends object ? Paths<L> : string
