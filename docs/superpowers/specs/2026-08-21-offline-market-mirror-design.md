# 离线市场镜像（Offline Market Mirror）设计

日期：2026-08-21
状态：已批准（用户拍板三项决策），待实现

## 目标

把插件市场目录（awesome-dsh-plugin.com，实测 1721 条）在发版时清理后镜像为
**离线插件仓**打进安装包；市场 UI 对仓内插件提供**本地安装**通道（断网可用），
仓外新条目保持**在线兜底**；不新增常驻外呼。

一句话：安装包自带一个「离线插件商店」，用户从里面自行选择装不装。

## 背景与实测数据（2026-08-21 审计）

| 源 | 数量 | 实测 |
|---|---|---|
| npm | 623 个 | 精确总和 **1026 MB** unpacked，623/623 可下载（0 失败），median 164KB / p90 2.39MB / max 149MB |
| 直链 tarball | 46 个 | 129 MB，44 成功 / 2 死链 |
| GitHub-only | 1056 个 | 抽样 30 均值 2.57MB（api.github.com size 外推）≈ **2.7 GB**，预计 5-15% 死链/迁移 |
| **合计** | **1721** | **≈ 3.8 GB unpacked，tgz 压缩后约 2.5~3.5 GB** |

现状缺口：目录浏览已离线（`dsh-webui-market/data/catalog-snapshot.json`，139KB、
281 条），安装一律联网（`dsh plugin add` npm/GitHub/tarball）。本次补的只有
「离线安装」这一环。

## 已定决策

1. **范围**：全量镜像，清理后预计 1400-1600 个。
2. **内容策略**：清理后镜像——去重（同名/同 repo）、构建期探活剔除死链、
   成人向/高危（如 dsh-coyote 硬件控制类）打 `experimental` tag 默认折叠。
3. **更新语义**：镜像 = 发版时刻快照；仓外条目联网走现有在线安装（装后入本地
   缓存）；完全断网时只能用包内镜像。**不新增常驻外呼**。

## 非目标

- 不做在线目录的实时镜像（镜像永远落后于在线目录，周更即陈旧，接受）。
- 不修改在线安装/卸载/更新的既有链路（仅新增一条离线分支）。
- 不改内置 38 插件 + 10 皮肤的 `syncCompanionPlugins` 装配机制。
- 不执行第三方安装脚本（全程 `--ignore-scripts` + allow-builds 白名单）。
- 不把 market-cache 提交进 git 仓库（体积 2.5~3.5GB）。

## 方案

### 1️⃣ 构建期：`scripts/mirror-market.js`（新增）

输入：在线拉取 `https://awesome-dsh-plugin.com/plugins.json`。

**清理规则**（产出 `market-cache/manifest.json` 与 `market-cache/report.json`）：

1. 去重：同名条目（如两个 `dsh-stock-watch`）、同 repo 多入口（monorepo
   `#path:` 子包）按「npm 包名 > 直接子包 > repo 根」优先级保留一份。
2. 探活：npm 源查 registry（dist-tags.latest 存在性）、GitHub 源 HEAD
   codeload tarball、直链 HEAD content-length；404/超时剔除，记入 report。
3. 打 tag：描述含 NSFW/成人/硬件控制关键词 → `experimental: true`。
4. 其余照单全收，不按质量/星级过滤（用户自选）。

**物化三源**（每个插件压成一个自包含 tgz，含 node_modules，安装=纯解包）：

- npm：`npm pack <name>@<latest>` → 解包 → `npm install --omit=dev --ignore-scripts`
  物化依赖闭包（allow-builds 白名单放行 sharp/node-pty/koffi 等已知原生包）。
- GitHub：codeload tarball 下载 → 解包 → 同上物化。
- tarball：直接下载归档。

**输出**：

```text
dsh-desktop/assets/market-cache/
  <slug>.tgz            # 自包含插件包（插件 + node_modules）
  manifest.json         # slug → { name, version, source, sha256, category,
                        #           desc, stars, experimental, sizeBytes }
  report.json           # 死链/失败清单 + 统计（体积、数量、失败率）
```

`assets/market-cache/` 加入 `.gitignore`，**不入库**。

**工程约束**：并发 8-16；断点续跑（已下载跳过，sha256 校验）；下载量 ~4-5GB、
构建 1-3 小时；在 GitHub Actions release 流水线中先跑 mirror 再 electron-builder，
mirror 产物可进 CI cache（TTL 刷新）。

### 2️⃣ 打包

