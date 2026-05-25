import { Counter } from '@diia-inhouse/diia-metrics'

import { MissedInterpolationParamsTotalLabelsMap, MissedLocaleKeysTotalLabelsMap } from '../interfaces/metrics/index.js'

export const missedLocaleKeysTotalMetric: Counter<MissedLocaleKeysTotalLabelsMap> = new Counter<MissedLocaleKeysTotalLabelsMap>(
    'diia_i18n_missed_locale_keys_total',
    ['locale', 'status'],
    'Track amount of missed locale keys',
)

export const missedInterpolationParamsTotalMetric: Counter<MissedInterpolationParamsTotalLabelsMap> =
    new Counter<MissedInterpolationParamsTotalLabelsMap>(
        'diia_i18n_missed_interpolation_params_total',
        ['locale'],
        'Track amount of missed interpolation params',
    )
