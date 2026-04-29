/**
 * baitong-vision 视觉孪生 adapter
 *
 * 用 Proxy 把已注册的 adapter 包装成"孪生"（移植自 picturereader-vision.mjs）：
 *
 *  - listModels / resolveModel：将被勾选的模型标成 inputModalities:['text',
 *    'image'] + 名称加「(百通视觉)」后缀 -> DSH 原生缩略图/图片块进会话。
 *  - stream：拦截请求里的 image block -> 经网关上传百通 CDN（v4_app 的
 *    /v1/chat/completions 视觉路由副作用）-> 替换成引导 look_at_image 的
 *    文本标记 -> 再转发给原始 adapter（主模型收到纯文本，不会
 *    UNSUPPORTED_CONTENT）。
 *
 * 去重：DSH 每轮请求都携带完整历史，同一张图会反复出现在 messages 里。
 * 按 sha1(bytes) 缓存标记文本，同一张图只上传一次；新图才走网关。
 *
 * @module baitong-vision/twin
 */

import { createHash } from 'node:crypto';
import { contentHasImage } from '@deepseek-ai/dsh-llm';
import { uploadImage, GatewayError } from './gateway.js';

/** sha1 -> 已注入的标记文本（插件生命周期内复用，避免历史图重复上传）。 */
const markerCache = new Map();
const TWIN_ADAPTER = Symbol.for('baitong-vision.twin-adapter');

/** 从配置读取被勾选的模型 Map<provider/id, entry>。 */
function selectedMap(getConfig) {
  try {
    const cfg = getConfig?.();
    const list = cfg?.vision_models;
    if (!Array.isArray(list)) return new Map();
    const map = new Map();
    for (const m of list) {
      const id = typeof m === 'string' ? m : m.id;
      const provider = (typeof m === 'object' ? m.provider : '') || '';
      if (id) map.set(provider + '/' + id, m);
    }
    return map;
  } catch { return new Map(); }
}

function isSelected(getConfig, provider, id) {
  return selectedMap(getConfig).has(provider + '/' + id);
}

function noteOf(getConfig, provider, id) {
  const entry = selectedMap(getConfig).get(provider + '/' + id);
  return entry && typeof entry === 'object' ? (entry.note || '') : '';
}

/** 给被勾选模型注入视觉元数据（inputModalities / pi-ai 的 input）。 */
function applyVisionMeta(model, provider, getConfig) {
  if (!model || !isSelected(getConfig, provider, model.id)) return model;
  const note = noteOf(getConfig, provider, model.id);
  const suffix = note ? ` (${note})` : ' (百通视觉)';
  const out = { ...model, name: (model.name || model.id) + suffix, inputModalities: ['text', 'image'] };
  // pi-ai 系列用 `input` 数组；一并注入，保证 resolveModel 也通过。
  if ('input' in model) out.input = [...model.input, 'image'];
  return out;
}

/**
 * 处理单个 image block：网关上传 + 标记文本。
 * 同一张图（sha1 相同）复用缓存标记，不重复上传。
 */
async function imageBlockToMarker(block, attachments, getConfig) {
  let dataUrl = null;
  let hash = null;
  try {
    const { data } = await attachments.readImage(block.attachment);
    const mime = block.attachment?.mediaType || 'image/png';
    hash = createHash('sha1').update(Buffer.from(data)).digest('hex');
    if (markerCache.has(hash)) return markerCache.get(hash);
    dataUrl = `data:${mime};base64,${Buffer.from(data).toString('base64')}`;
  } catch (e) {
    return `[用户发送了一张图片。（读取失败：${e?.message || e}）无法交给视觉网关分析。]`;
  }

  const cfg = getConfig?.() || {};
  const base = cfg.gateway_base;
  let marker;
  try {
    await uploadImage(base, dataUrl, { timeoutMs: cfg.upload_timeout_ms });
    marker = [
      '[用户发送了一张图片。]',
      '如需查看图片内容，请调用 look_at_image 工具，传入你想问图片的具体问题。',
      '注意：该工具只能查看最近发送的一张图片；对更早图片的提问请基于已有回答。',
    ].join('\n');
  } catch (e) {
    const reason = e instanceof GatewayError ? e.message : String(e?.message || e);
    marker = [
      '[用户发送了一张图片。]',
      `（图片上传视觉网关失败：${reason}）`,
      '调用 look_at_image 可能看不到这张图；可建议用户确认百通API 应用（opencode_v4_app）已启动后重试。',
    ].join('\n');
  }
  markerCache.set(hash, marker);
  return marker;
}

/** 把消息里的 image block 替换成标记文本。 */
async function sanitizeImages(ctx, messages, getConfig) {
  const attachments = ctx.get?.('attachments') ?? ctx.attachments;
  const next = [];
  for (const message of messages) {
    const content = message?.content;
    if (!Array.isArray(content) || !content.some((b) => b?.type === 'image')) { next.push(message); continue; }
    const blocks = [];
    for (const block of content) {
      if (block?.type !== 'image') { blocks.push(block); continue; }
      blocks.push({ type: 'text', text: await imageBlockToMarker(block, attachments, getConfig) });
    }
    next.push({ ...message, content: blocks });
  }
  return next;
}

/**
 * 对被选中模型所属的 provider，用 Proxy 包装原始 adapter 成孪生并原位替换
 * registration.adapter（避免 DUPLICATE_ADAPTER）。返回注册数；注册者用 ctx.effect
 * 在卸载时恢复原 adapter。
 */
export function registerTwinAdapters(ctx, llm, getConfig) {
  if (!llm || !getConfig) return 0;
  const map = selectedMap(getConfig);
  const providers = new Set();
  for (const key of map.keys()) {
    const prov = key.split('/')[0];
    if (prov) providers.add(prov);
  }

  const restores = [];
  let count = 0;
  for (const provider of providers) {
    let reg;
    try { reg = llm.registration(provider); } catch { continue; }
    if (!reg || !reg.adapter) continue;
    if (reg.adapter[TWIN_ADAPTER]) continue;
    const orig = reg.adapter;

    const origList = orig.listModels.bind(orig);
    const origResolve = orig.resolveModel.bind(orig);
    const origStream = orig.stream.bind(orig);

    const twin = new Proxy(orig, {
      get(target, prop, receiver) {
        if (prop === TWIN_ADAPTER) return true;
        if (prop === 'listModels') {
          return async (p) => (await origList(p)).map((m) => applyVisionMeta(m, p, getConfig));
        }
        if (prop === 'resolveModel') {
          return async (p, m, signal) => applyVisionMeta(await origResolve(p, m, signal), p, getConfig);
        }
        if (prop === 'stream') {
          return async function* (options) {
            if (options?.messages?.some((msg) => contentHasImage(msg?.content))) {
              options = { ...options, messages: await sanitizeImages(ctx, options.messages, getConfig) };
            }
            yield* origStream(options);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });

    reg.adapter = twin;
    restores.push({ reg, orig });
    count++;
  }

  if (count > 0) console.log(`[baitong-vision] vision twin active on provider(s): ${[...providers].join(', ')}`);

  if (restores.length > 0) {
    ctx.effect(
      () => () => {
        for (const { reg, orig } of restores) {
          if (reg.adapter?.[TWIN_ADAPTER]) reg.adapter = orig;
        }
      },
      'baitong-vision: vision twin restore',
    );
  }
  return count;
}

/** 测试辅助：清空标记缓存。 */
export function _resetMarkerCache() {
  markerCache.clear();
}
