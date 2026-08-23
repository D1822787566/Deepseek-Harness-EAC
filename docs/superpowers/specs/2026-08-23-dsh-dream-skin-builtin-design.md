# dsh-dream-skin 内置集成设计

## 目标

将本地 `dsh-dream-skin` v0.3.0 作为 Deepseek Harness EAC 的内置插件随应用分发，并在桌面专属 `web-desktop` profile 中默认启用。集成沿用现有配套插件同步、同名市场包接管、插件管理和内置清单机制，不新增联网依赖。

## 来源与范围

- 权威本地来源：`E:\project_space\dshtest\dsh-dream-skin`
- 目标目录：`dsh-desktop/assets/plugins/dsh-dream-skin`
- 复制插件的可分发内容：`package.json`、`cordis.patch.yml`、`lib/`（含类型声明）、`LICENSE`、`README.md` 和 `README.en.md`。
- 不复制 `.github/`、贡献流程文档、独立仓库测试、开发截图、示例壁纸和其他仅用于上游开发的材料。
- 版本固定为本地来源当前的 `0.3.0`；本次不从 GitHub 或 npm 拉取内容。

## 架构与装配

在 `dsh-desktop/main.js` 的 `COMPANION_PLUGINS` 中增加：

```js
{ id: 'dream-skin', name: 'dsh-dream-skin' }
```

不设置 `disabled: true`，因此新安装和没有既存状态的 profile 默认启用。现有同步流程负责：

1. 从 `assets/plugins/dsh-dream-skin` 读取内置资产。
2. 将插件复制到桌面专属 profile 的 `node_modules/dsh-dream-skin`。
3. 把 `dsh-dream-skin` 写入 `.dsh-builtin-plugins.json`，阻止市场重复安装。
4. 在 `cordis.patch.yml` 中幂等写入 `dream-skin` loader 行。
5. 保留用户后续在插件管理器或选择向导中作出的启停选择。

同时把 `dream-skin` 加入 `dsh-desktop/scripts/onboarding.js` 的 `RECOMMENDED_PLUGIN_IDS`。全新用户首次启动时，选择向导据此默认勾选该插件；用户仍可在提交向导前取消勾选。这样“默认启用”同时覆盖升级用户、跳过向导的用户和完成首次向导的新用户。

插件本身继续使用标准 DSH 双面插件契约：host 半边为 `lib/index.js`，浏览器半边为 `lib/client.js`。主题、壁纸、强调色和主题包状态仍由插件按既有实现保存，不在桌面壳新增配置存储。

## 兼容与迁移

- 若 profile 中存在通过市场、npm、GitHub 或本地链接安装的同名包，沿用 `builtin-collision` 的现有检测、快照和接管流程，移除重复 bundle/patch 登记后使用内置资产。
- 若用户已禁用或移除该内置插件，现有插件管理状态优先，不在后续启动中强制重新启用。
- 插件目录名、package name 和 loader id 分别固定为 `dsh-dream-skin`、`dsh-dream-skin` 和 `dream-skin`。
- 不改 `@deepseek-ai/dsh` 核心，不改 `node_modules` 中的上游产物。

## 网络与更新边界

本次不向 `plugin-updater.js` 增加 GitHub/npm 更新源，也不新增下载或版本检查。插件版本只随桌面应用发版更新，保证构建和运行时均可离线。未来若要接入上游自动更新，需按 `AGENTS.md` 的网络边界规则另行设计和评审。

## 错误处理

- 内置资产缺少 `package.json` 时，沿用现有启动日志并跳过该插件，不拖垮整个插件树。
- 同名市场包迁移前由插件保护中心创建快照；失败时记录错误并继续现有降级路径。
- patch 写入保持幂等，避免重复 loader entry。
- 插件浏览器端异常由现有 DSH slot/插件边界处理；本次不引入新的全局错误通道。

## 验证与验收

新增或调整项目测试以验证：

1. `COMPANION_PLUGINS` 包含 `dream-skin`，名称为 `dsh-dream-skin`，且默认未禁用。
2. `RECOMMENDED_PLUGIN_IDS` 包含 `dream-skin`，保证首次选择向导默认勾选。
3. 内置资产目录包含有效 `package.json`、`cordis.patch.yml`、`lib/index.js` 和 `lib/client.js`。
4. package name、loader id 与注册表一致。
5. 同步逻辑能生成默认启用的 patch 行，并继续满足幂等和同名包去重约束。

实施验证至少包括：

- 对复制后的 JS 文件运行 `node --check`。
- 运行插件自身的 smoke tests。
- 运行新增的项目相关测试。
- 运行 `npm test` 全量回归。
- 检查 `git diff`，确认未复制开发杂项且没有引入新的网络调用。

验收完成的外部表现为：安装或启动桌面应用后，`dsh-dream-skin` 出现在内置插件列表中并默认启用；打开“设置 → 外观”可以使用其主题、强调色、壁纸和主题包功能；无外网环境下功能仍可加载。
