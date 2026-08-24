import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const packageJson = new URL('../assets/plugins/dsh-conversation-tweaks/package.json', import.meta.url)

test('conversation tweaks declares every non-platform client module it requires', async () => {
  const pkg = JSON.parse(await readFile(fileURLToPath(packageJson), 'utf8'))

  assert.equal(pkg.peerDependencies?.['@deepseek-ai/dsh-client-web-react'], '*')
})
