import test from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sessionManage from '../scripts/patch-session-manage.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('session management host patch matches the installed DSH release', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-session-manage-'))
  const relative = join('@deepseek-ai', 'dsh-host-apiproxy', 'lib', 'index.js')
  const target = join(temp, relative)
  try {
    await mkdir(dirname(target), { recursive: true })
    await cp(join(root, 'node_modules', relative), target, { recursive: true })
    const changed = sessionManage.patchSessionManage(temp)
    assert.ok(changed === 0 || changed === 1, `unexpected patched file count: ${changed}`)
    const patched = await readFile(target, 'utf8')
    assert.match(patched, /dsh-desktop patch \(session manage\)/)
    assert.match(patched, /"workspace\.deleteSession"/)
    assert.match(patched, /dshSessionRunningState/)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})
