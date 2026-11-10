import { Language, Languages } from '@diia-inhouse/types'
import type { ObjectRule, StringRule, ValidationSchema } from '@diia-inhouse/validators'

const localizedTextRule: StringRule = { type: 'string', empty: false, pattern: /\S/ }

export function getLocalizedValidationSchema(fields: readonly string[]): ObjectRule {
    const itemProps: ValidationSchema = Object.fromEntries(fields.map((field): [string, StringRule] => [field, localizedTextRule]))
    const localeRules = Object.values(Languages).map((language): [Language, ObjectRule] => [
        language,
        { type: 'object', optional: language !== Languages.Uk, props: itemProps },
    ])

    return { type: 'object', props: Object.fromEntries(localeRules) }
}
