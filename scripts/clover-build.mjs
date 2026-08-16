import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const policyPath = process.env.CLOVER_POLICY_PATH || '.clover/project.json';
const fallbackReceiptPath = '.clover/artifacts/build-receipt.json';

function nowIso() {
  return new Date().toISOString();
}

function commandResult({ id, phase, command, status, exitCode = null, durationMs = 0, error = null }) {
  return { id, phase, command, status, exitCode, durationMs, error };
}

function runCapture(command, args = []) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: process.env
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function runShell(item, phase) {
  const normalized = typeof item === 'string'
    ? { id: item.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(), command: item }
    : item;
  const startedAt = Date.now();
  const result = spawnSync(normalized.command, {
    shell: true,
    stdio: 'inherit',
    env: process.env
  });

  return commandResult({
    id: normalized.id || `${phase}-command`,
    phase,
    command: normalized.command,
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status ?? 1,
    durationMs: Date.now() - startedAt,
    error: result.error?.message ?? null
  });
}

function globToRegExp(glob) {
  let source = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];

    if (char === '*' && next === '*') {
      const after = glob[index + 2];
      if (after === '/') {
        source += '(?:.*/)?';
        index += 2;
      } else {
        source += '.*';
        index += 1;
      }
      continue;
    }

    if (char === '*') {
      source += '[^/]*';
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      continue;
    }

    source += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }
  return new RegExp(`${source}$`);
}

function matchesAny(path, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(path));
}

function readPolicy() {
  if (!existsSync(policyPath)) {
    throw new Error(`Missing Clover policy: ${policyPath}`);
  }
  const raw = readFileSync(policyPath, 'utf8');
  return {
    raw,
    value: JSON.parse(raw),
    sha256: createHash('sha256').update(raw).digest('hex')
  };
}

function eventHeadSha() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) return null;
  try {
    const event = JSON.parse(readFileSync(eventPath, 'utf8'));
    return event.pull_request?.head?.sha ?? null;
  } catch {
    return null;
  }
}

function preflightCheck(id, passed, successDetail, failureDetail = successDetail) {
  const detail = passed ? successDetail : failureDetail;
  return {
    id,
    phase: 'preflight',
    command: null,
    status: passed ? 'passed' : 'failed',
    exitCode: passed ? 0 : 1,
    durationMs: 0,
    error: passed ? null : detail,
    detail
  };
}

function writeReceipt(path, receipt) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

