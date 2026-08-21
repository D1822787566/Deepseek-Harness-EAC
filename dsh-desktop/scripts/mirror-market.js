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
const { join } = path;
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const os = require('node:os');
const { createHash } = require('node:crypto');
const archiver = require('archiver');

const CATALOG_URL = 'https://awesome-dsh-plugin.com/plugins.json';
const MARKET_DIR = path.resolve(__dirname, '..', 'assets', 'market-cache');

// 描述里命中这些词 → experimental（默认折叠）：NSFW/成人/硬件控制类。
const EXPERIMENTAL_RE = /(NSFW|R18|成人|电击|电刺激|stimulation|e-stim|Coyote)/i;

/** install 源 → 稳定 slug（manifest 主键）。@scope/name → scope-name。 */
function slugOf(source) {
  let s = String(source || '').trim();
  s = s.replace(/^(github|gitlab|bitbucket|link|file|npm):/, '');
  s = s.replace(/#.*$/, '');                       // #path:/... 或 #branch
  s = s.replace(/@v?[0-9][^/]*$/, '');             // 尾部 @version（支持 @1.2.3 / @v1.2.3）
  s = s.replace(/^@([^/]+)\//, '$1-');             // @scope/name → scope-name
  s = s.split('/').pop().replace(/\.git$/, '').replace(/\.tgz$/i, '');
  return s.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** 去重主键：npm 包名优先，否则 owner/repo（同名不同作者的仓库是不同插件）。 */
function dedupeKey(entry) {
  if (entry.npm) return String(entry.npm).toLowerCase();
  const m = /github\.com\/([^/]+\/[^/]+?)(?:\.git)?(?=[/#?]|$)/i.exec(entry.url || '');
  return m ? m[1].toLowerCase() : (String(entry.name || entry.url || '').toLowerCase() || 'none');
}

/** 从完整 install 命令提取安装 spec（'dsh plugin --profile web add <spec>' → '<spec>'）。 */
function specOfInstall(install) {
  let s = String(install || '').trim();
  s = s.replace(/^dsh plugin --profile \S+ \S+\s+/, '');
  return s.replace(/^["']|["']$/g, '').trim();
}

/** 清理：去重（同 key 保留第一条）+ slug 冲突剔除 + experimental 打标。 */
function cleanCatalog(entries) {
  const seen = new Map();
  const slugSeen = new Set();
  const kept = [];
  const dropped = [];
  for (const e of entries) {
    const key = dedupeKey(e);
    if (seen.has(key)) { dropped.push({ name: e.name || key, reason: 'duplicate' }); continue; }
    seen.set(key, true);
    const desc = typeof e.description === 'string'
      ? e.description
      : [e.description && e.description.zh, e.description && e.description.en].filter(Boolean).join(' ');
    const cleaned = Object.assign({}, e, { experimental: EXPERIMENTAL_RE.test(desc) });
    // 同名不同作者的仓库 slug 相同（如两个 dsh-stock-watch）→ 保留第一个，
    // 第二个记 slug-collision（manifest/tgz 主键防覆盖；仍可在线安装兜底）。
    const slug = slugOf(specOfInstall(e.install) || e.npm || e.url || e.name);
    if (slugSeen.has(slug)) { dropped.push({ name: e.name || key, reason: 'slug-collision' }); continue; }
    slugSeen.add(slug);
    kept.push(cleaned);
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

/** 判断目录条目的三源类型与可达性，返回 { ok, source, version?, error? }。
 *  每次 fetch 带 AbortSignal.timeout 超时（设计要求「404/超时剔除」）；
 *  catch 保留分支 source 标签，report.json 不误标。 */
async function probeEntry(entry, { npmRegistry = 'https://registry.npmjs.org', timeoutMs = 10000 } = {}) {
  let src = 'unknown';
  try {
    const install = String((entry && entry.install) || '');
    if (entry && entry.npm) {
      src = 'npm';
      const url = `${npmRegistry}/${encodeURIComponent(entry.npm)}`;
      const res = await fetch(url, { headers: { accept: 'application/vnd.npm.install-v1+json' }, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) return { ok: false, source: src, error: `npm registry ${res.status}` };
      const j = await res.json();
      const version = j['dist-tags'] && j['dist-tags'].latest;
      return version ? { ok: true, source: src, version } : { ok: false, source: src, error: 'no dist-tags.latest' };
    }
    if (entry && entry.tarball) {
      src = 'tarball';
      const res = await fetch(entry.tarball, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
      const size = Number(res.headers.get('content-length') || 0);
      return res.ok ? { ok: true, source: src, sizeBytes: size } : { ok: false, source: src, error: `HEAD ${res.status}` };
    }
    if (entry && (/^github:|github\.com\//i.test(install) || /github\.com\//i.test(entry.url || ''))) {
      src = 'github';
      const m = /github\.com[\/:]([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?(?=[/#?]|$)/i.exec(install + ' ' + (entry.url || ''));
      if (!m) return { ok: false, source: src, error: 'no owner/repo' };
      const url = `https://codeload.github.com/${m[1]}/tar.gz/HEAD`;
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
      return res.ok ? { ok: true, source: src, repo: m[1] } : { ok: false, source: src, error: `codeload HEAD ${res.status}` };
    }
    return { ok: false, source: src, error: 'no install command' };
  } catch (err) {
    return { ok: false, source: src, error: String((err && err.message) || err) };
  }
}

// 精确匹配包名（不做 scope 剥离）——@evil/sharp 之类的同名作用域包绝不放行。
const NATIVE_ALLOWLIST = new Set(['sharp', 'node-pty', 'koffi', 'prebuild-install']);

const npmCmd = () => (process.platform === 'win32' ? 'npm.cmd' : 'npm');

/** 执行 npm：Windows 无法直接 spawn .cmd（ENOENT/EINVAL），走 cmd.exe /c；
 *  POSIX 直接 spawn。避免 shell:true + args（Node ≥22 弃用 DEP0190，参数不转义）。 */
function spawnNpm(args, { cwd, timeoutMs, cmd = npmCmd() } = {}) {
  if (process.platform === 'win32') {
    const quoted = args.map((a) => (/[\s"]/.test(a) ? '"' + a.replace(/"/g, '\\"') + '"' : a)).join(' ');
    return spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `${cmd} ${quoted}`], { cwd, stdio: 'pipe', encoding: 'utf8', timeout: timeoutMs });
  }
  return spawnSync(cmd, args, { cwd, stdio: 'pipe', encoding: 'utf8', timeout: timeoutMs });
}

/** 下载 url 到 dest 文件（重定向跟随 + 超时）。 */
async function download(url, dest, { timeoutMs = 10000 } = {}) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`download ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

/** 解包 tgz 到 dest 目录（Windows 10 1803+ 自带 tar.exe）。 */
function extractTgz(tgz, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const r = spawnSync('tar', ['-xzf', tgz, '-C', dest], { stdio: 'pipe', encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`tar 解包失败: ${(r.error && r.error.message || (r.stderr || r.stdout || '')).slice(0, 300)}`);
}

/** 本地目录 → 目标目录（fs.cpSync，保留符号链接默认语义）。 */
async function materializeLocalDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
  return destDir;
}

/** 物化依赖闭包：npm install --ignore-scripts；返回 { installed, rebuilt }（rebuilt=待 rebuild 白名单候选）。 */
async function installClosure(pkgDir, { npmCmd: cmd = npmCmd() } = {}) {
  const install = spawnNpm(['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: pkgDir, cmd, timeoutMs: 10 * 60 * 1000 });
  const installed = install.status === 0;
  let rebuilt = [];
  if (installed) rebuilt = rebuildAllowlisted(listDeps(pkgDir));
  return { installed, rebuilt };
}

/** 列出包依赖名（dependencies 键，不含 dev）。 */
function listDeps(pkgDir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(join(pkgDir, 'package.json'), 'utf8'));
    return Object.keys(pkg.dependencies || {});
  } catch { return []; }
}

/** 白名单交集 → 需要 rebuild 的包名列表（精确匹配，scope 同名不放过）。 */
function rebuildAllowlisted(depNames) {
  return [...new Set(depNames)].filter((n) => NATIVE_ALLOWLIST.has(n));
}

/** 对白名单原生包放行构建脚本（npm rebuild 只跑指定包）。 */
function runRebuild(pkgDir, names, cmd = npmCmd()) {
  for (const n of names) {
    spawnNpm(['rebuild', n, '--foreground-scripts'], { cwd: pkgDir, cmd, timeoutMs: 5 * 60 * 1000 });
  }
}

/** 从目录取包名（package.json.name）。 */
function packageNameOf(pkgDir) {
  try { return JSON.parse(fs.readFileSync(join(pkgDir, 'package.json'), 'utf8')).name; } catch { return null; }
}

/** 文件 sha256（流式）。 */
async function sha256File(p) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    const s = fs.createReadStream(p);
    s.on('data', (d) => h.update(d));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}

/** 目录 → 单文件 tgz（archiver），返回 sha256。 */
async function packTgz(dir, outTgz) {
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(outTgz);
    const a = archiver('tar', { gzip: true, gzipOptions: { level: 6 } });
    a.on('error', reject);
    out.on('close', resolve);
    a.pipe(out);
    a.directory(dir, false);
    a.finalize();
  });
  return sha256File(outTgz);
}

/** manifest 写盘（排序键保证确定性）。 */
function writeManifest(manifest, dest) {
  const sorted = {};
  for (const k of Object.keys(manifest.entries).sort()) sorted[k] = manifest.entries[k];
  fs.writeFileSync(dest, JSON.stringify({ updated: manifest.updated, source: manifest.source, entries: sorted }, null, 1) + '\n');
}

/** github #path:/x/y 子包：返回根下对应目录（含 .. 越界守卫）。 */
function resolvePackageSubdir(rootDir, pathSpec) {
  if (!pathSpec) return rootDir;
  const clean = String(pathSpec).replace(/^\/+|\/+$/g, '');
  const p = join(rootDir, ...clean.split('/'));
  const rel = path.relative(rootDir, p);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null; // 防 #path:/../ 逃逸
  return fs.existsSync(join(p, 'package.json')) ? p : null;
}

// ── 主流程 ────────────────────────────────────────────────────────────

/** 镜像一个条目：probe → 物化 → 打包 → manifest 项。失败记 report。
 *  specOfInstall 已在 Task 2 定义（勿重复）。 */
async function mirrorOne(entry, ctx) {
  const spec = specOfInstall(entry.install) || entry.npm || entry.url || entry.name;
  const slug = slugOf(spec);
  const probed = await probeEntry(entry, ctx);
  if (!probed.ok) return { slug, entry, ok: false, stage: 'probe', error: probed.error };

  const work = fs.mkdtempSync(join(os.tmpdir(), 'mirror-work-'));
  try {
    const tgzPath = join(ctx.cacheDir, slug + '.tgz');
    // 断点续跑：已存在且 sha256 命中 manifest 则跳过。
    if (fs.existsSync(tgzPath) && ctx.manifest.entries[slug] && await sha256File(tgzPath) === ctx.manifest.entries[slug].sha256) {
      return { slug, entry, ok: true, stage: 'resume', version: ctx.manifest.entries[slug].version };
    }

    let pkgRoot = null;
    if (probed.source === 'npm') {
      const packed = join(work, 'pkg.tgz');
      const pack = spawnNpm(['pack', `${entry.npm}@${probed.version}`, '--pack-destination', work], { cwd: work, cmd: npmCmd(), timeoutMs: 5 * 60 * 1000 });
      if (pack.status !== 0) return { slug, entry, ok: false, stage: 'pack', error: (pack.stderr || pack.stdout || '').slice(0, 300) };
      const name = (pack.stdout || '').trim().split(/\r?\n/).pop();
      extractTgz(join(work, name), join(work, 'pkg'));
      // npm pack tgz 顶层恒为 package/ 前缀 → 取其内容目录（与 github 顶层目录检测同理）。
      const topPkg = fs.readdirSync(join(work, 'pkg')).map((n) => join(work, 'pkg', n)).find((p) => fs.statSync(p).isDirectory());
      pkgRoot = topPkg || join(work, 'pkg');
    } else if (probed.source === 'github') {
      const tar = join(work, 'repo.tgz');
      // codeload 整仓 tarball 可能超 10s（download 默认超时偏紧）→ 放宽到 120s。
      await download(`https://codeload.github.com/${probed.repo}/tar.gz/HEAD`, tar, { timeoutMs: 120 * 1000 });
      extractTgz(tar, join(work, 'repo'));
      const top = fs.readdirSync(join(work, 'repo')).map((n) => join(work, 'repo', n)).find((p) => fs.statSync(p).isDirectory());
      const pathSpec = /#path:(\/[^#]*)/.exec(entry.install || '');
      pkgRoot = top ? resolvePackageSubdir(top, pathSpec && pathSpec[1]) : null;
    } else if (probed.source === 'tarball') {
      const tar = join(work, 'dl.tgz');
      await download(entry.tarball, tar, { timeoutMs: 120 * 1000 });
      extractTgz(tar, join(work, 'pkg'));
      // GitHub release 资产带 owner-repo-<sha>/ 顶层目录 → 与 npm/github 分支同款顶层检测
      const top = fs.readdirSync(join(work, 'pkg')).map((n) => join(work, 'pkg', n)).find((p) => fs.statSync(p).isDirectory());
      // 平铺 tarball 若 package.json 在根且带 src/ 目录，不再误选 src/。
      pkgRoot = (top && fs.existsSync(join(top, 'package.json')) ? top : join(work, 'pkg'));
    }
    if (!pkgRoot || !fs.existsSync(join(pkgRoot, 'package.json'))) {
      return { slug, entry, ok: false, stage: 'materialize', error: 'no package.json after materialize' };
    }

    const closure = await installClosure(pkgRoot, ctx);
    if (closure.installed && closure.rebuilt.length) runRebuild(pkgRoot, closure.rebuilt);

    const staged = join(work, 'stage');
    const clean = join(work, 'clean');
    fs.mkdirSync(staged, { recursive: true });
    // 只保留包本体（去 .git/测试等杂项），闭包 node_modules 保留。
    fs.cpSync(pkgRoot, clean, { recursive: true });
    for (const junk of ['.git', '.github', 'test', 'tests', '__tests__', 'node_modules/.cache']) {
      fs.rmSync(join(clean, junk), { recursive: true, force: true });
    }
    const pkg = JSON.parse(fs.readFileSync(join(clean, 'package.json'), 'utf8'));
    const sha = await packTgz(clean, tgzPath);
    const sizeBytes = fs.statSync(tgzPath).size;
    const desc = entry.description || {};
    ctx.manifest.entries[slug] = {
      name: pkg.name || entry.name || slug,
      version: pkg.version || probed.version || '',
      source: spec,
      category: entry.category || '',
      desc: desc.zh || desc.en || '',
      stars: entry.stars ?? null,
      experimental: entry.experimental === true,
      sha256: sha,
      sizeBytes,
    };
    return { slug, entry, ok: true, stage: 'mirrored', version: pkg.version || probed.version || '', sizeBytes };
  } catch (err) {
    return { slug, entry, ok: false, stage: 'materialize', error: String((err && err.message) || err) };
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

/** 并发执行器。 */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** 拉取目录（30s 超时，防挂死整轮）。 */
async function fetchCatalog(url) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  const j = await res.json();
  return Array.isArray(j) ? j : (j.plugins || j.list || []);
}

/** 主流程：拉取 → 清理 → probe → 并发镜像 → manifest/report。 */
async function main(argv) {
  const args = parseArgs(argv);
  const entries = await fetchCatalog(CATALOG_URL);
  const { kept, dropped } = cleanCatalog(entries);
  const filtered = kept.filter((e) => !args.only || (args.only === 'npm' && e.npm) || (args.only === 'tarball' && e.tarball) || (args.only === 'github' && !e.npm && !e.tarball));
  const target = filtered.slice(0, args.limit);

  fs.mkdirSync(MARKET_DIR, { recursive: true });
  // 断点续跑：加载上次 manifest.json（sha256 命中的条目在 mirrorOne 内跳过重下）。
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(join(MARKET_DIR, 'manifest.json'), 'utf8')); } catch {}
  const manifest = { updated: new Date().toISOString().slice(0, 10), source: CATALOG_URL, entries: Object.assign({}, (prev && prev.entries) || {}) };
  const results = await mapLimit(target, CONCURRENCY, (e) => mirrorOne(e, { cacheDir: MARKET_DIR, manifest, npmRegistry: 'https://registry.npmjs.org' }));
  const failed = results.filter((r) => !r.ok);
  writeManifest(manifest, join(MARKET_DIR, 'manifest.json'));
  const stats = { count: results.filter((r) => r.ok).length, failed: failed.length, sizeBytes: Object.values(manifest.entries).reduce((s, e) => s + (e.sizeBytes || 0), 0) };
  fs.writeFileSync(join(MARKET_DIR, 'report.json'), JSON.stringify({ updated: manifest.updated, catalogTotal: entries.length, kept: kept.length, dropped, failed, stats }, null, 1) + '\n');
  console.log(`[mirror] catalog=${entries.length} kept=${kept.length} target=${target.length} ok=${stats.count} failed=${failed.length} size=${(stats.sizeBytes / 1048576).toFixed(0)}MB`);
  for (const f of failed) console.log(`[mirror] FAIL ${f.slug} (${f.stage}): ${f.error}`);
  process.exitCode = failed.length ? 1 : 0;
}

const CONCURRENCY = 8;

module.exports = { CATALOG_URL, MARKET_DIR, EXPERIMENTAL_RE, slugOf, dedupeKey, specOfInstall, cleanCatalog, probeEntry, parseArgs, download, extractTgz, materializeLocalDir, installClosure, listDeps, rebuildAllowlisted, runRebuild, packageNameOf, NATIVE_ALLOWLIST, npmCmd, packTgz, sha256File, writeManifest, resolvePackageSubdir, mirrorOne, mapLimit, fetchCatalog, main, CONCURRENCY };

if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => { console.error('[mirror] fatal:', err); process.exit(1); });
}
