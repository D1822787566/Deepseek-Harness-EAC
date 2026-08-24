/**
 * 模型侧 `look_at_image` 工具：把问题转发给 v4_app 视觉网关，由 Qwen3.6
 * 深读"最近一张图"并返回针对性回答。
 *
 * 与 v4_app MCP 侧的 look_at_image 工具同名同参（question: string），
 * 行为一致 -- 区别只在触发链路：这里由 DSH 的主模型调用，网关侧由
 * opencode 的模型调用。
 *
 * @module baitong-vision/tool
 */

import { queryVision, GatewayError } from './gateway.js';

/**
 * 构建工具实例。
 * @param ctx - Cordis 上下文（本工具实际只用运行时配置 getter）
 * @param {() => object} getConfig - 读取最新设置（gateway_base / query_timeout_ms）
 */
export function createLookAtImageTool(ctx, getConfig) {
  return {
    name: 'look_at_image',
    description: [
      '仔细查看对话中最近发送的一张图片，回答关于图片的具体问题。',
      '当用户追问图片内容、需要确认图片中某个细节（颜色、文字、数量、布局、UI 元素等）时调用此工具。',
      '传入你想问图片的问题，工具会调用视觉模型查看图片并返回针对该问题的回答。',
      '注意：只能查看最近发送的一张图片；对更早图片的提问请基于已有回答。如果用户的问题跟图片无关（比如读文件、跑命令），不要调用此工具。',
    ].join(' '),
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        question: {
          type: 'string',
          description: '想问图片的具体问题（如"图片里表格的第三行写了什么"、"界面右上角的按钮是什么颜色"）。',
        },
      },
      required: ['question'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          answer: { type: 'string' },
          cdn_url: { type: 'string' },
          error: { type: 'string' },
        },
        required: ['answer'],
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.error || value.answer,
      }],
    },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const question = String(args?.question ?? '').trim();
      if (question.length === 0) throw new Error('look_at_image: question must be a non-empty string');

      const cfg = (getConfig?.() || {});
      const base = cfg.gateway_base;
      const timeoutMs = cfg.query_timeout_ms ?? 300000;

      try {
        // exec.signal（模型取消）由 gateway 内部与超时合并：任一先到都中止。
        const result = await queryVision(base, question, { timeoutMs, signal: exec?.signal });
        return { answer: result.answer, cdn_url: result.cdn_url || '' };
      } catch (e) {
        if (exec?.signal?.aborted) throw new Error('look_at_image: cancelled');
        if (e instanceof GatewayError) {
          // 网关侧错误降级成文本结果（不抛异常）：模型能读到原因并向用户转述。
          return { answer: '', error: e.message };
        }
        throw e;
      }
    },
  };
}
