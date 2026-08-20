'use strict';

// scripts/mirror-market.js — 构建离线市场镜像仓（Offline Market Mirror）。
//
// 用法：
//   node scripts/mirror-market.js              # 全量镜像（npm + github + tarball）
//   node scripts/mirror-market.js --limit 20   # 抽样模式（开发验证全链路）
//   node scripts/mirror-market.js --only npm   # 只镜像指定源
//
// 产物：
//   assets/market-cache/<slug>.tgz   自包含插件包（插件本体 + node_modules 闭包）
//   assets/market-cache/manifest.json slug → { name, version, source, category, desc,
//                                           stars, experimental, sha256, sizeBytes }
//   assets/market-cache/report.json  死链/失败清单 + 统计
//
// 安全：npm install 一律 --ignore-scripts（不执行第三方安装脚本），仅对
// NATIVE_ALLOWLIST 中的已知原生包事后 npm rebuild 放行构建脚本。

const path = require('node:path');

const CATALOG_URL = 'https://awesome-dsh-plugin.com/plugins.json';
const MARKET_DIR = path.resolve(__dirname, '..', 'assets', 'market-cache');

// 描述里命中这些词 → experimental（默认折叠）：NSFW/成人/硬件控制类。
const EXPERIMENTAL_RE = /(NSFW|R18|成人|电击|电刺激|stimulation|e-stim|Coyote)/i;

/** install 源 → 稳定 slug（manifest 主键）。@scope/name → scope-name。 */
function slugOf(source) {
  let s = String(source || '').trim();
  s = s.replace(/^(github|gitlab|bitbucket|link|file|npm):/, '');
  s = s.replace(/#.*$/, '');                       // #path:/... 或 #branch
  s = s.replace(/@[0-9][^/]*$/, '');               // 尾部 @version
  s = s.replace(/^@([^/]+)\//, '$1-');             // @scope/name → scope-name
  s = s.split('/').pop().replace(/\.git$/, '').replace(/\.tgz$/i, '');
  return s.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** 去重主键：npm 包名优先，否则 owner/repo（同名不同作者的仓库是不同插件）。 */
function dedupeKey(entry) {
  if (entry.npm) return String(entry.npm).toLowerCase();
  const m = /github\.com\/([^/]+\/[^/]+?)(?:\.git)?(?=[/#?]|$)/i.exec(entry.url || '');
  return m ? m[1].toLowerCase() : String(entry.name || entry.url || '').toLowerCase();
}

/** 清理：去重（同 key 保留第一条）+ experimental 打标。 */
function cleanCatalog(entries) {
  const seen = new Map();
  const kept = [];
  const dropped = [];
  for (const e of entries) {
    const key = dedupeKey(e);
    if (seen.has(key)) { dropped.push({ name: e.name || key, reason: 'duplicate' }); continue; }
    seen.set(key, true);
    const desc = [e.description && e.description.zh, e.description && e.description.en].filter(Boolean).join(' ');
    kept.push(Object.assign({}, e, { experimental: EXPERIMENTAL_RE.test(desc) }));
  }
  return { kept, dropped };
}

/** 解析 CLI 参数：--limit N 与 --only npm|github|tarball。 */
function parseArgs(argv) {
  const args = { limit: Infinity, only: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit') args.limit = Number(argv[i + 1]) || Infinity;
    if (argv[i] === '--only') args.only = argv[i + 1] || null;
  }
  return args;
}

module.exports = { CATALOG_URL, MARKET_DIR, EXPERIMENTAL_RE, slugOf, dedupeKey, cleanCatalog, parseArgs };

if (require.main === module) {
  console.log('mirror-market: 骨架就绪（完整流程见后续任务）');
}
