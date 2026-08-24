import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const pluginsDir = fileURLToPath(new URL('../assets/plugins/', import.meta.url))

test('core client plugins keep and declare dsh-client-web-react', async () => {
  const pluginNames = [
    'dsh-conversation-tweaks',
    'dsh-openclaw-bridge',
    'dsh-prompt-custom',
    'dsh-session-manager',
    'dsh-third-party-thinking',
  ]

  for (const pluginName of pluginNames) {
    const dir = join(pluginsDir, pluginName)
    const [client, packageText] = await Promise.all([
      readFile(join(dir, 'lib', 'client.js'), 'utf8'),
      readFile(join(dir, 'package.json'), 'utf8'),
    ])
    const pkg = JSON.parse(packageText)
    assert.match(client, /require\(["']@deepseek-ai\/dsh-client-web-react["']\)/, `${pluginName} must use the platform module`)
    assert.equal(pkg.peerDependencies?.['@deepseek-ai/dsh-client-web-react'], '*', `${pluginName} must declare the platform module`)
  }
})
