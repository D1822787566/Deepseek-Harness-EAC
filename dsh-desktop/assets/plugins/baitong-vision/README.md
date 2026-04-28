# baitong-vision

> **v0.1.0** — 把百通视觉能力（Qwen3.6）接到 DSH 纯文本模型：**原生缩略图 + 粘贴即用 + look_at_image 按需深读**。
> 依赖常驻的 **opencode_v4_app（百通API 应用）** 作为视觉网关（图片经百通 CDN 上传、Qwen3.6 语义深读）。

## 定位

DeepSeek 等纯文本模型没有视觉编码器；DSH 原生缩略图也要求模型被声明为「支持图片」。

baitong-vision 复用 **picturereader 的视觉孪生机制**，把「看图」转发给百通 Qwen3.6：

1. **视觉孪生 adapter**：勾选模型即生成「(百通视觉)」变体，声明 `inputModalities: ['text','image']` → DSH 原生缩略图、图片块进会话、粘贴准入全部解锁。
2. **图片上传网关**：孪生 `stream` 拦截 image block → 读字节 → 经 v4_app 的 `/v1/chat/completions` 视觉路由副作用上传百通 CDN → 替换成引导 `look_at_image` 的文本标记。**主模型拿到的永远是纯文本**，不会 `UNSUPPORTED_CONTENT`。
3. **look_at_image 工具**：把模型的问题转发给 v4_app `/v1/vision/query`，Qwen3.6 深读「最近一张图」返回针对性回答。

## 数据流

```
贴图 → 孪生 stream 拦截 image block
     → attachments 读字节 → sha1 去重（同一张图只传一次）
     → 新图：POST {gateway}/v1/chat/completions（data URL 带唯一参数）
        副作用：百通 CDN 上传 + v4_app 指针指向此图；响应丢弃
     → image block 替换为标记文本（引导调 look_at_image）
主模型（DeepSeek）推理 → 调 look_at_image(question)
     → POST {gateway}/v1/vision/query → Qwen3.6 描述 → 返回给模型
```

## 快速上手

1. 确保 **opencode_v4_app（百通API 应用）已启动**（默认 `http://localhost:8102`）。
2. 设置 → 「百通视觉」→ 填网关地址（默认即可）→ 勾选要作为视觉孪生的文本模型 → 保存后**重启 DSH**。
3. 模型选择器中选择对应模型的「(百通视觉)」变体。
4. 粘贴 / 拖入图片 → 原生缩略图 → 图片块自动上传网关并注入标记 → 模型按需调 `look_at_image`。

## 设置卡字段

- **视觉网关地址**（`gateway_base`，默认 `http://localhost:8102`）：opencode_v4_app 地址。旁边有「检查」按钮探测 `/health`。
- **视觉孪生：为以下模型注入视觉能力**（`vision_models`）：勾选生成「(百通视觉)」变体，改动需**重启 DSH** 生效。
- **高级设置**：

| 字段 | 默认 | 说明 |
|---|---|---|
| `upload_timeout_ms` | `120000` | 图片上传网关超时（含 CDN 上传与可能的 Cookie 登录刷新） |
| `query_timeout_ms` | `300000` | `look_at_image` 查询超时（含视觉模型流式响应） |
| `debug` | `false` | 调试日志 |

## 与 picturereader 的关系

两者都会拦截 image block（视觉孪生），**互斥**。本应用已把 picturereader 设为**默认禁用**、baitong-vision 设为**默认启用**（存量安装首次落地时自动让位）。如想换回本地工具链，可在「设置 → 插件 → 管理」里停用 baitong-vision 并启用 picturereader。

## 已知限制

- **`look_at_image` 只能看最近一张图**：v4_app 的 `/v1/vision/query` 基于全局"最近一张图"指针，多会话并发贴图时后贴的会覆盖（单用户桌面场景影响有限）。
- **每张新图上传 = 一次 v4_app 模型往返**：上传走 `/v1/chat/completions` 的视觉路由副作用，v4_app 内部会请求一次主模型（提示词已引导其直接回复 ok 以最小化消耗）。
- **依赖 v4_app 常驻 + Gree 内网**：Qwen3.6 / 百通 CDN 均需内网可达；网关掉线时图片仍会注入「上传失败」标记，工具会返回明确提示。
- **`dsh-file-drop` 需停用**：其「拖入图片即注入文本」与本插件的自动分析可能冲突（参考 picturereader 的同类提示）。
- **WebP 暂不支持**：图片块需为 DSH 支持渲染的格式（PNG/JPEG/GIF）。

## 开发

```sh
# 结构
assets/plugins/baitong-vision/
├── client.js            # Web 设置卡「百通视觉」
├── cordis.patch.yml     # bundle 行
└── src/
    ├── index.js         # 入口：设置命名空间 + 工具 + 模型扫描 + 孪生
    ├── gateway.js       # v4_app HTTP 客户端（health/upload/query）
    ├── twin.mjs         # 视觉孪生 adapter（移植 picturereader-vision）
    ├── tool.js          # look_at_image 工具
    ├── settings-expose.js  # patch dsh-host-apiproxy 白名单
    ├── config.js / models-cache.js
```

## License

MIT
