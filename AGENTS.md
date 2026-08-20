# AGENTS.md — Deepseek Harness EAC 项目工作手册（AI Agent 必读）

> 本文件是本仓库的「项目宪法」：任何 AI 编码 Agent（Claude Code / Codex / Gemini CLI / Cursor 等）
> 以及人类开发者在本仓库动手之前，先读此文件与 `docs/PROJECT_DEFINITION.md`。
>
> **当前定位（2026-08 起重新定义）**：Deepseek Harness EAC 正在从「在线 API + 插件市场的个人桌面客户端」
> 重新定位为 **可部署到内网、连接本地 OpenAI 兼容模型的 AI Agent 桌面客户端**（数据不出内网）。
> 新定义的权威文档见 `docs/PROJECT_DEFINITION.md`，本文件把该方向落成 Agent 可直接执行的规则。

---

## 1. 一句话定位

把官方 `@deepseek-ai/dsh`（一切皆插件的 agent harness）封装成**开箱即用的桌面客户端**，
并正在改造为 **内网可部署、本地模型可接、不依赖外部网络** 的私有化 AI 工作台。

## 2. 仓库结构速览

```
.
├── AGENTS.md                  # 本文件：Agent 工作手册
├── README.md / README.en.md   # 项目介绍（下载链接随发版同步更新，见 §5.6）
├── dsh-desktop/               # ★ 主工程：Electron 桌面端
│   ├── main.js                # Electron 主进程（约 5100 行，壳 + 生命周期 + 服务编排）
│   ├── updater.js             # 官方 @deepseek-ai/dsh agent 更新引擎（外呼）
│   ├── client-updater.js      # 客户端本体自更新（外呼 GitHub Releases）
│   ├── plugin-updater.js      # 内置插件更新（外呼）
│   ├── balance.js             # DeepSeek 余额查询（外呼）
│   ├── session-watcher.js     # 会话完成监听 → 系统通知
│   ├── plugin-guard.js        # 插件保护中心（快照/回滚/体检/修复）
│   ├── profile-module-heal.js # profile 模块遮蔽自愈
│   ├── patch-row-heal.js      # cordis.patch.yml 行级修复/去重
│   ├── stable-port.js         # 稳定端口选择
│   ├── rescue-agent.js / renderer-recovery.js / watchdog.js / bundle-integrity.js …
│   ├── assets/
│   │   ├── skins/             # 10 款内置 Web UI 皮肤
│   │   └── plugins/           # ★ 约 40 个内置配套插件（dsh-* 前缀，lib/client.js 前端 + lib/index.js host）
│   ├── scripts/               # 构建/打包/运维脚本（check-syntax / patch-deps / fetch-node / fetch-npm / verify-dist-fresh / e2e-* …）
│   ├── test/                  # node --test 单测（*.test.mjs，数量大、覆盖广）
│   ├── vendor/                # 内置 node.exe + npm CLI（不入库，fetch-runtime 拉取）
│   └── electron-builder.yml   # 打包配置
├── docs/
│   ├── adr/                   # 架构决策记录（新增重大决策在此留档）
│   └── superpowers/specs/     # 功能设计文档
├── openclaw-dsh-bridge/       # 可选：微信 ClawBot 桥接（独立子工程，研究性质）
├── research/                  # 第三方微信/桥接协议调研资料（只读参考）
└── .github/workflows/         # ci.yml / release.yml / clear-cache.yml
```

## 3. 核心架构（改动前必懂）

```
Electron 壳 (main.js)
  │  spawn 内置 node.exe（vendor/node，绝不针对 Electron rebuild）
  ▼
dsh web --host 127.0.0.1 --port 0   （本地回环，天然不出网）
  │  解析输出 URL，轮询 HTTP 200
  ▼
原生窗口加载 Web UI（仅本机回环访问）
```

- **模型请求链**：dsh web（127.0.0.1）→ provider 配置的 API base URL → 目前默认 DeepSeek 云端 API；
  **内网化改造的核心 = 把 base URL 指向本地 OpenAI 兼容端点**（vLLM / Ollama / LM Studio / Xinference / 私有化 DeepSeek）。
- **一切皆插件**：Web UI 能力 = 插件注册的 slots / client bundle。内置插件在 `assets/plugins/`，
  装配进桌面专属 `web-desktop` profile 的 `cordis.patch.yml`（会话与 API Key 仍共享 DSH_HOME）。
- **原生模块**（sharp / node-pty / koffi）由内置**普通 node.exe** 加载，`asar: false`、`npmRebuild: false`，
  打包时保持真实文件，**禁止对 Electron rebuild**。
- **插件形态**：多数插件 `lib/client.js`（浏览器端，rev 机制热更新）+ `lib/index.js`（host 端）。
  改 client.js 后必须 `node --check`。

## 4. 常用命令（全部在 `dsh-desktop/` 下执行）

```powershell
npm install            # 安装依赖（postinstall 自动跑 patch-deps）
npm run fetch-runtime  # 拉取内置 node.exe + npm CLI 到 vendor/（构建期需要，联网）
npm test               # node --test test/*.test.mjs —— 全量单测
npm run dist           # 完整构建：portable + NSIS 安装包 → dist/（含 SHA256SUMS.txt）
npm run pack           # 快速打包（--dir，不产出安装器）
node --check <file>.js # 改任何 JS 后先做语法检查
npm run verify-dist-fresh  # 校验 dist 产物新鲜度（相关测试 verify-dist-fresh.test.mjs）
```

