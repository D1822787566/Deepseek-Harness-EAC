import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

let assertDshDependencyCohort
try {
  ({ assertDshDependencyCohort } = await import('../dsh-dependency-cohort.js'))
} catch {
  // RED phase: the production guard does not exist yet.
}

test('accepts a coherent DSH release cohort', () => {
  assert.equal(typeof assertDshDependencyCohort, 'function', 'dependency cohort guard is missing')
  const versions = new Map([
    ['@deepseek-ai/dsh', '0.1.0-rc.7'],
    ['@deepseek-ai/dsh-web-app', '0.1.0-rc.7'],
    ['@deepseek-ai/dsh-web-frontend', '0.1.0-rc.7'],
    ['@deepseek-ai/dsh-client-modules', '0.1.0-rc.7'],
  ])

  assert.doesNotThrow(() => assertDshDependencyCohort((name) => versions.get(name)))
})

test('rejects the rc.7 CLI mixed with rc.8 web modules', () => {
  assert.equal(typeof assertDshDependencyCohort, 'function', 'dependency cohort guard is missing')
  const versions = new Map([
    ['@deepseek-ai/dsh', '0.1.0-rc.7'],
    ['@deepseek-ai/dsh-web-app', '0.1.0-rc.8'],
    ['@deepseek-ai/dsh-web-frontend', '0.1.0-rc.8'],
    ['@deepseek-ai/dsh-client-modules', '0.1.0-rc.8'],
  ])

  assert.throws(
    () => assertDshDependencyCohort((name) => versions.get(name)),
    /DSH dependency versions are mixed.*dsh@0\.1\.0-rc\.7.*dsh-web-frontend@0\.1\.0-rc\.8/s,
  )
})

test('desktop pins the pi-ai authorization peer to the DSH release cohort', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const dshVersion = pkg.dependencies['@deepseek-ai/dsh']

  assert.equal(pkg.dependencies['@deepseek-ai/dsh-authorization'], dshVersion)
  for (const [name, version] of Object.entries(pkg.dependencies)) {
    if (name.startsWith('@deepseek-ai/dsh-')) assert.equal(version, dshVersion, `${name} must match @deepseek-ai/dsh`)
  }
})

test('npm uses the lockfile-compatible peer strategy for the DSH release graph', async () => {
  const npmrc = await readFile(new URL('../.npmrc', import.meta.url), 'utf8').catch(() => '')
  assert.match(npmrc, /^legacy-peer-deps=true$/m)
})
