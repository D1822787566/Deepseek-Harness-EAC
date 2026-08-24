'use strict';

const { createRequire } = require('node:module');

const COHORT_PACKAGES = [
  '@deepseek-ai/dsh',
  '@deepseek-ai/dsh-web-app',
  '@deepseek-ai/dsh-web-frontend',
  '@deepseek-ai/dsh-client-modules',
];

function assertDshDependencyCohort(readVersion) {
  const versions = COHORT_PACKAGES.map((name) => [name, readVersion(name)]);
  const expected = versions[0][1];
  if (versions.every(([, version]) => version === expected)) return;

  const details = versions.map(([name, version]) => `${name.replace('@deepseek-ai/', '')}@${version}`).join(', ');
  throw new Error(
    `DSH dependency versions are mixed: ${details}. ` +
    'Run npm ci in the dsh-desktop directory to restore the package-lock.json dependency set.',
  );
}

function assertResolvedDshDependencyCohort(dshEntry) {
  const fromDsh = createRequire(dshEntry);
  assertDshDependencyCohort((name) => fromDsh(`${name}/package.json`).version);
}

module.exports = { assertDshDependencyCohort, assertResolvedDshDependencyCohort };
