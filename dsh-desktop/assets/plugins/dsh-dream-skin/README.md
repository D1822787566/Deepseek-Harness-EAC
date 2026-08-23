<p align="center">
  <strong>中文</strong> · <a href="./README.en.md">English</a>
</p>

<div align="center">

# dsh-dream-skin 🔮

**让 DeepSeek Harness 换一张会呼吸、有情绪、属于你的脸。**

原生换肤 · 背景壁纸 · 主题包分享 —— 完全用官方 `--dsw-*` token 系统实现的浪漫工程。装一次，终身可换。

> **一句话：写代码，也要有氛围感。** ✨

| 🎨 8 套原创主题 | 🖼️ 壁纸 + 透明度/模糊 | 🌈 强调色点一下 | 📦 主题包可分享 |
|---|---|---|---|

> 3 行安装 · 纯原生（无注入/不改安装包）· 不因 DSH 更新失效

[English](./README.en.md) · [变更日志](./CHANGELOG.md) · [项目说明](./docs/PROJECT.md) · [发布指引](./docs/publishing-to-npm.md)

![npm version](https://img.shields.io/npm/v/dsh-dream-skin?color=4f83f2&label=npm)
![license](https://img.shields.io/github/license/RevolutionLA/dsh-dream-skin?color=34d399)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
![node](https://img.shields.io/badge/node-%3E%3D18-6d9af6)
![dsh](https://img.shields.io/badge/dsh-0.1.0--rc.6-blueviolet)
![plugin type](https://img.shields.io/badge/plugin-dual--face%20(dsh.bundle%2Bdsh.client)-4f83f2)
![ci](https://img.shields.io/github/actions/workflow/status/RevolutionLA/dsh-dream-skin/ci.yml?branch=main&label=CI&color=34d399)
![code size](https://img.shields.io/github/languages/code-size/RevolutionLA/dsh-dream-skin?color=orange)

</div>

> 🚀 **现已发布到 npm！** 装好 DSH 后，一条命令即可安装，无需 clone：
> ```sh
> dsh plugin --profile web add dsh-dream-skin
> ```

> **致敬 [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)。** 但实现路径不同：Codex 是往桌面客户端渲染进程
> 注入 CSS（CDP），而 DSH 本身是 **token 驱动的 Web GUI**，官方就提供了「第三方插件注册主题」的能力——所以本插件是
> **纯原生接入**，无注入、不改二进制、不因客户端更新失效。
>
> **不是官方产品。** 仅供美化你的 DeepSeek Harness 工作区。

---

## 📸 实机截图

> 真机效果，非概念图。左：应用某套皮肤后的 DSH 界面；右：设置里的「外观 / Theme」分节。

<p align="center">
  <img src="docs/screenshots/preview.png" alt="DSH 皮肤实机预览" width="46%"/>
  &nbsp;&nbsp;
  <img src="docs/screenshots/settings.png" alt="设置中的外观分节" width="46%"/>
</p>

---

## 🏆 为什么值得用（vs 同类）

| 能力 | 本插件 | 其它 DSH 换肤方案 | Codex-Dream-Skin (桌面) |
|------|:---:|:---:|:---:|
| 原生 token 主题，不注入、不改安装包 | ✅ | ✅ | ❌ (CDP 注入) |
| 自定义壁纸 + 透明度/模糊 | ✅ | 部分 | ✅ |
| **主题包导入/导出 + 分享链接** | ✅ | ❌ | ✅ (zip 主题) |
| **每用户强调色 Accent** | ✅ | ❌ | 部分 |
| **壁纸 2.0（URL / 视频 / 渐变 / 每皮肤建议 / 自动弱化）** | ✅ | ❌ | ✅ |
| 本地主题包库 + 收藏 + 随机 | ✅ | ❌ | 部分 |
| 校验 + 回滚 | ✅ | 部分 | ✅ |
| **浏览器 Web GUI，天然跨平台** | ✅ | ✅ | ❌ (需桌面 App) |

## ✨ 功能一览

| 能力 | 说明 |
|------|------|
| 🎨 **8 套主题预设（Mirage 幻梦）** | 在 **设置 → 外观（Theme）** 一键切换，浅色 / 深色兼顾 |
| 🖼️ **自定义壁纸** | 上传本地图（自动压缩 ≤2MB），调节**透明度 / 模糊** |
| 📐 **侧边栏独立透明度** | **左**侧边栏（应用导航）与**右**侧边栏（dsh-better-sidebar 工作台面板）各自独立的透明度滑杆，互不干扰 |
| 🔤 **内层不透明** | 卡片、输入框、消息气泡不被壁纸盖住，可读性优先 |
| ↩️ **默认还原** | 一键回到 DSH 内置外观（跟随系统） |
| 💾 **本地持久化** | 皮肤与壁纸存 `localStorage`，刷新 / 重开浏览器不丢 |

## 🚀 进阶能力（P0）

吸取了同类先行项目之短，融入 Codex 换肤的 UX，做了一套差异化能力：

| 能力 | 说明 |
|------|------|
| 📦 **主题包格式 + 导入/导出** | 一个 `*.dsh-theme.json` 主题包 = 格式标记 + 版本 + manifest（id/name/作者/色系/accent/tokens）。可**导入文件**、**一键应用**、**复制分享链接**（编码进 URL hash） |
| 🌈 **每用户强调色 Accent** | 为当前皮肤叠加一个自定义品牌强调色（`overrideTokens` 层，不动皮肤本身），**12 个典型色块一键选色** + 选色盘 + 随机 + 恢复主题色 |
| 🖼️ **壁纸 2.0** | 本地图 / **图片 URL** / **视频壁纸**（直链 URL 或本地视频，本地存 IndexedDB）/ **渐变预设**，每套皮肤**自动建议**一张渐变，可**自动弱化**（聚焦任务时降低干扰）；**最近使用**（最多 5 张）一键换回 |
| 🧩 **本地主题包库** | 你导入的自定义主题包集中展示，**应用 / 收藏 / 移除** 一键完成（内置 8 套皮肤在「皮肤」行选择） |
| ✅ **清晰选中反馈** | 切换皮肤时选中态（✓ + 边框）**即时跟随**，不再残留模糊的白色高亮框 |
| 🎲 **换一个试试（surprise me）** | 随机挑一个和你当前不同的主题 |
| ⭐ **收藏** | 收藏喜欢的皮肤，快速切换 |
| ✅ **校验 + 回滚** | 导入时会校验格式/必填 token/颜色合法性；失败或移除时安全回退，不做破坏性更改 |

## 🧩 它是什么形式的插件

**它是 DeepSeek Harness 的标准「双面插件」（`dsh-plugin`）——加载和用法与官方 `ui-theme` 完全一致。**

DeepSeek Harness 的口号是「一切皆插件」：模型、工具、沙箱、会话、UI，乃至 Agent Loop 本身都是插件。
`dsh-dream-skin` 的本质就是把「换肤」做成一个和官方 UI 包**同构**的 npm 包：

```text
            ┌────────────── dsh-dream-skin（标准 dsh-plugin / 双面插件）──────────────┐
            │  dsh.bundle   → cordis.patch.yml 插入 dream-skin 入口   (host 半边)     │
            │  dsh.client   → lib/client.js（浏览器 bundle）          (浏览器半边)     │
            └─────────────────────────────────────────────────────────────────────────┘
```

- **安装命令 = 官方唯一安装命令**：`dsh plugin --profile web add dsh-dream-skin`
- **调用的是官方扩展点**：`ctx.theme`（注册主题）、`ctx.theme.overrideTokens`（叠加层）、
  `ctx.slots`（把 UI 挂进独立的 **设置 → 外观 / Theme** 分节）。
- **manifest 契约与官方一致**：`dsh.bundle` + `dsh.client` + `exports["./client"]`。

也就是说：**你装的不是一个旁门左道的脚本，而是 DSH 官方插件体系里的标准皮肤插件。**

## 🖼️ 预览 — Mirage 幻梦系列

> 以下色卡由各皮肤的**真实 token** 生成，所见即所得。点开可放大。

<table>
  <tr>
    <td align="center"><img src="docs/previews/abyss.svg" width="220" alt="abyss"/><br/><b>abyss</b> · 深海渊</td>
    <td align="center"><img src="docs/previews/aurora.svg" width="220" alt="aurora"/><br/><b>aurora</b> · 极光</td>
    <td align="center"><img src="docs/previews/nebula.svg" width="220" alt="nebula"/><br/><b>nebula</b> · 星云</td>
    <td align="center"><img src="docs/previews/ember.svg" width="220" alt="ember"/><br/><b>ember</b> · 余烬</td>
  </tr>
  <tr>
    <td align="center"><img src="docs/previews/midnight.svg" width="220" alt="midnight"/><br/><b>midnight</b> · 午夜</td>
    <td align="center"><img src="docs/previews/ivory.svg" width="220" alt="ivory"/><br/><b>ivory</b> · 象牙暖</td>
    <td align="center"><img src="docs/previews/mist.svg" width="220" alt="mist"/><br/><b>mist</b> · 晨雾蓝</td>
    <td align="center"><img src="docs/previews/rose.svg" width="220" alt="rose"/><br/><b>rose</b> · 蔷薇粉</td>
  </tr>
</table>

### 预设一览

| id | 色系 | 氛围 |
|------|-------|------|
| `abyss` | 🕶️ dark | DeepSeek 深蓝深渊（品牌锚点） |
| `aurora` | 🌌 dark | 极光 · 青绿 |
| `nebula` | 🪐 dark | 星云 · 紫 |
| `ember` | 🔥 dark | 余烬 · 暖橙 |
| `midnight` | 🌚 dark | 纯黑 OLED |
| `ivory` | 📜 light | 象牙暖 · 纸感 |
| `mist` | 🌫️ light | 晨雾蓝 · 冷调 |
| `rose` | 🌸 light | 蔷薇粉 |

## ⚡ 快速开始（3 步）

```sh
# 1. 安装
dsh plugin --profile web add dsh-dream-skin
# 2. 重启
dsh web
# 3. 打开 设置 → 外观（Theme）→ 皮肤，挑一套 → 完。
```

> 装的是 npm 已完成发布的正式包，无需 clone。若 `dsh plugin add` 报 workspace 相关错误，补一个 `-w` 即可。

## 📦 安装

### 方式一：npm（已发布，**推荐**）

```sh
dsh plugin --profile web add dsh-dream-skin
```

然后**重启** web 服务：

```sh
# 先停掉正在运行的实例，再：
dsh web
```

打开 **设置 → 外观（Theme）**，即可看到「皮肤」「强调色」「背景图片 / 高级壁纸」与「主题包」等行。

> `-w` 标志在裸 `add` 时必需：每个 profile 自带 `pnpm-workspace.yaml`，pnpm 会把它当作 workspace 根，裸加报错
> `ERR_PNPM_ADDING_TO_ROOT`。若已加过 `-w`，后续用现有 workspace 即无需重复。

### 方式二：从源码 / 本地目录（开发者）

```sh
dsh plugin --profile web add -w /path/to/dsh-dream-skin
```

## 🔄 更新 / 卸载

**更新到最新版**（装的是 npm 正式包时）：

```sh
dsh plugin --profile web update dsh-dream-skin
dsh web   # 重启生效
```

> 若更新后仍显示旧版本，可能是 pnpm 的最小发布年龄（supply-chain）策略挡住了刚发布的新版本：
> 在 profile 目录执行 `pnpm add dsh-dream-skin@latest --config.minimumReleaseAge=0` 即可绕过。

**卸载**：

```sh
dsh plugin --profile web remove dsh-dream-skin
dsh web   # 重启后恢复官方外观
```

## 🧩 兼容性

| 项 | 值 |
|------|-----|
| DeepSeek Harness (`dsh`) | `0.1.0-rc.6`（peerDependencies 以 `^0.1.0-rc.6` 对齐） |
| Node.js | `>=18` |
| 浏览器 | 现代 Chromium / WebKit（依赖原生 CSS 变量与 `matchMedia`） |

> 升级 DSH 到新版本时，请同步更新 `package.json` 里的 peerDependencies。

## ⚙️ 工作原理

DSH 的主题系统是 token 化的：web 外壳内置 `--dsw-*` 设计令牌，`ThemeRuntime` 允许第三方插件注册主题去
覆盖别名层（`--dsw-alias-*`）。本插件是标准的「双面」插件：

```text
                ┌─────────────────────────────────────────────┐
                │            dsh-dream-skin (双面插件)          │
                ├────────────────────────────┬────────────────┤
    Host 半边   │  lib/index.js              │  浏览器半边      │
                │  cordis.patch.yml 插入      │  lib/client.js │
                │  dream-skin loader 入口     │  __ModuleLoader__│
                └────────────────────────────┴────────────────┘
                             │                         │
                        profile 树加载              /plugins/dsh-dream-skin/client.js
                                                         │
        ┌────────────────────────────────┬────────────────┐
        │                                │                │
   ctx.theme.register(8套皮肤)      ctx.theme.overrideTokens(壁纸半透明)   ctx.slots.inject('settings.general.item')
```

- **Host 半边**（`lib/index.js`）：`dsh.bundle` patch 层，插入 `dream-skin` loader 入口；`apply` 为空操作，
  与官方 `ui-*` 包同构。
- **浏览器半边**（`lib/client.js`）：
  1. `ctx.theme.register(...)` 注册 8 套皮肤；
  2. 恢复上次保存的皮肤并 `ctx.theme.setTheme(...)` 应用；
  3. 壁纸渲染为 `z-index:-1` 固定背景层，叠加 `ctx.theme.overrideTokens(...)` 让主画布
     （`--dsw-alias-bg-base`）与侧边栏（`--dsw-specific-sidebar-fill`）半透明；
  4. 监听 `theme/change`，切皮肤 / 深浅色时自动重新着色壁纸洗色层；
  5. 把两行 UI 挂进 `settings.general.item` 插槽。

每套皮肤携带自己的 `colorScheme`（`light`/`dark`），驱动 `body[data-ds-dark-theme]`；别名 token 覆盖作为
`<body>` 内联自定义属性由 ui-layout 的 ThemePresenter 应用。

## 💼 持久化说明

- 皮肤与壁纸存于 `localStorage`（键前缀 `dsh-dream-skin:`），**只在当前浏览器生效**。
- 为何不用 Host settings？DSH 的 Host settings 线路只向浏览器暴露一份白名单命名空间
  （`dsh-host-apiproxy` 的 `WEB_SETTINGS_NAMESPACES`），第三方命名空间会返回 `settings-not-exposed`；
  产品本身也把远程浏览器偏好进程化。`localStorage` 恰好匹配这一边界，且跨刷新存活。

## 🛠️ 开发 / 扩展主题

客户端 bundle 直接以 `__ModuleLoader__` 格式编写（即 tsdown 为官方 `ui-*` 包输出的形态），**免构建**。
`lib/client.js` 只能 `require` 模块表实体：平台种子词（`react`、`react/jsx-runtime`、…）与已注册客户端
bundle（`@deepseek-ai/dsh-client-runtime/client`、…）。

- **新增一套内置皮肤**：在 `lib/client.js` 的 `SKINS` 数组加一个对象（`id` + `colorScheme` + `tokens`），
  它即自动出现在设置里；记得在 `zh` / `en` 词典补 `skin.<id>` 文案。
- **做一个主题包（推荐分发方式）**：参考 [`docs/examples/sample-theme-pack.json`](./docs/examples/sample-theme-pack.json)，
  一个 `*.dsh-theme.json` 即可在设置里导入或通过分享链接分发给别人，无需改代码。
- **放你自己的壁纸**：把图片丢进 [`wallpapers/`](./wallpapers/)（注意只在你有权限的前提下分发），再在
  DSH 的「背景图片」里导入即可。
- **跑校验**：`npm test`（VM 冒烟测试，覆盖 factory 求值、`apply` 挂载、主题包导入/持久化）。
- **换配色**：参考 `--dsw-alias-*` 令牌（完整契约见 [`docs/themes-spec.md`](./docs/themes-spec.md)）。

## 📌 Roadmap

- [x] 首版：8 套主题 + 自定义壁纸（透明度 / 模糊）+ 本地持久化
- [x] 主题包格式 + 导入 / 导出 / 分享链接（JSON + manifest + 校验）
- [x] 每用户强调色 Accent + 随机
- [x] 壁纸 2.0（URL / 视频 / 渐变 / 每皮肤建议 / 自动弱化）
- [x] 本地主题包库 + 一键应用 / 收藏 /「换一个试试」
- [ ] 在线色板 / 主题预览 Studio（纯前端，浏览器内校验 + 对比度检查）
- [ ] 社区主题库（把主题包投稿到仓库 / 在线 Gallery）
- [ ] 中 / 英 / 更多语言的完整文案与文档
- [ ] 首帧无闪烁（FOUC）改进

## 🤝 贡献

欢迎提交 Issue 与 PR！请先阅读 [贡献指南](./CONTRIBUTING.md)，并遵循 [Code of Conduct](./CODE_OF_CONDUCT.md)。

## ⭐ 支持这个项目

喜欢的话，给仓库点个 **Star ⭐**、在 npm 上点个 **👍**，或把它转发给你的 DSH 朋友——这会让更多人发现它，
也能激励持续维护。想一起做主题库 / 在线 Studio / 更多主题？欢迎来贡献。

## 🔒 安全

发现安全问题？请勿直接开公开 Issue——参见 [安全策略](./SECURITY.md)。

## 📄 开源协议

[MIT](./LICENSE)

## 🙏 致谢

- 架构与 API 参考：DeepSeek Harness 官方
  [ui-theme](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-theme) 客户端包。
- 概念致敬：[Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)。
