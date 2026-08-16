import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
  { name: 'lint', command: 'npm run lint' },
  { name: 'typecheck', command: 'npm run typecheck' },
  { name: 'build', command: 'npm run build' },
  { name: 'browser-e2e', command: 'npm run test:e2e' }
];

const results = [];

for (const check of checks) {
  const startedAt = Date.now();
  const result = spawnSync(check.command, {
    shell: true,
    stdio: 'inherit',
    env: process.env
  });

  results.push({
    name: check.name,
    command: check.command,
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status ?? 1,
    durationMs: Date.now() - startedAt,
    error: result.error?.message ?? null
  });
}

const failed = results.some((result) => result.status === 'failed');
const receipt = {
  schemaVersion: '1.0',
  projectId: 'rollindd-platform',
  repository: process.env.GITHUB_REPOSITORY ?? 'chrisdortch/rollindd-platform',
  branch: process.env.GITHUB_REF_NAME ?? null,
  commit: process.env.GITHUB_SHA ?? null,
  workflowRunId: process.env.GITHUB_RUN_ID ?? null,
  workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
  generatedAt: new Date().toISOString(),
  mode: 'preview-only',
  overallStatus: failed ? 'failed' : 'passed',
  checks: results,
  boundaries: {
    merged: false,
    productionPromoted: false,
    productionAliasChanged: false,
    customDomainChanged: false,
    databaseMutationPerformed: false,
    secretChanged: false
  }
};

mkdirSync('.clover/artifacts', { recursive: true });
writeFileSync(
  '.clover/artifacts/build-receipt.json',
  `${JSON.stringify(receipt, null, 2)}\n`,
  'utf8'
);

console.log(`Clover build receipt: ${receipt.overallStatus}`);
process.exit(failed ? 1 : 0);
