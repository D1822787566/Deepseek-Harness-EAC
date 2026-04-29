'use strict';

// Patch electron-builder's portable NSIS template so the portable exe keeps a
// cached unpack directory across runs.
//
// Default behaviour: RMDir /r $INSTDIR before extraction and after app exit,
// so every launch re-extracts app-64.7z (132MB / ~24k files) into %TEMP%.
// With Defender scanning each new file this makes cold start take minutes.
//
// Patched behaviour (unpackDirName must be a stable string in
// electron-builder.yml):
//   - if %TEMP%\<unpackDirName>\.dsh-portable-version equals
//     ${VERSION}-<build fingerprint>
//     and the app exe exists, run the cached app directly (no extraction);
//   - otherwise delete, re-extract, and write the version marker;
//   - never delete the cache after the app exits.
// A version bump therefore automatically invalidates the cache.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

function buildFingerprint(projectDir = path.join(__dirname, '..')) {
  const hash = crypto.createHash('sha256');
  try {
    hash.update(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectDir, encoding: 'utf8' }));
    // 同一提交上的本地修改也必须产生新标识，避免开发测试继续复用旧缓存。
    hash.update(execFileSync('git', ['diff', '--binary', 'HEAD', '--', '.'], {
      cwd: projectDir,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }));
  } catch {
    // 源码包没有 .git 时使用入口内容；每次实际代码变化仍能刷新缓存。
    for (const relative of ['package.json', 'main.js', 'preload.js']) {
      try { hash.update(fs.readFileSync(path.join(projectDir, relative))); } catch {}
    }
  }
  return hash.digest('hex').slice(0, 12);
}

function patchTemplate(text, fingerprint) {
  const markerValue = `\${VERSION}-${fingerprint}`;

  // 已打过旧补丁时更新比较值和写入值，不能因为模板带标记就直接跳过。
  if (text.includes('DSH_PORTABLE_CACHE_PATCH')) {
    text = text.replace(
      /; DSH_PORTABLE_CACHE_PATCH: reuse previous extraction[^\r\n]*/,
      `; DSH_PORTABLE_CACHE_PATCH: build=${fingerprint}`,
    );
    text = text.replace(
      /StrCmp \$R2 "[^"]+" dsh_portable_run dsh_portable_extract/,
      `StrCmp $R2 "${markerValue}" dsh_portable_run dsh_portable_extract`,
    );
    text = text.replace(
      /(FileOpen \$R1 "\$INSTDIR\\\.dsh-portable-version" w\r?\n\s*)FileWrite \$R1 "[^"]+"/,
      `$1FileWrite $R1 "${markerValue}"`,
    );
    return text;
  }

  const before = `  RMDir /r $INSTDIR\n  SetOutPath $INSTDIR\n`;
  if (!text.includes(before)) {
    throw new Error('portable.nsi structure changed: missing initial extraction block');
  }
  const cacheCheck = `  ; DSH_PORTABLE_CACHE_PATCH: build=${fingerprint}\n  ClearErrors\n  FileOpen $R1 "$INSTDIR\\.dsh-portable-version" r\n  IfErrors dsh_portable_extract\n  FileClose $R1\n  IfFileExists "$INSTDIR\\\${APP_EXECUTABLE_FILENAME}" dsh_portable_has_exe dsh_portable_extract\ndsh_portable_has_exe:\n  FileOpen $R1 "$INSTDIR\\.dsh-portable-version" r\n  FileRead $R1 $R2\n  FileClose $R1\n  StrCmp $R2 "${markerValue}" dsh_portable_run dsh_portable_extract\ndsh_portable_extract:\n  RMDir /r $INSTDIR\n  SetOutPath $INSTDIR\n`;
  text = text.replace(before, cacheCheck);

  const extractionEnd = `  !endif\n\n  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_DIR", "$EXEDIR").r0'\n`;
  if (!text.includes(extractionEnd)) {
    throw new Error('portable.nsi structure changed: missing extraction end block');
  }
  const markerAndRun = `  !endif\n\n  FileOpen $R1 "$INSTDIR\\.dsh-portable-version" w\n  FileWrite $R1 "${markerValue}"\n  FileClose $R1\n\ndsh_portable_run:\n  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_DIR", "$EXEDIR").r0'\n`;
  text = text.replace(extractionEnd, markerAndRun);

  const cleanup = `  SetOutPath $EXEDIR\n\tRMDir /r $INSTDIR\n`;
  if (!text.includes(cleanup)) {
    throw new Error('portable.nsi structure changed: missing final cleanup block');
  }
  text = text.replace(cleanup, `    SetOutPath $EXEDIR\n    ; DSH_PORTABLE_CACHE_PATCH: keep the extracted cache for next launch.\n`);

  return text;
}

function patch() {
  const libPackage = require.resolve('app-builder-lib/package.json');
  const template = path.join(path.dirname(libPackage), 'templates', 'nsis', 'portable.nsi');
  const fingerprint = buildFingerprint();
  const original = fs.readFileSync(template, 'utf8');
  const patched = patchTemplate(original, fingerprint);
  fs.writeFileSync(template, patched, 'utf8');
  console.log(`[portable-cache] template build fingerprint=${fingerprint}:`, template);
}

module.exports = { buildFingerprint, patchTemplate };

if (require.main === module) patch();