function main() {
  const policyDocument = readPolicy();
  const policy = policyDocument.value;
  const project = policy.project ?? {};
  const build = policy.build ?? {};
  const receiptPath = policy.receipt?.artifactPath || fallbackReceiptPath;
  const repository = process.env.GITHUB_REPOSITORY || runCapture('git', ['config', '--get', 'remote.origin.url']);
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || runCapture('git', ['branch', '--show-current']);
  const commit = runCapture('git', ['rev-parse', 'HEAD']) || eventHeadSha() || process.env.GITHUB_SHA || null;
  const productionBranch = project.productionBranch || 'main';
  const remoteBaseRef = `origin/${productionBranch}`;
  const baseCommit = runCapture('git', ['merge-base', remoteBaseRef, 'HEAD'])
    || runCapture('git', ['rev-parse', remoteBaseRef])
    || null;
  const changedOutput = baseCommit
    ? runCapture('git', ['diff', '--name-only', `${baseCommit}...HEAD`])
    : null;
  const changedFiles = changedOutput ? changedOutput.split('\n').filter(Boolean).sort() : [];
  const sensitivePatterns = policy.sensitivePaths ?? [];
  const sensitiveFiles = changedFiles.filter((file) => matchesAny(file, sensitivePatterns));
  const allowedPrefixes = build.allowedBranchPrefixes ?? [];
  const matchingPrefix = branch
    ? allowedPrefixes.find((prefix) => branch.startsWith(prefix)) ?? null
    : null;
  const mode = process.env.CLOVER_BUILD_MODE || build.defaultMode || 'preview-only';

  const checks = [
    preflightCheck(
      'repository-identity',
      !project.repository || repository === project.repository,
      `Repository identity matched ${repository || project.repository || 'the configured repository'}.`,
      `Expected ${project.repository || 'the configured repository'}; observed ${repository || 'unknown'}.`
    ),
    preflightCheck(
      'preview-mode',
      mode === 'preview-only',
      'Validation mode is preview-only.',
      `Expected preview-only mode; observed ${mode}.`
    ),
    preflightCheck(
      'non-production-source-branch',
      Boolean(branch) && branch !== productionBranch,
      `Source branch ${branch || 'unknown'} is separate from production branch ${productionBranch}.`,
      `Preview validation may not run from production branch ${productionBranch}; observed ${branch || 'unknown'}.`
    ),
    preflightCheck(
      'allowed-branch-prefix',
      !branch || allowedPrefixes.length === 0 || Boolean(matchingPrefix),
      allowedPrefixes.length === 0
        ? 'No branch-prefix restriction is configured.'
        : `Branch ${branch || 'unknown'} matches allowed prefix ${matchingPrefix || 'none'}.`,
      `Branch ${branch || 'unknown'} does not match an allowed prefix: ${allowedPrefixes.join(', ')}.`
    ),
    preflightCheck(
      'base-commit-resolved',
      Boolean(baseCommit),
      `Resolved production merge base ${baseCommit || 'unknown'} against ${remoteBaseRef}.`,
      `Could not resolve a merge base against ${remoteBaseRef}.`
    ),
    preflightCheck(
      'sensitive-path-boundary',
      !(build.blockSensitivePathChanges === true && sensitiveFiles.length > 0),
      sensitiveFiles.length
        ? `Sensitive paths were detected but are not configured to block preview validation: ${sensitiveFiles.join(', ')}.`
        : 'No sensitive paths changed.',
      `Sensitive paths changed: ${sensitiveFiles.join(', ')}.`
    )
  ];

  const bootstrapCommands = build.bootstrapCommands ?? [];
  let bootstrapFailed = checks.some((check) => check.status === 'failed');

  for (const item of bootstrapCommands) {
    if (bootstrapFailed) {
      const normalized = typeof item === 'string' ? { id: 'bootstrap-command', command: item } : item;
      checks.push(commandResult({
        id: normalized.id || 'bootstrap-command',
        phase: 'bootstrap',
        command: normalized.command,
        status: 'skipped',
        error: 'Skipped because preflight or an earlier bootstrap command failed.'
      }));
      continue;
    }
    const result = runShell(item, 'bootstrap');
    checks.push(result);
    if (result.status === 'failed') bootstrapFailed = true;
  }

  const validationCommands = build.requiredCommands ?? [];
  for (const item of validationCommands) {
    if (bootstrapFailed) {
      const normalized = typeof item === 'string' ? { id: 'validation-command', command: item } : item;
      checks.push(commandResult({
        id: normalized.id || 'validation-command',
        phase: 'validation',
        command: normalized.command,
        status: 'skipped',
        error: 'Skipped because bootstrap did not complete successfully.'
      }));
      continue;
    }
    checks.push(runShell(item, 'validation'));
  }

  const failed = checks.some((check) => check.status === 'failed');
  const receipt = {
    schemaVersion: '1.0',
    protocolVersion: policy.protocolVersion || '1.0.0',
    generatedAt: nowIso(),
    mode,
    overallStatus: failed ? 'failed' : 'passed',
    previewCandidateEligible: !failed,
    release: {
      state: 'not-authorized',
      ownerApprovalRequired: true,
      productionEligible: false
    },
    policy: {
      path: policyPath,
      sha256: policyDocument.sha256,
      schema: policy.$schema ?? null
    },
    project: {
      id: project.id ?? null,
      title: project.title ?? null,
      repository: project.repository ?? null,
      vercelProjectId: project.vercelProjectId ?? null,
      productionBranch,
      productionDomain: project.productionDomain ?? null
    },
    source: {
      repository,
      branch,
      commit,
      eventHeadSha: eventHeadSha(),
      baseBranch: productionBranch,
      baseCommit,
      eventName: process.env.GITHUB_EVENT_NAME ?? null,
      workflowRunId: process.env.GITHUB_RUN_ID ?? null,
      workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null
    },
    risk: policy.risk ?? null,
    changes: {
      count: changedFiles.length,
      files: changedFiles,
      sensitiveCount: sensitiveFiles.length,
      sensitiveFiles
    },
    checks,
    boundaries: {
      ciRepositoryPermission: 'contents-read',
      sourceBranchIsProduction: branch === productionBranch,
      productionMutationAuthorized: false,
      productionDeploymentAuthorized: false,
      productionAliasOrDomainChangeAuthorized: false,
      productionDataMutationAuthorized: false,
      secretMutationAuthorized: false,
      paidServiceAuthorization: false,
      externalReleaseState: 'not-evaluated-by-ci'
    }
  };

  writeReceipt(receiptPath, receipt);
  console.log(`Clover build receipt: ${receipt.overallStatus}`);
  process.exit(failed ? 1 : 0);
}

try {
  main();
} catch (error) {
  const receipt = {
    schemaVersion: '1.0',
    protocolVersion: '1.0.0',
    generatedAt: nowIso(),
    mode: process.env.CLOVER_BUILD_MODE || 'preview-only',
    overallStatus: 'failed',
    previewCandidateEligible: false,
    release: {
      state: 'not-authorized',
      ownerApprovalRequired: true,
      productionEligible: false
    },
    fatalError: error instanceof Error ? error.message : String(error)
  };
  writeReceipt(fallbackReceiptPath, receipt);
  console.error(receipt.fatalError);
  process.exit(1);
}
