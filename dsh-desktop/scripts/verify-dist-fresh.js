'use strict';

// Release freshness guard (v2.0.3 incident → issue #7).
//
// v2.0.3 shipped artifacts built BEFORE the last source edits. This script
// refuses to bless a dist/ directory when any tracked source file was
// modified after the packaged artifacts were built.
//
// Usage: node scripts/verify-dist-fresh.js [repoRoot]
// Exit 0 = fresh, exit 1 = stale or missing artifacts (with a report).

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const IGNORED_PREFIXES = ['dist/', 'node_modules/', 'vendor/', '.git/'];

function listSources(repoRoot) {
  let out;
  try {
    out = execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8' });
  } catch {
    // Not a git repo (tests): fall back to a directory walk.
    const files = [];
    const walk = (dir) => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const rel = path.relative(repoRoot, path.join(dir, e.name)).replace(/\\/g, '/');
        if (e.isDirectory()) {
          if (IGNORED_PREFIXES.some((p) => (p.endsWith('/') ? rel + '/' : rel).startsWith(p))) continue;
          walk(path.join(dir, e.name));
        } else {
          if (IGNORED_PREFIXES.some((p) => rel.startsWith(p))) continue;
          files.push(rel);
        }
      }
    };
    walk(repoRoot);
    return files;
  }
  return out.split(/\r?\n/).filter(Boolean).filter((f) => !IGNORED_PREFIXES.some((p) => f.startsWith(p)));
}

function verifyDistFresh(repoRoot, distDir = path.join(repoRoot, 'dist')) {
  const artifacts = [];
  try {
    for (const e of fs.readdirSync(distDir, { withFileTypes: true })) {
      if (e.isFile() && /\.exe$/i.test(e.name)) artifacts.push(path.join(distDir, e.name));
    }
  } catch { /* dist missing */ }
  if (!artifacts.length) {
    return { ok: false, offenders: [], error: 'no packaged artifacts (*.exe) found in dist/' };
  }
  const artifactTime = Math.min(...artifacts.map((p) => fs.statSync(p).mtimeMs));
  const offenders = [];
  for (const rel of listSources(repoRoot)) {
    const p = path.join(repoRoot, ...rel.split('/'));
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.mtimeMs > artifactTime) offenders.push(rel);
  }
  return { ok: offenders.length === 0, offenders, artifactTime };
}

/** 校验离线市场镜像完整性：manifest 每条 sha256 与 tgz 实文件一致。 */
function verifyMarketCache(cacheDir) {
  const manifestFile = path.join(cacheDir, 'manifest.json');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    const entries = manifest.entries || {};
    const names = Object.keys(entries);
    const bad = [];
    const { createHash } = require('node:crypto');
    const hashOf = (p) => {
      const h = createHash('sha256');
      h.update(fs.readFileSync(p));
      return h.digest('hex');
    };
    for (const name of names) {
      const tgz = path.join(cacheDir, name + '.tgz');
      let actual = '';
      try { actual = hashOf(tgz); } catch {}
      if (actual !== entries[name].sha256) bad.push(name);
    }
    return { ok: bad.length === 0, count: names.length, bad };
  } catch (err) {
    return { ok: false, count: 0, bad: [], error: String((err && err.message) || err) };
  }
}

module.exports = { verifyDistFresh, verifyMarketCache };

if (require.main === module) {
  const repoRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
  const r = verifyDistFresh(repoRoot);
  if (r.ok) {
    console.log('verify-dist-fresh: OK — artifacts newer than every tracked source file');
  } else {
    console.error('verify-dist-fresh: STALE — ' + (r.error || `${r.offenders.length} source file(s) modified after the artifacts were built:`));
    for (const o of r.offenders.slice(0, 40)) console.error('  ' + o);
    if (r.offenders.length > 40) console.error(`  … and ${r.offenders.length - 40} more`);
    console.error('Rebuild (npm run dist) before publishing.');
    process.exitCode = 1;
  }
  // Offline market mirror integrity (dual anchor: script default cwd is dsh-desktop).
  const cacheCandidates = [
    path.join(repoRoot, 'dsh-desktop', 'assets', 'market-cache'),
    path.join(repoRoot, 'assets', 'market-cache'),
  ];
  const cacheDir = cacheCandidates.find((p) => fs.existsSync(p));
  if (cacheDir) {
    const mc = verifyMarketCache(cacheDir);
    console.log(`market-cache: ${mc.ok ? 'OK' : 'CORRUPT'} (${mc.count} entries)`);
    if (!mc.ok) {
      console.error('  ' + (mc.error || ('sha256 mismatch: ' + mc.bad.join(', '))));
      process.exitCode = 1;
    }
  }
}
