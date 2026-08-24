import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const pluginsDir = fileURLToPath(new URL('../assets/plugins/', import.meta.url))

test('client plugins do not require the optional dsh-client-web-react runtime module', async () => {
  const incompatible = []
  for (const entry of await readdir(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = join(pluginsDir, entry.name)
    const clientFile = join(dir, 'lib', 'client.js')
    const packageFile = join(dir, 'package.json')
    try {
      const [client, packageText] = await Promise.all([
        readFile(clientFile, 'utf8'),
        readFile(packageFile, 'utf8'),
      ])
      const pkg = JSON.parse(packageText)
      if (client.includes('require("@deepseek-ai/dsh-client-web-react")')) {
        incompatible.push(pkg.name || entry.name)
      }
    } catch {
      // A plugin without a browser half is outside this contract.
    }
  }

  assert.deepEqual(incompatible, [])
})
