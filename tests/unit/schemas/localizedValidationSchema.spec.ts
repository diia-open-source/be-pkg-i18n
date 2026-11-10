import { describe, expect, it } from 'vitest'

import { ValidationError } from '@diia-inhouse/errors'
import { AppValidator, ObjectRule, StringRule } from '@diia-inhouse/validators'

import { getLocalizedValidationSchema } from '../../../src/schemas/index.js'

describe('getLocalizedValidationSchema', () => {
    const validator = new AppValidator()
    const schema = getLocalizedValidationSchema(['title', 'text'])
    const ukMessage = { title: 'Назва', text: 'Текст' }
    const enMessage = { title: 'Title', text: 'Text' }

    interface PayloadCase {
        description: string
        payload: unknown
    }

    const acceptedCases: PayloadCase[] = [
        { description: 'uk only', payload: { uk: ukMessage } },
        { description: 'uk and en', payload: { uk: ukMessage, en: enMessage } },
    ]

    const rejectedCases: PayloadCase[] = [
        { description: 'without uk', payload: { en: enMessage } },
        { description: 'with a missing field', payload: { uk: { title: 'Назва' } } },
        { description: 'with an empty field', payload: { uk: { title: 'Назва', text: '' } } },
        { description: 'with a blank field', payload: { uk: { title: 'Назва', text: '   ' } } },
        { description: 'with a non-string field', payload: { uk: { title: 'Назва', text: 13 } } },
        { description: 'wrapped in locales', payload: { locales: { uk: ukMessage } } },
    ]

    it('should build an object rule with required uk and optional other locales', () => {
        const textRule: StringRule = { type: 'string', empty: false, pattern: /\S/ }

        expect(schema).toEqual<ObjectRule>({
            type: 'object',
            props: {
                uk: { type: 'object', optional: false, props: { title: textRule, text: textRule } },
                en: { type: 'object', optional: true, props: { title: textRule, text: textRule } },
            },
        })
    })

    it.each(acceptedCases)('should accept a payload with $description', ({ payload }) => {
        expect(validator.validate({ payload }, { payload: schema })).toBe(true)
    })

    it.each(rejectedCases)('should reject a payload $description', ({ payload }) => {
        expect(() => validator.validate({ payload }, { payload: schema })).toThrow(ValidationError)
    })
})
