# ADR: 离线市场镜像（随包分发 1400+ 第三方插件）

日期：2026-08-21

## 背景

用户要求「把插件市场现有插件都下载下来，由用户自行决定是否安装」。
实测目录 1721 条（npm 623 / tarball 46 / github 1056），~3.8GB unpacked。
设计文档：docs/superpowers/specs/2026-08-21-offline-market-mirror-design.md。

## 决策

1. 发版时镜像目录（清理后约 1400-1600 个）为自包含 tgz 打进安装包
   （assets/market-cache/，~2.5-3.5GB），市场 UI 提供本地安装通道。
2. 供应链缓解：npm install 全程 --ignore-scripts（不执行第三方安装脚本），
   仅 NATIVE_ALLOWLIST（sharp/node-pty/koffi）精确匹配事后 npm rebuild 放行
   （scope 同名包如 @evil/sharp 绝不放行）；镜像带 sha256 manifest；
   离线安装走静态门禁（sha256 + 冲突预检 + plugin-guard 快照回滚 +
   桌面 watchdog/rescue-agent 兜底）；在线安装保留 trial-boot 探测。
3. 更新语义：镜像 = 发版快照；仓外条目在线兜底（复用现有外呼点）；
   不新增常驻外呼。镜像内容 = 发版时刻快照，允许落后于在线目录。
4. 网络边界：构建期外呼（catalog/npm/codeload）在 CI 侧，与
   fetch-node/fetch-npm 同级；运行时无新增外呼。

## 后果

- 安装包 ~150-200MB → ~3.5-4GB；构建 +1-3h / ~4-5GB 下载。
- 随包分发第三方代码是产品政策决策：风险由上述缓解措施对冲，
  用户安装时仍需自行判断（UI 对 experimental 内容默认折叠）。
- 镜像每周过期：在线兜底 + 发版刷新对冲。
- 清理规则：npm 同名/同 owner-repo 去重；同名不同作者仓库 slug 冲突时
  保留目录序第一个、第二个记 slug-collision（仍可在线安装）；
  experimental（NSFW/成人/硬件控制类）默认折叠。

## 替代方案（否决）

- 纯在线市场（现状）：断网不可装。
- 精选离线包（50-150）：用户明确选择全量。
- 纯离线快照（移除在线安装）：用户选择保留在线兜底。
- 离线 boot 探测：trial-boot 需联网装核心包，离线必然失败 → 用户拍板
  静态门禁兜底（详见设计文档与实现计划 Task 6 注释）。
