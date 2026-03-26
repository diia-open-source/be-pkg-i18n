import { LocaleType } from '../services/i18n'

export interface MissedLocaleKeysTotalLabelsMap {
    locale: LocaleType
    status: 'missing' | 'fallback_used'
}

export interface MissedInterpolationParamsTotalLabelsMap {
    locale: LocaleType
}