CI（`.github/workflows/ci.yml`）：windows-latest + Node 22 → `npm ci` → `fetch-runtime` → `npm test` → `npm run dist`。
**纯文档改动（`*.md` / `docs/**` / `research/**`）自动跳过 CI，唯一例外 `**/SKILL.md`**（随包分发，必须放行）。

## 5. 硬规则（违反 = 事故）

### 5.1 网络边界（内网化改造的红线）
- 新增任何**外呼**（fetch / https / npm 安装 / 下载 / 遥测上报）前，必须先在
  `docs/PROJECT_DEFINITION.md` 的网络边界清单里登记并获评审通过。
- 现有外呼点（改造目标，策略见定义文档 §7 待定项）：
  `updater.js` / `client-updater.js` / `plugin-updater.js`（版本检查与下载）、
  `balance.js`（余额查询）、`assets/plugins/dsh-webui-market*` 与 `dsh-plugin-marketplace`（插件市场）、
  `scripts/fetch-node.js` / `fetch-npm.js`（构建期拉运行时）、`@deepseek-ai/dsh-session-telemetry`（遥测）。
- 模型请求默认只允许指向**本地/内网 OpenAI 兼容端点**；用户显式配置的外部 provider 除外。

### 5.2 不改 node_modules 里的核心产物
- 改任何 node_modules 包 = 先断硬链接再写（`Remove-Item` 断链 → UTF-8 无 BOM 写入 → 确认硬链接只剩 1 个），
  禁止原地编辑（会污染 pnpm 内容 store）。本仓库场景下优先改 `assets/plugins/` 里的内置插件源码。

### 5.3 rev 机制验证
- client 插件文件带 `?rev=` = 内容 SHA1 前 12 位。**改文件 → rev 变 → 刷新即生效**；
  改完必须确认服务端 SHA1 与 boot rev 一致，否则改错了文件。

### 5.4 中文路径陷阱
- 安装/放置路径必须是**纯英文**（中文路径触发 Chromium 渲染进程原生崩溃）。
- 新增脚本保持全英文输出（PowerShell 5.1 读无 BOM 中文会乱码崩解析）。

### 5.5 打包与产物一致性
- `electron-builder.yml` 的 `files` 白名单：新增根级模块必须同步加进去，否则打包后 `MODULE_NOT_FOUND`。
- `afterPack: scripts/after-pack.js` 恢复 npm CLI 自身依赖——动打包配置时先看它。
- 发版后 `dist/*.exe` 的产物名含版本号；`releases/latest/download/<file>.exe` 只认最新 release 的同名资产，
  **每次发版必须同步更新 README.md / README.en.md 的下载链接文件名**。

### 5.6 测试纪律
- 新功能/修复尽量带 `test/*.test.mjs`（node --test 风格，见现有测试的写法）。
- 改 JS 先 `node --check`；跑测试用 `npm test`（可 `node --test test/<name>.test.mjs` 单跑）。

## 6. 代码风格

- CommonJS（`require`），`'use strict';`，与现有 main.js / 插件一致，**不引入 ESM 混用**。
- 注释中文为主；命名与既有风格保持一致（`dsh-` 前缀插件、`lib/client.js` + `lib/index.js` 结构）。
- 配置/状态集中在壳层与 profile，插件不重复造轮子（复用 `patch-row-heal` / `plugin-guard` 等既有设施）。
- 重大架构决策写入 `docs/adr/`；功能设计先写 `docs/superpowers/specs/` 再实现。

## 7. 内网化改造：Agent 行动准则（当前最高优先级方向）

1. **模型接入**：以「OpenAI 兼容端点」为唯一模型层契约（base URL + apiKey 可空 + 模型名列表可配），
   覆盖 vLLM / Ollama / LM Studio / Xinference / 私有化 DeepSeek。
2. **离线优先**：任何新功能默认假设「无外网」。安装包自带运行时与依赖的既有能力是底线，不得破坏。
3. **外呼收敛**：更新器/市场/余额/遥测按「默认关闭、可配置」或「移除」处理——具体由团队在
   `docs/PROJECT_DEFINITION.md` §7 定案（用户后续补充想法，未定案前**不要擅自删功能**，先做模型层）。
4. **数据不出内网**：会话、配置、凭证、日志全部本地留存；不得新增任何未经评审的上报。
5. **兼容性**：保留 EAC 既有桌面能力（皮肤/插件/终端/文件追踪/人设卡等），内网化是叠加定位，不是砍功能。

## 8. 提交/PR 前自检清单

- [ ] `node --check` 通过（所有改动的 JS）
- [ ] 相关测试通过：`npm test` 或单跑 `node --test test/<对应>.test.mjs`
- [ ] 新增外呼？→ 已在网络边界清单登记并评审（§5.1）
- [ ] 改了根级模块？→ 已同步 `electron-builder.yml` files 白名单（§5.5）
- [ ] 发版相关改动？→ README 下载链接已同步（§5.5）
- [ ] 改了内置插件 client.js？→ 已验证 rev 变化与 SHA1 一致（§5.3）
- [ ] 文档改动不会被 CI 误跳过（`**/SKILL.md` 例外规则，§4）
