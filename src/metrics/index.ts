import { MissedInterpolationParamsTotalLabelsMap, MissedLocaleKeysTotalLabelsMap } from 'src/interfaces/metrics'

import { Counter } from '@diia-inhouse/diia-metrics'

export const missedLocaleKeysTotalMetric = new Counter<MissedLocaleKeysTotalLabelsMap>(
    'diia_i18n_missed_locale_keys_total',
    ['locale', 'status'],
    'Track amount of missed locale keys',
)

export const missedInterpolationParamsTotalMetric = new Counter<MissedInterpolationParamsTotalLabelsMap>(
    'diia_i18n_missed_interpolation_params_total',
    ['locale'],
    'Track amount of missed interpolation params',
)
