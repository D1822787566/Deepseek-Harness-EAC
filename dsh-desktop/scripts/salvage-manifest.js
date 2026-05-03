'use strict';

// scripts/salvage-manifest.js - 中断后打捞：把已落盘的 tgz 重建进 manifest.json。
//
// 场景：老版 mirror-market.js 只在全部结束时写 manifest，中途 Ctrl+C 后
// 已下载的 tgz 无法走重跑的 resume 快速路径（manifest 里没有它们的 sha256）。
// 本脚本重拉目录，与现有 tgz 配对，重建完整 manifest 条目：
// 元数据（desc/category/stars）取目录条目，name/version 取 tgz 内 package.json，
// sha256/sizeBytes 取实文件。截断的半成品 tgz（杀进程时正在写）直接删除。
//
// 用法：NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/salvage-manifest.js

const fs = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const {
  CATALOG_URL, MARKET_DIR, slugOf, specOfInstall, cleanCatalog, fetchCatalog, writeManifest, tarBin,
} = require('./mirror-market.js');

function sha256FileSync(p) {
  const h = createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex');
}

/** 从平铺 tgz 提取 package.json -> { ok, pkg? }；不确定为何失败时返回
 *  { ok:false, certain:false }（tar 明确报截断/压缩错误才是 certain:true）。
 *  区分依据：打包期间机器高负载/杀毒占用会让 tar 偶发读失败，这类
 *  "校验失败"不等于"文件损坏"，绝不能据此删文件。 */
function pkgOfTgz(tgz) {
  const r = spawnSync(tarBin, ['-xOzf', tgz, 'package.json'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 30000 });
  const stderr = String(r.stderr || '');
  if (r.status === 0 && r.stdout) {
    try { return { ok: true, pkg: JSON.parse(r.stdout) }; } catch (e) { return { ok: false, certain: false, reason: 'bad json: ' + e.message }; }
  }
  const certain = /unexpected end of file|truncated|compression error|archive is truncated/i.test(stderr + ' ' + String((r.error && r.error.message) || ''));
  return { ok: false, certain, reason: (r.error && r.error.code) || ('tar exit ' + r.status), stderr: stderr.slice(0, 200) };
}

async function main() {
  const entries = await fetchCatalog(CATALOG_URL);
  const { kept } = cleanCatalog(entries);
  // 已有 manifest 作为基底（不覆盖磁盘上已有的账本条目）。
  const manifest = { updated: new Date().toISOString().slice(0, 10), source: CATALOG_URL, entries: {} };
  try {
    const prev = JSON.parse(fs.readFileSync(join(MARKET_DIR, 'manifest.json'), 'utf8'));
    if (prev && prev.entries) manifest.entries = prev.entries;
  } catch { /* 首次打捞无基底 */ }

  let salvaged = 0;
  const corrupt = [];
  const unverified = [];
  const slugsOnDisk = new Map(); // slug -> tgz 路径
  for (const f of fs.readdirSync(MARKET_DIR)) {
    if (f.endsWith('.tgz')) slugsOnDisk.set(f.slice(0, -4), join(MARKET_DIR, f));
  }

  for (const e of kept) {
    const spec = specOfInstall(e.install) || e.npm || e.url || e.name;
    const slug = slugOf(spec);
    if (manifest.entries[slug] || !slugsOnDisk.has(slug)) continue;
    const tgz = slugsOnDisk.get(slug);
    const probe = pkgOfTgz(tgz);
    if (!probe.ok) {
      if (probe.certain) {
        // 明确截断（tar 报 unexpected EOF 等）：删除，重跑时会重新镜像。
        fs.rmSync(tgz, { force: true });
        corrupt.push(slug);
      } else {
        // 原因不明（负载/文件占用导致的偶发读失败等）：保留文件不并入账本，
        // 打 warning 提示人工复查；重跑 mirror 会重打包并覆盖。
        unverified.push(slug + ' (' + probe.reason + (probe.stderr ? ': ' + probe.stderr : '') + ')');
      }
      continue;
    }
    const pkg = probe.pkg;
    const desc = e.description || {};
    manifest.entries[slug] = {
      name: pkg.name || e.name || slug,
      version: pkg.version || '',
      source: spec,
      category: e.category || '',
      desc: desc.zh || desc.en || '',
      stars: e.stars ?? null,
      experimental: e.experimental === true,
      sha256: sha256FileSync(tgz),
      sizeBytes: fs.statSync(tgz).size,
    };
    salvaged++;
  }

  // 与当前目录对不上的残留 tgz（目录条目变更等）：列出，不并入。
  const orphans = [...slugsOnDisk.keys()].filter((s) => !manifest.entries[s] && !corrupt.includes(s) && !unverified.some((u) => u.startsWith(s + ' ')));
  fs.mkdirSync(MARKET_DIR, { recursive: true });
  writeManifest(manifest, join(MARKET_DIR, 'manifest.json'));
  console.log(`[salvage] kept=${kept.length} salvaged=${salvaged} total=${Object.keys(manifest.entries).length}`
    + `${corrupt.length ? ' corrupt-removed=' + corrupt.join(',') : ''}`
    + `${unverified.length ? ' unverified-kept=' + unverified.join('; ') : ''}`
    + `${orphans.length ? ' orphans=' + orphans.join(',') : ''}`);
}

main().catch((err) => { console.error('[salvage] fatal:', err); process.exit(1); });
