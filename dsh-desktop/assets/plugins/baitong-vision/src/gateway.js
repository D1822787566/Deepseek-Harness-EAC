/**
 * baitong-vision - v4_app 视觉网关 HTTP 客户端。
 *
 * v4_app（opencode_v4_app，常驻）对外提供两个可用入口：
 *  - POST /v1/chat/completions：messages 携带 image_url（data URL）时，
 *    vision_router 会把图片上传百通 CDN 并把全局指针 _last_image_hash 指向它。
 *    这里把它当「上传通道」用：响应本身丢弃，只取副作用。
 *  - POST /v1/vision/query：{question} -> 用最近一张图调 Qwen3.6 -> {answer}。
 *  - GET  /health：存活探测。
 *
 * 已知 quirk（gateway 侧规避）：v4_app 的 _image_cdn_cache 命中时不会更新
 * _last_image_hash，重复贴同一张图会让后续 query 看到别的图。对策是上传时给
 * data URL 塞一个唯一参数（data:<mime>;u=<ts>;base64,...），让 md5 缓存 key
 * 每次都变化 -> 永远走真上传 -> 指针总是指向最新图。
 *
 * @module baitong-vision/gateway
 */

/** 上传通道用的提示词：让 v4_app 侧模型只回一个 ok，最小化无谓输出。 */
const UPLOAD_NOOP_PROMPT = '（图片注册通道：无需描述图片内容，请直接回复 ok）';

/** 规整网关地址：去掉尾部斜杠；空串回退默认。 */
export function normalizeBase(raw) {
  const s = String(raw ?? '').trim() || 'http://localhost:8102';
  return s.replace(/\/+$/, '');
}

/** 给 data URL 塞唯一参数，绕开 v4_app 的 CDN 缓存命中不更新指针的 quirk。 */
export function uniquifyDataUrl(dataUrl, salt = Date.now()) {
  const m = /^data:([^;,]+)(;base64,)(.*)$/s.exec(String(dataUrl ?? ''));
  if (!m) return String(dataUrl ?? '');
  return `data:${m[1]};u=${salt};base64,${m[3]}`;
}

/** 网关侧错误统一带中文说明 + 原始原因，方便直接返回给模型/用户。 */
export class GatewayError extends Error {
  /**
   * @param {string} message 中文说明
   * @param {{ kind?: string, status?: number, detail?: string }=} opts
   */
  constructor(message, opts = {}) {
    super(message);
    this.name = 'GatewayError';
    this.kind = opts.kind || 'unknown'; // offline | timeout | http | badpayload
    this.status = opts.status;
    this.detail = opts.detail || '';
  }
}

function offlineError(base, cause) {
  return new GatewayError(
    `百通视觉网关不可达（${base}）：请确认 opencode_v4_app（百通API 应用）已启动。`,
    { kind: 'offline', detail: String(cause?.message || cause || '') },
  );
}

/**
 * 探测网关存活。健康即返回 true；不可达/超时返回 false（不抛错，供设置卡静默轮询）。
 * @param {string} base
 * @param {number=} timeoutMs
 */
export async function checkHealth(base, timeoutMs = 5000) {
  const url = `${normalizeBase(base)}/health`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 上传图片到网关（实际走 /v1/chat/completions 的视觉路由副作用）。
 *
 * 成功判定：HTTP 200。v4_app 内部完成 CDN 上传 + 指针更新后才会返回，
 * 因此 200 即代表"最近一张图"已是这张。响应体丢弃。
 *
 * @param {string} base
 * @param {string} dataUrl  原始 data URL（本函数内部做唯一化）
 * @param {{ timeoutMs?: number, model?: string, signal?: AbortSignal }} [opts]
 * @throws {GatewayError} 网关掉线 / 超时 / HTTP 非 200
 */
export async function uploadImage(base, dataUrl, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 120000;
  const url = `${normalizeBase(base)}/v1/chat/completions`;
  const signal = opts.signal
    ? AbortSignal.any([opts.signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);
  const body = {
    stream: false,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: uniquifyDataUrl(dataUrl) } },
        { type: 'text', text: UPLOAD_NOOP_PROMPT },
      ],
    }],
  };
  if (opts.model) body.model = opts.model;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
      throw new GatewayError(
        `百通视觉网关上传超时（${timeoutMs}ms）：CDN 上传或登录刷新过慢，可稍后重试或在设置里调大超时。`,
        { kind: 'timeout', detail: String(e?.message || e) },
      );
    }
    throw offlineError(normalizeBase(base), e);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new GatewayError(
      `百通视觉网关上传失败（HTTP ${res.status}）：${text.slice(0, 200)}`,
      { kind: 'http', status: res.status, detail: text.slice(0, 500) },
    );
  }
  // 响应体消费掉（释放连接），内容丢弃。
  await res.text().catch(() => {});
  return true;
}

/**
 * 按问题深读最近一张图（POST /v1/vision/query -> Qwen3.6）。
 * @param {string} base
 * @param {string} question
 * @param {{ timeoutMs?: number, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ answer: string, reasoning?: string, cdn_url?: string }>}
 * @throws {GatewayError} 网关掉线 / 超时 / HTTP 非 200 / 无缓存图
 */
export async function queryVision(base, question, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 300000;
  const url = `${normalizeBase(base)}/v1/vision/query`;
  const signal = opts.signal
    ? AbortSignal.any([opts.signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: String(question ?? '') }),
      signal,
    });
  } catch (e) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
      throw new GatewayError(
        `百通视觉查询超时（${timeoutMs}ms）：视觉模型响应过慢，可稍后重试或在设置里调大超时。`,
        { kind: 'timeout', detail: String(e?.message || e) },
      );
    }
    throw offlineError(normalizeBase(base), e);
  }
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    // 400 = v4_app 缓存里没有图（服务重启过 / 用户还没贴过图）
    if (res.status === 400) {
      throw new GatewayError(
        '视觉网关没有可用的图片：请先在对话中发送一张图片，再调用 look_at_image。',
        { kind: 'http', status: 400, detail: text.slice(0, 500) },
      );
    }
    throw new GatewayError(
      `百通视觉查询失败（HTTP ${res.status}）：${text.slice(0, 200)}`,
      { kind: 'http', status: res.status, detail: text.slice(0, 500) },
    );
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new GatewayError(
      '百通视觉网关返回了无法解析的内容。',
      { kind: 'badpayload', detail: text.slice(0, 500) },
    );
  }
  if (!data || typeof data.answer !== 'string' || data.answer.length === 0) {
    throw new GatewayError(
      '视觉模型返回空内容，请换个问法重试。',
      { kind: 'badpayload', detail: text.slice(0, 500) },
    );
  }
  return {
    answer: data.answer,
    reasoning: typeof data.reasoning === 'string' ? data.reasoning : undefined,
    cdn_url: typeof data.cdn_url === 'string' ? data.cdn_url : undefined,
  };
}
