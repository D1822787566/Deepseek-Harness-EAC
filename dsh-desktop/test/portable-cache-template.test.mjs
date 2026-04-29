import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const { buildFingerprint, patchTemplate } = require('../scripts/patch-portable-template.js')
const templatePath = require.resolve('app-builder-lib/templates/nsis/portable.nsi')

test('portable cache fingerprint is a stable short hex value', () => {
  assert.match(buildFingerprint(), /^[a-f0-9]{12}$/)
  assert.equal(buildFingerprint(), buildFingerprint())
})

test('portable template refreshes a same-version build when its fingerprint changes', () => {
  const original = readFileSync(templatePath, 'utf8')
  const first = patchTemplate(original, '111111111111')
  const second = patchTemplate(first, '222222222222')

  assert.match(second, /StrCmp \$R2 "\$\{VERSION\}-222222222222" dsh_portable_run/)
  assert.match(second, /FileWrite \$R1 "\$\{VERSION\}-222222222222"/)
  assert.doesNotMatch(second, /\$\{VERSION\}-111111111111/)
})
