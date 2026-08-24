import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeBase, uniquifyDataUrl, GatewayError, checkHealth, uploadImage, queryVision,
} from '../assets/plugins/baitong-vision/src/gateway.js'
import { registerTwinAdapters, _resetMarkerCache } from '../assets/plugins/baitong-vision/src/twin.mjs'
import { createLookAtImageTool } from '../assets/plugins/baitong-vision/src/tool.js'

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

/** 替换 globalThis.fetch；t.after 自动还原。返回请求记录。 */
function stubFetch(t, impl) {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  const calls = []
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts })
    return impl({ url, opts, calls })
  }
  return calls
}

/** 构造一个最小 Response 形状（queryVision/uploadImage 只用 ok/status/text）。 */
function res(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

/** 构造一个能识别被代理 adapter 的 llm 注册表条目。 */
function makeReg(models, onStreamOptions) {
  const adapter = {
    listModels: async (provider) => [...models],
    resolveModel: async (provider, id) => models.find((m) => m.id === id),
    stream: async function* (options) {
      if (onStreamOptions) onStreamOptions(options)
      yield { type: 'text', text: 'ok' }
    },
  }
  return { adapter, reg: { adapter } }
}

const CFG = (over = {}) => () => ({
  gateway_base: 'http://gw',
  vision_models: [{ id: 'deepseek-chat', provider: 'pi-ai' }],
  ...over,
})

const IMG = 'data:image/png;base64,AAAA'

// ---------------------------------------------------------------------------
// gateway.js
// ---------------------------------------------------------------------------

test('normalizeBase: 去尾部斜杠，空串/空白回退默认', () => {
  assert.equal(normalizeBase('http://localhost:8102/'), 'http://localhost:8102')
  assert.equal(normalizeBase('http://localhost:8102////'), 'http://localhost:8102')
  assert.equal(normalizeBase('http://gw:9000'), 'http://gw:9000')
  assert.equal(normalizeBase(''), 'http://localhost:8102')
  assert.equal(normalizeBase(null), 'http://localhost:8102')
  assert.equal(normalizeBase('   '), 'http://localhost:8102')
})

test('uniquifyDataUrl: 注入唯一参数绕缓存；非 data URL 原样返回', () => {
  assert.equal(uniquifyDataUrl(IMG, 42), 'data:image/png;u=42;base64,AAAA')
  // 默认盐是时间戳，只要满足格式即证明唯一化生效
  assert.match(uniquifyDataUrl(IMG), /^data:image\/png;u=\d+;base64,AAAA$/)
  assert.equal(uniquifyDataUrl('https://gw/x.png'), 'https://gw/x.png')
  assert.equal(uniquifyDataUrl(''), '')
  assert.equal(uniquifyDataUrl(null), '')
})

test('checkHealth: 健康返回 true，非 200 / 网络失败返回 false（不抛错）', async (t) => {
  let mode = 0
  stubFetch(t, () => {
    mode++
    if (mode === 1) return res(200)
    if (mode === 2) return res(500)
    throw new TypeError('ECONNREFUSED')
  })
  assert.equal(await checkHealth('http://gw'), true)
  assert.equal(await checkHealth('http://gw'), false)
  assert.equal(await checkHealth('http://gw'), false)
})

test('uploadImage: 200 → true，请求体含唯一化 data URL + noop 提示', async (t) => {
  const calls = stubFetch(t, () => res(200, 'ok'))
  const ok = await uploadImage('http://gw/', IMG, { timeoutMs: 1000 })
  assert.equal(ok, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://gw/v1/chat/completions')
  const body = JSON.parse(calls[0].opts.body)
  assert.equal(body.stream, false)
  assert.equal(body.messages[0].content[0].type, 'image_url')
  assert.match(body.messages[0].content[0].image_url.url, /^data:image\/png;u=\d+;base64,AAAA$/)
  assert.match(body.messages[0].content[1].text, /直接回复 ok/)
})

test('uploadImage: model 透传', async (t) => {
  const calls = stubFetch(t, () => res(200, 'ok'))
  await uploadImage('http://gw', IMG, { model: 'deepseek-v3' })
  assert.equal(JSON.parse(calls[0].opts.body).model, 'deepseek-v3')
})

test('uploadImage: 非 200 → GatewayError http', async (t) => {
  stubFetch(t, () => res(500, 'boom'))
  await assert.rejects(uploadImage('http://gw', IMG), (e) => {
    assert.ok(e instanceof GatewayError)
    assert.equal(e.kind, 'http')
    assert.equal(e.status, 500)
    assert.match(e.message, /上传失败/)
    return true
  })
})

test('uploadImage: fetch 拒绝 → offline；超时 → timeout', async (t) => {
  let mode = 0
  stubFetch(t, () => {
    mode++
    if (mode === 1) { const e = new TypeError('fetch failed'); throw e }
    const e = new Error('The operation was aborted')
    e.name = 'TimeoutError'
    throw e
  })
  await assert.rejects(uploadImage('http://gw', IMG), (e) => e.kind === 'offline' && /不可达/.test(e.message))
  await assert.rejects(uploadImage('http://gw', IMG), (e) => e.kind === 'timeout' && /超时/.test(e.message))
})

test('queryVision: 成功返回 answer/reasoning/cdn_url', async (t) => {
  const calls = stubFetch(t, () => res(200, { answer: '图里是表格', reasoning: '思考…', cdn_url: 'https://cdn/1.png' }))
  const r = await queryVision('http://gw', '这个表格第三行？')
  assert.equal(r.answer, '图里是表格')
  assert.equal(r.reasoning, '思考…')
  assert.equal(r.cdn_url, 'https://cdn/1.png')
  assert.equal(calls[0].url, 'http://gw/v1/vision/query')
  assert.equal(JSON.parse(calls[0].opts.body).question, '这个表格第三行？')
})

test('queryVision: 400 → 提示先发图', async (t) => {
  stubFetch(t, () => res(400, 'no image'))
  await assert.rejects(queryVision('http://gw', 'x'), (e) => {
    assert.equal(e.kind, 'http')
    assert.equal(e.status, 400)
    assert.match(e.message, /没有可用的图片/)
    return true
  })
})

test('queryVision: 500 → http；非法 JSON → badpayload；空 answer → badpayload', async (t) => {
  let mode = 0
  stubFetch(t, () => {
    mode++
    if (mode === 1) return res(500, 'err')
    if (mode === 2) return res(200, 'not-json')
    return res(200, { answer: '' })
  })
  await assert.rejects(queryVision('http://gw', 'x'), (e) => e.kind === 'http' && e.status === 500)
  await assert.rejects(queryVision('http://gw', 'x'), (e) => e.kind === 'badpayload' && /无法解析/.test(e.message))
  await assert.rejects(queryVision('http://gw', 'x'), (e) => e.kind === 'badpayload' && /空内容/.test(e.message))
})

test('queryVision: offline / timeout 归类', async (t) => {
  let mode = 0
  stubFetch(t, () => {
    mode++
    if (mode === 1) { const e = new TypeError('fetch failed'); throw e }
    const e = new Error('aborted')
    e.name = 'AbortError'
    throw e
  })
  await assert.rejects(queryVision('http://gw', 'x'), (e) => e.kind === 'offline')
  await assert.rejects(queryVision('http://gw', 'x'), (e) => e.kind === 'timeout')
})

// ---------------------------------------------------------------------------
// twin.mjs — 视觉孪生 adapter
// ---------------------------------------------------------------------------

test('twin: 勾选模型声明 inputModalities + 名称后缀，未勾选不动', async () => {
  _resetMarkerCache()
  const { adapter, reg } = makeReg([
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'other', name: 'Other' },
  ])
  const ctx = { get: () => undefined, effect: () => {} }
  const n = registerTwinAdapters(ctx, { registration: () => reg }, CFG())
  assert.equal(n, 1)

  const list = await reg.adapter.listModels('pi-ai')
  const deco = list.find((m) => m.id === 'deepseek-chat')
  assert.deepEqual(deco.inputModalities, ['text', 'image'])
  assert.equal(deco.name, 'DeepSeek Chat (百通视觉)')
  assert.equal(list.find((m) => m.id === 'other').name, 'Other')
  assert.equal(list.find((m) => m.id === 'other').inputModalities, undefined)

  const resolved = await reg.adapter.resolveModel('pi-ai', 'deepseek-chat')
  assert.deepEqual(resolved.inputModalities, ['text', 'image'])
})

test('twin: 图片块上传网关并替换为标记文本；同图只传一次（sha1 去重）', async (t) => {
  _resetMarkerCache()
  const calls = stubFetch(t, () => res(200, 'ok'))
  const attachments = {
    readImage: async (att) => ({ data: att.id === 'a1' ? Buffer.from('PNGDATA-1') : Buffer.from('PNGDATA-2') }),
  }
  const seen = []
  const { reg } = makeReg([{ id: 'deepseek-chat', name: 'DeepSeek Chat' }], (o) => seen.push(o))
  const ctx = { get: (k) => (k === 'attachments' ? attachments : undefined), effect: () => {} }
  registerTwinAdapters(ctx, { registration: () => reg }, CFG())

  const msgs = [{ role: 'user', content: [{ type: 'image', attachment: { id: 'a1' } }] }]
  for await (const _ of reg.adapter.stream({ messages: msgs })) {} // 首次：上传
  const block = seen[0].messages[0].content[0]
  assert.equal(block.type, 'text')
  assert.match(block.text, /look_at_image/)
  assert.equal(calls.length, 1, '首次贴图应上传一次')
  const body = JSON.parse(calls[0].opts.body)
  assert.match(body.messages[0].content[0].image_url.url, /;u=\d+;base64,/)

  for await (const _ of reg.adapter.stream({ messages: msgs })) {} // 重复：命中缓存
  assert.equal(calls.length, 1, '同图重复出现不应再上传')
})

test('twin: 上传失败注入失败标记；新图走新上传', async (t) => {
  _resetMarkerCache()
  let mode = 0
  stubFetch(t, () => { mode++; return mode === 1 ? res(500, 'err') : res(200, 'ok') })
  const attachments = {
    readImage: async (att) => ({ data: att.id === 'a1' ? Buffer.from('AAA') : Buffer.from('BBB') }),
  }
  const seen = []
  const { reg } = makeReg([{ id: 'deepseek-chat', name: 'DeepSeek Chat' }], (o) => seen.push(o))
  const ctx = { get: (k) => (k === 'attachments' ? attachments : undefined), effect: () => {} }
  registerTwinAdapters(ctx, { registration: () => reg }, CFG())

  for await (const _ of reg.adapter.stream({ messages: [{ role: 'user', content: [{ type: 'image', attachment: { id: 'a1' } }] }] })) {}
  assert.match(seen[0].messages[0].content[0].text, /上传视觉网关失败/)
  assert.equal(mode, 1)

  for await (const _ of reg.adapter.stream({ messages: [{ role: 'user', content: [{ type: 'image', attachment: { id: 'a2' } }] }] })) {}
  assert.match(seen[1].messages[0].content[0].text, /look_at_image/)
  assert.equal(mode, 2)
})

test('twin: ctx.effect 注册还原，卸载时恢复原 adapter', async () => {
  _resetMarkerCache()
  const { adapter, reg } = makeReg([{ id: 'deepseek-chat', name: 'DeepSeek Chat' }])
  const restores = []
  const ctx = { get: () => undefined, effect: (fn) => { restores.push(fn) } }
  registerTwinAdapters(ctx, { registration: () => reg }, CFG())
  assert.notEqual(reg.adapter, adapter, '注册后应被孪生替换')
  const cleanup = restores[0]() // Cordis effect 约定：setup 立即执行并返回 dispose
  cleanup()
  assert.equal(reg.adapter, adapter, '卸载后应还原原 adapter')
})

// ---------------------------------------------------------------------------
// tool.js — look_at_image
// ---------------------------------------------------------------------------

test('look_at_image: declares a DSH output schema and text renderer', () => {
  const tool = createLookAtImageTool({}, CFG())

  assert.deepEqual(tool.output.schema, {
    type: 'object',
    additionalProperties: false,
    properties: {
      answer: { type: 'string' },
      cdn_url: { type: 'string' },
      error: { type: 'string' },
    },
    required: ['answer'],
  })
  assert.deepEqual(tool.output.render({}, { answer: '红色按钮', cdn_url: 'https://cdn/1.png' }), [
    { type: 'text', text: '红色按钮' },
  ])
  assert.deepEqual(tool.output.render({}, { answer: '', error: '没有可用的图片' }), [
    { type: 'text', text: '没有可用的图片' },
  ])
})

test('look_at_image: 空 question 抛错', async () => {
  const tool = createLookAtImageTool({}, CFG())
  await assert.rejects(tool.execute({ question: '   ' }, { signal: new AbortController().signal }), /non-empty/)
})

test('look_at_image: 成功返回 answer/cdn_url', async (t) => {
  stubFetch(t, () => res(200, { answer: '红色按钮', cdn_url: 'https://cdn/1.png' }))
  const tool = createLookAtImageTool({}, CFG({ query_timeout_ms: 5000 }))
  const r = await tool.execute({ question: '右上角按钮颜色？' }, { signal: new AbortController().signal })
  assert.equal(r.answer, '红色按钮')
  assert.equal(r.cdn_url, 'https://cdn/1.png')
})

test('look_at_image: 网关错误降级为文本结果（不抛异常）', async (t) => {
  let mode = 0
  stubFetch(t, () => {
    mode++
    if (mode === 1) return res(400, 'no image')
    const e = new TypeError('fetch failed')
    throw e
  })
  const tool = createLookAtImageTool({}, CFG())
  const sig = new AbortController().signal
  const r1 = await tool.execute({ question: '图里有什么？' }, { signal: sig })
  assert.equal(r1.answer, '')
  assert.match(r1.error, /没有可用的图片/)
  const r2 = await tool.execute({ question: '图里有什么？' }, { signal: sig })
  assert.equal(r2.answer, '')
  assert.match(r2.error, /不可达/)
})

test('look_at_image: 请求被取消 → cancelled', async (t) => {
  const ctrl = new AbortController()
  ctrl.abort()
  stubFetch(t, ({ opts }) => {
    if (opts.signal?.aborted) {
      const e = new Error('aborted')
      e.name = 'AbortError'
      throw e
    }
    return res(200, { answer: 'x' })
  })
  const tool = createLookAtImageTool({}, CFG())
  await assert.rejects(tool.execute({ question: '图里有什么？' }, { signal: ctrl.signal }), /cancelled/)
})
