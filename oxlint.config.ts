import { defineConfig, base } from '@diia-inhouse/oxc-config/oxlint'

export default defineConfig({
    ...base,
    ignorePatterns: [...base.ignorePatterns, 'docs'],
})
