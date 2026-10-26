import { Language } from '@diia-inhouse/types'

export interface MissedLocaleKeysTotalLabelsMap {
    locale: Language
    status: 'missing' | 'fallback_used'
}

export interface MissedInterpolationParamsTotalLabelsMap {
    locale: Language
}
