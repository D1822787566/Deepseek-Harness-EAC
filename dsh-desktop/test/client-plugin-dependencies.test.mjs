import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const pluginsDir = fileURLToPath(new URL('../assets/plugins/', import.meta.url))

test('bundled client plugins do not reference the removed dsh-client-web-react package', async () => {
  const incompatible = []
  for (const entry of await readdir(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = join(pluginsDir, entry.name)
    try {
      const [client, packageText] = await Promise.all([
        readFile(join(dir, 'lib', 'client.js'), 'utf8'),
        readFile(join(dir, 'package.json'), 'utf8'),
      ])
      if (client.includes('@deepseek-ai/dsh-client-web-react') || packageText.includes('@deepseek-ai/dsh-client-web-react')) {
        incompatible.push(entry.name)
      }
    } catch {
      // A plugin without a browser half is outside this contract.
    }
  }

  assert.deepEqual(incompatible, [])
})

test('settings plugins bind external stores through the current React API', async () => {
  for (const pluginName of ['dsh-conversation-tweaks', 'dsh-openclaw-bridge', 'dsh-prompt-custom', 'dsh-third-party-thinking']) {
    const client = await readFile(join(pluginsDir, pluginName, 'lib', 'client.js'), 'utf8')
    assert.match(client, /react\.useSyncExternalStore\(/, `${pluginName} must bind its settings store without the removed helper package`)
  }
})