`electron-builder.yml` 的 `files` 白名单增加 `assets/market-cache/**`。
安装包体积预计从 ~150-200MB（含内置 node.exe/sharp/node-pty/koffi）增至
~3.5-4GB（用户已确认接受；实现时以实际打包产物为准）。

### 3️⃣ 运行时离线安装（`dsh-webui-market/lib/host.js` 最小扩展）

新增 `resolveCache(source)`：查 manifest。

- **命中**（仓内）：本地安装路径——
  1. 解包 `<slug>.tgz` 到 `profile/node_modules/<name>`（`--ignore-scripts` 语义
     不变，闭包已物化，零 npm 解析）；
  2. 幂等写 patch 行 / bundles（复用 `syncCompanionPlugins` 的
     `copyPluginPackage` + patch 行模式，main.js:3993 起）；
  3. `runProbe` trial-boot 试装探测（装进临时 profile 真实 boot 验证，现有
     逻辑 host.js:442 原样复用——第三方包批量进场，boot 判据是唯一可信的
     「能不能装」）；
  4. `snapshotProfile` 快照（回滚用，host.js:541）；
  5. `hotMount` 热挂免重启（host.js:827）。
  6. 复用现有 op 机制（超时/输出截断/轮询/取消，`startOp` host.js:262）。
- **未命中**（仓外新条目）：走现有 `dsh plugin add` 在线路径，装后把 tgz
  缓存进 `userData/market-cache/`（本地复用，不新增常驻外呼）。

卸载 / 更新检测 / 冲突预检 / 内置同名拦截（`.dsh-builtin-plugins.json`）全部
复用现有逻辑，零改动。

### 4️⃣ UI（`dsh-webui-market/lib/client.js`）

- 卡片加「离线包内」徽章；仓内条目安装 = 本地秒装。
- `experimental: true` 条目默认折叠，设置开关「显示实验性内容」。
- 其余交互（搜索/分类/已装状态/卸载）不变。

### 5️⃣ 更新语义（已定）

镜像随发版刷新；仓外在线兜底；`plugin-updater.js` 的既有更新机制不动。
网络边界：**无新增常驻外呼**（构建期外呼在 CI 侧，与 fetch-node/fetch-npm
同属构建期；在线兜底复用现有外呼点）。

## 错误处理

| 场景 | 处理 |
|---|---|
| 构建期死链/404 | 探活剔除，记入 report.json；镜像不中断 |
| 依赖闭包物化失败 | 该插件跳过并记入 report；不阻塞其余 |
| 离线安装后 boot 失败 | trial-boot 拒绝，真实 profile 未被触碰（现有语义） |
| 仓内 tgz 损坏（sha256 不符） | 拒绝本地安装，回退在线路径 |
| 新条目断网安装 | 现有错误提示（网络不可达） |

## 测试

1. `mirror-market` 单测：清理规则（去重/探活/tag）、manifest 生成、断点续跑、
   失败重试（`test/*.test.mjs`，node --test 风格）。
2. 离线安装 e2e：模拟无网环境（拦截外呼）安装一个仓内插件 → trial-boot 通过
   → hot-mount 生效。
3. `verify-dist-fresh` 扩展：market-cache 与 manifest 的 sha256 完整性抽查、
   安装包体积上限校验。
4. 供应链验证：抽查镜像内第三方包无 install 脚本被执行（`--ignore-scripts`
   生效证据）。

## 风险与边界

- **供应链面**：1400+ 第三方包随包分发是产品政策决策，缓解 =
  `--ignore-scripts` + allow-builds 白名单 + sha256 manifest + trial-boot +
  plugin-guard 快照回滚；建议另落一条 ADR 留档。
- **陈旧**：目录周更（281→1721 用了一周），镜像永远落后在线；在线兜底缓解。
- **体积**：+2.5~3.5GB（已确认）；构建期 +1-3h / ~4-5GB 下载（CI 侧）。
- **原生依赖**：sharp/node-pty/koffi 的 Windows 二进制需 allow-builds 白名单
  放行其构建脚本；trial-boot 兜底验证。
- **死链**：GitHub 源预计 5-15% 死链/迁移，探活剔除 + report 可见。

## 待实现清单（实现计划入口）

1. `scripts/mirror-market.js` + 单测
2. `.gitignore` + `electron-builder.yml` files 白名单
3. `host.js` 的 `resolveCache` 离线安装分支
4. `client.js` 徽章 + experimental 折叠
5. `verify-dist-fresh` 扩展
6. ADR（供应链/网络边界政策）
7. CI release 流水线接入 mirror
