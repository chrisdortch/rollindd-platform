import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const configPath = path.join(root, '.clover', 'visual-qa.json');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function runGit(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
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

function matchesAny(file, patterns = []) {
  return patterns.some((pattern) => globToRegExp(pattern).test(file));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function selectScreenshots(states, requiredBrowsers, limit) {
  const sorted = [...states].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return `${a.browser}:${a.stateId}`.localeCompare(`${b.browser}:${b.stateId}`);
  });
  const selected = [];
  const selectedPaths = new Set();

  for (const browser of requiredBrowsers) {
    const candidate = sorted.find((state) => state.browser === browser && !selectedPaths.has(state.screenshot.path));
    if (candidate) {
      selected.push(candidate);
      selectedPaths.add(candidate.screenshot.path);
    }
  }

  for (const state of sorted) {
    if (selected.length >= limit) break;
    if (selectedPaths.has(state.screenshot.path)) continue;
    selected.push(state);
    selectedPaths.add(state.screenshot.path);
  }

  return selected.slice(0, limit);
}

function main() {
  if (!existsSync(configPath)) {
    throw new Error(`Missing visual QA policy: ${path.relative(root, configPath)}`);
  }

  const config = readJson(configPath);
  const outputRoot = path.resolve(root, config.evidence?.directory || '.clover/artifacts/visual-qa');
  const receiptsDir = path.resolve(root, config.evidence?.receiptsDirectory || path.join(outputRoot, 'receipts'));
  mkdirSync(outputRoot, { recursive: true });

  if (!existsSync(receiptsDir)) {
    throw new Error(`Missing visual QA receipts directory: ${path.relative(root, receiptsDir)}`);
  }

  const receiptFiles = readdirSync(receiptsDir)
    .filter((name) => name.endsWith('.json'))
    .sort();
  if (receiptFiles.length === 0) {
    throw new Error('No visual QA receipts were produced.');
  }

  const receipts = receiptFiles.map((name) => readJson(path.join(receiptsDir, name)));
  const currentCommit = runGit(['rev-parse', 'HEAD']);
  const productionBranch = config.project?.productionBranch || 'main';
  const baseRef = `origin/${productionBranch}`;
  const baseCommit = runGit(['merge-base', baseRef, 'HEAD']) || runGit(['rev-parse', baseRef]);
  const changedOutput = baseCommit ? runGit(['diff', '--name-only', `${baseCommit}...HEAD`]) : null;
  const changedFiles = changedOutput ? changedOutput.split('\n').filter(Boolean).sort() : [];
  const requiredBrowsers = config.browsers?.requiredProjects || ['desktop-chromium', 'mobile-webkit'];
  const observedBrowsers = [...new Set(receipts.map((receipt) => receipt.browser))].sort();
  const missingBrowsers = requiredBrowsers.filter((browser) => !observedBrowsers.includes(browser));
  const staleReceipts = currentCommit
    ? receipts.filter((receipt) => receipt.source?.commit && receipt.source.commit !== currentCommit)
    : [];

  const states = receipts.flatMap((receipt) =>
    (receipt.states || []).map((state) => ({
      ...state,
      browser: receipt.browser,
      receiptStatus: receipt.overallStatus
    }))
  );

  const receiptFailures = receipts.filter((receipt) => receipt.overallStatus !== 'passed');
  const failedChecks = receipts.flatMap((receipt) =>
    (receipt.checks || [])
      .filter((check) => !check.passed)
      .map((check) => ({ browser: receipt.browser, ...check }))
  );

  const uiPatterns = config.review?.uiPathPatterns || [];
  const nonVisualPatterns = config.review?.nonVisualPathPatterns || [];
  const visualChangeDetected = changedFiles.some((file) => matchesAny(file, uiPatterns));
  const onlyNonVisualChanges = changedFiles.length > 0 && changedFiles.every((file) => matchesAny(file, nonVisualPatterns));
  const firstCapture = config.review?.baselineStatus !== 'approved'
    && config.review?.requireModelReviewOnFirstCapture !== false;
  const forceReviewEnv = config.review?.forceReviewEnv || 'CLOVER_FORCE_MODEL_REVIEW';
  const forcedReview = process.env[forceReviewEnv] === '1';
  const reviewReasons = [];
  if (forcedReview) reviewReasons.push(`${forceReviewEnv}=1`);
  if (firstCapture) reviewReasons.push('visual baseline has not been owner-approved');
  if (visualChangeDetected) reviewReasons.push('UI-affecting source paths changed');
  const modelReviewRequired = reviewReasons.length > 0;

  const deterministicPassed = receiptFailures.length === 0
    && failedChecks.length === 0
    && missingBrowsers.length === 0
    && staleReceipts.length === 0;

  const maxScreenshots = Math.max(1, Number(config.evidence?.maxModelReviewScreenshots || 4));
  const selected = selectScreenshots(states, requiredBrowsers, maxScreenshots);
  const selectedScreenshots = selected.map((state) => ({
    projectId: config.project?.id || null,
    browser: state.browser,
    stateId: state.stateId,
    priority: state.priority,
    path: state.screenshot.path,
    sha256: state.screenshot.sha256,
    viewport: state.metrics?.viewport || null,
    route: state.route,
    title: state.title
  }));

  const advisoryTotals = receipts.reduce((totals, receipt) => {
    totals.smallTapTargets += receipt.advisories?.smallTapTargetCount || 0;
    totals.smallTextElements += receipt.advisories?.smallTextElementCount || 0;
    totals.visibleImagesMissingAlt += receipt.advisories?.visibleImagesMissingAltCount || 0;
    totals.incompleteVisibleImages += receipt.advisories?.incompleteVisibleImageCount || 0;
    return totals;
  }, {
    smallTapTargets: 0,
    smallTextElements: 0,
    visibleImagesMissingAlt: 0,
    incompleteVisibleImages: 0
  });

  const generatedAt = new Date().toISOString();
  const summary = {
    schemaVersion: '1.0',
    protocol: 'Clover Visual QA v1',
    generatedAt,
    project: config.project,
    source: {
      branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || runGit(['branch', '--show-current']) || null,
      commit: currentCommit,
      productionBranch,
      baseCommit,
      changedFiles,
      visualChangeDetected,
      onlyNonVisualChanges
    },
    deterministic: {
      status: deterministicPassed ? 'passed' : 'failed',
      requiredBrowsers,
      observedBrowsers,
      missingBrowsers,
      receiptCount: receipts.length,
      stateCount: states.length,
      screenshotCount: states.length,
      failedChecks,
      staleReceiptCount: staleReceipts.length,
      advisories: advisoryTotals
    },
    boundedModelReview: {
      required: modelReviewRequired,
      reasons: reviewReasons,
      screenshotBudget: maxScreenshots,
      selectedScreenshots,
      inputPolicy: 'Review only the summary and selected screenshots first. Open traces or additional screenshots only when a deterministic check fails or a selected image exposes a specific defect.'
    },
    release: {
      state: 'not-authorized',
      ownerApprovalRequired: true,
      productionEligible: false,
      deterministicPreviewCandidateEligible: deterministicPassed,
      ownerVisualReviewState: modelReviewRequired ? 'pending' : 'not-required-for-this-change'
    },
    boundaries: {
      productionMutationAuthorized: false,
      productionDeploymentAuthorized: false,
      productionAliasOrDomainChangeAuthorized: false,
      productionDataMutationAuthorized: false,
      secretMutationAuthorized: false,
      browserCredentialsAllowed: false,
      externalWritesAllowed: false
    }
  };

  const queue = {
    schemaVersion: '1.0',
    protocol: 'Clover Bounded Model Review Queue v1',
    generatedAt,
    projectId: config.project?.id || null,
    deterministicStatus: summary.deterministic.status,
    reviewRequired: modelReviewRequired,
    reasons: reviewReasons,
    maxScreenshots: maxScreenshots,
    screenshots: selectedScreenshots,
    instructions: [
      'Inspect only the listed screenshots and this queue on the first pass.',
      'Compare desktop and mobile hierarchy, spacing, readability, obvious clipping, control affordance, and state clarity.',
      'Do not authorize merge, production deployment, domain changes, data writes, secret changes, purchases, or external messages.',
      'Return specific findings tied to a screenshot path and state ID; encode accepted findings into deterministic checks when practical.'
    ]
  };

  const summaryPath = path.join(outputRoot, 'summary.json');
  const queuePath = path.join(outputRoot, 'model-review-queue.json');
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');

  const markdown = [
    `# ${config.project?.title || config.project?.id || 'Project'} visual QA`,
    '',
    `- Deterministic status: **${summary.deterministic.status}**`,
    `- Browser coverage: ${observedBrowsers.join(', ') || 'none'}`,
    `- Captured states: ${states.length}`,
    `- Bounded model review: **${modelReviewRequired ? 'required' : 'not required'}**`,
    `- Screenshot review budget: ${selectedScreenshots.length}/${maxScreenshots}`,
    `- Release state: **not authorized**`,
    '',
    '## Review reasons',
    '',
    ...(reviewReasons.length ? reviewReasons.map((reason) => `- ${reason}`) : ['- No visual-review trigger was detected.']),
    '',
    '## Selected screenshots',
    '',
    ...(selectedScreenshots.length
      ? selectedScreenshots.map((shot) => `- ${shot.browser} · ${shot.stateId} · \`${shot.path}\``)
      : ['- None']),
    '',
    '## Advisories',
    '',
    `- Small tap targets reported: ${advisoryTotals.smallTapTargets}`,
    `- Small text elements reported: ${advisoryTotals.smallTextElements}`,
    `- Visible images missing alt text: ${advisoryTotals.visibleImagesMissingAlt}`,
    `- Incomplete visible images: ${advisoryTotals.incompleteVisibleImages}`,
    '',
    'These advisory counts are review signals, not automatic release blockers. Hard failures are listed in `summary.json`.',
    ''
  ].join('\n');
  writeFileSync(path.join(outputRoot, 'summary.md'), markdown, 'utf8');

  const cards = states.map((state) => {
    const screenshotAbs = path.resolve(root, state.screenshot.path);
    const screenshotRel = path.relative(outputRoot, screenshotAbs).split(path.sep).join('/');
    const metric = state.metrics || {};
    return `
      <article class="card">
        <img src="${escapeHtml(screenshotRel)}" alt="${escapeHtml(`${state.browser} ${state.stateId}`)}">
        <div class="content">
          <h2>${escapeHtml(state.stateId)}</h2>
          <p><strong>${escapeHtml(state.browser)}</strong> · priority ${escapeHtml(state.priority)}</p>
          <p>${escapeHtml(state.route)} · ${escapeHtml(metric.viewport?.width || '?')}×${escapeHtml(metric.viewport?.height || '?')}</p>
          <p>Overflow ${escapeHtml(metric.horizontalOverflowPx || 0)}px · broken visible images ${escapeHtml(metric.brokenVisibleImageCount || 0)}</p>
          <p>Small targets ${escapeHtml(metric.smallTapTargetCount || 0)} · small text ${escapeHtml(metric.smallTextElementCount || 0)}</p>
        </div>
      </article>`;
  }).join('\n');

  const report = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(config.project?.title || 'Project')} visual QA</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#152019;background:#edf3ee}body{margin:0;padding:24px}.shell{max-width:1280px;margin:0 auto}.hero{background:#fff;border:1px solid #cdd8cf;border-radius:18px;padding:22px;box-shadow:0 12px 32px rgba(21,32,25,.07)}.status{display:inline-block;padding:6px 10px;border-radius:999px;background:${deterministicPassed ? '#dff4e5' : '#fde3df'};font-weight:700}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;margin-top:20px}.card{background:#fff;border:1px solid #cdd8cf;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(21,32,25,.06)}.card img{display:block;width:100%;height:auto;background:#dfe7e1}.content{padding:16px}.content h2{margin:0 0 8px;font-size:1.1rem}.content p{margin:6px 0;color:#46534a;font-size:.92rem}code{overflow-wrap:anywhere}@media(max-width:600px){body{padding:12px}.hero{padding:16px}}
</style>
</head>
<body><main class="shell">
<section class="hero">
<h1>${escapeHtml(config.project?.title || config.project?.id || 'Project')} visual QA</h1>
<p><span class="status">Deterministic ${escapeHtml(summary.deterministic.status)}</span></p>
<p>Bounded model review: <strong>${modelReviewRequired ? 'required' : 'not required'}</strong>. Review budget: ${selectedScreenshots.length}/${maxScreenshots} screenshots. Production release remains unauthorized.</p>
<p>Generated ${escapeHtml(generatedAt)} at commit <code>${escapeHtml(currentCommit || 'unknown')}</code>.</p>
</section>
<section class="grid">${cards}</section>
</main></body></html>`;
  writeFileSync(path.join(outputRoot, 'report.html'), report, 'utf8');

  console.log(`Clover Visual QA: ${summary.deterministic.status}; model review ${modelReviewRequired ? 'required' : 'not required'}; ${selectedScreenshots.length} screenshot(s) queued.`);
  process.exit(deterministicPassed ? 0 : 1);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
