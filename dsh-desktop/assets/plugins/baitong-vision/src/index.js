/**
 * baitong-vision — 百通视觉网关插件（DSH）。
 *
 * 让纯文本模型（DeepSeek 等）在 DSH 里获得"看图"能力，视觉模型由常驻的
 * opencode_v4_app 网关（百通 Qwen3.6）提供：
 *
 *  - 视觉孪生 adapter：勾选模型即生成「(百通视觉)」变体，粘贴图片显示原生
 *    缩略图、图片块进会话、被孪生 stream 拦截 -> 经网关上传百通 CDN -> 替换
 *    成引导 look_at_image 的文本标记 -> 主模型拿到的永远是纯文本。
 *  - look_at_image 工具：把模型的问题转发给 v4_app /v1/vision/query，由
 *    Qwen3.6 深读"最近一张图"并返回针对性回答。
 *
 * 设置：host 侧把 `baitongvision` 命名空间写入 DSH settings.yaml；client.js
 * 在 Web 设置页注册「百通视觉」卡片。网关地址 / 超时热加载，孪生模型需重启。
 *
 * @module baitong-vision
 */

import z from '@deepseek-ai/schemastery';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NS, MODELS_CACHE } from './config.js';
import { ensureSettingsNamespaceExposed } from './settings-expose.js';
import { createLookAtImageTool } from './tool.js';
import { registerTwinAdapters } from './twin.mjs';

export const name = 'baitong-vision';

/** 设置命名空间的运行时 schema（schemastery）。 */
const Config = z.object({
  gateway_base: z
    .string()
    .default('http://localhost:8102')
    .description('百通视觉网关地址（opencode_v4_app / 百通API 应用，默认本机 8102）'),
  vision_models: z
    .array(z.object({
      id: z.string(),
      provider: z.string().default(''),
      note: z.string().default(''),
    }))
    .default([])
    .description('视觉孪生模型列表：被勾选的文本模型会生成「(百通视觉)」变体'),
  upload_timeout_ms: z
    .number()
    .default(120000)
    .description('高级：图片上传网关超时（毫秒，含 CDN 上传与可能的登录刷新）'),
  query_timeout_ms: z
    .number()
    .default(300000)
    .description('高级：look_at_image 查询超时（毫秒，含视觉模型流式响应）'),
  debug: z
    .boolean()
    .default(false)
    .description('高级：调试日志'),
});

/** Services required at runtime. */
export const inject = ['tools', 'llm', 'attachments'];

export function apply(ctx, config) {
  // ── 把命名空间加进 dsh-host-apiproxy 白名单（设置卡可见的前提）──
  try {
    ensureSettingsNamespaceExposed(ctx, NS, ctx.logger);
  } catch (error) {
    ctx.logger?.warn?.(`[baitong-vision] settings-expose failed: ${String(error)}`);
  }

  // ── 运行时快照：工具执行时惰性读最新 gateway_base / 超时 ──
  let sourceGetter = null;
  const getConfig = () => (sourceGetter ? sourceGetter() : config);
  const debug = () => { try { return !!getConfig()?.debug; } catch { return false; } };
  const log = (...args) => { if (debug()) console.log('[baitong-vision]', ...args); };

  // ── 注册工具（look_at_image 不需要 settings/llm 服务）──
  ctx.effect(() => {
    ctx.tools.register(createLookAtImageTool(ctx, getConfig));
  });

  // ── 注册模型列表 API 路由（供 client 设置卡读取扫描结果）──
  try {
    ctx.inject(['webServer'], (sctx) => {
      const webServer = sctx.webServer;
      if (!webServer || typeof webServer.register !== 'function') return;
      const handler = async (req, res) => {
        try {
          const data = await readFile(MODELS_CACHE, 'utf-8');
          log('models route: read', data.length, 'bytes');
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(data);
        } catch (err) {
          log('models route: read failed:', String(err));
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end('[]');
        }
      };
      ctx.effect(() => webServer.register({ kind: 'exact', path: '/baitong-vision/models', handler }), 'baitong-vision: models route');
    });
  } catch {}

  // ── 设置命名空间 + 模型扫描 + 视觉孪生（需要 settings 和 llm 服务）──
  ctx.inject(['settings', 'llm'], (sctx) => {
    const llm = sctx.llm;
    const settingsNs = settingsNamespace(NS);
    const scope = sctx.settings.register(settingsNs, Config, { base: config });
    sourceGetter = () => scope.get();
    scope.watch(() => { /* 触发热更 */ });

    // ── 扫描所有 provider 的文本模型 → 写入 available_text_models ──
    (async () => {
      try {
        if (!llm || typeof llm.listProviders !== 'function') return;
        const providers = llm.listProviders();
        const textModels = [];
        for (const p of providers) {
          try {
            const models = await llm.listModels(p.id);
            for (const m of models) {
              const mods = m.inputModalities || [];
              if (!mods.includes('image')) {
                textModels.push({ provider: p.id, id: m.id, name: m.name || m.id });
              }
            }
          } catch { /* 跳过 */ }
        }
        // 兜底：把用户已勾选的模型并入列表（即使某 provider 的模型扫描漏了）。
        try {
          const cfg = scope.get();
          const vms = Array.isArray(cfg?.vision_models) ? cfg.vision_models : [];
          for (const entry of vms) {
            const id = typeof entry === 'string' ? entry : entry?.id;
            const provider = typeof entry === 'object' ? (entry?.provider || '') : '';
            if (!id) continue;
            const exists = textModels.some((t) => t.provider === provider && t.id === id);
            if (!exists) textModels.push({ provider, id, name: id });
          }
        } catch { /* 兜底失败忽略 */ }
        if (textModels.length > 0) {
          await mkdir(join(MODELS_CACHE, '..'), { recursive: true });
          await writeFile(MODELS_CACHE, JSON.stringify(textModels, null, 2));
        }
      } catch {
        // 模型扫描失败静默
      }
    })();

    // ── 视觉孪生：包裹被勾选模型所属 provider 的 adapter，声明支持图片 + stream 拦截 ──
    try {
      registerTwinAdapters(ctx, llm, getConfig);
    } catch (e) {
      ctx.logger?.warn?.(`[baitong-vision] twin adapters failed: ${String(e?.message || e)}`);
    }
  });
}
