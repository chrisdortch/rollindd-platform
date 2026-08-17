import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Page, Request, TestInfo } from '@playwright/test';

type CaptureOptions = {
  priority?: number;
};

type EvidenceOptions = {
  projectId: string;
  baseOrigin: string;
};

type Check = {
  id: string;
  passed: boolean;
  detail: string;
};

type VisualState = {
  stateId: string;
  priority: number;
  route: string;
  title: string;
  metrics: Record<string, any>;
  screenshot: {
    path: string;
    sha256: string;
    bytes: number;
    type: 'jpeg';
    scale: 'css';
  };
};

function gitCapture(args: string[]) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function readConfig() {
  return JSON.parse(readFileSync(path.join(process.cwd(), '.clover', 'visual-qa.json'), 'utf8'));
}

function compilePatterns(values: string[] = []) {
  return values.map((value) => {
    try {
      const expression = new RegExp(value, 'i');
      return (input: string) => expression.test(input);
    } catch {
      const normalized = value.toLowerCase();
      return (input: string) => input.toLowerCase().includes(normalized);
    }
  });
}

function matchesAny(input: string, matchers: Array<(value: string) => boolean>) {
  return matchers.some((matcher) => matcher(input));
}

function requestFailureDetail(request: Request) {
  return {
    method: request.method(),
    resourceType: request.resourceType(),
    url: request.url(),
    failure: request.failure()?.errorText || 'unknown request failure'
  };
}

export function createVisualEvidenceRecorder(
  page: Page,
  testInfo: TestInfo,
  options: EvidenceOptions
) {
  const config = readConfig();
  const outputRoot = path.resolve(
    process.cwd(),
    config.evidence?.directory || '.clover/artifacts/visual-qa'
  );
  const screenshotsDir = path.resolve(
    process.cwd(),
    config.evidence?.screenshotsDirectory || path.join(outputRoot, 'screenshots')
  );
  const receiptsDir = path.resolve(
    process.cwd(),
    config.evidence?.receiptsDirectory || path.join(outputRoot, 'receipts')
  );
  mkdirSync(screenshotsDir, { recursive: true });
  mkdirSync(receiptsDir, { recursive: true });

  const ignoredConsole = compilePatterns(config.console?.ignorePatterns || []);
  const ignoredUrls = compilePatterns(config.network?.ignoreUrlPatterns || []);
  const ignoredExtensions = (config.network?.ignoreExtensions || []).map((value: string) => value.toLowerCase());
  const ignoredResourceTypes = new Set(config.network?.ignoreResourceTypes || ['media']);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedSameOriginRequests: ReturnType<typeof requestFailureDetail>[] = [];
  const states: VisualState[] = [];
  const browser = testInfo.project.name;
  let finalized = false;
  let finalReceipt: Record<string, any> | null = null;

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (!matchesAny(text, ignoredConsole)) consoleErrors.push(text);
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message || String(error));
  });

  page.on('requestfailed', (request) => {
    let requestUrl: URL;
    try {
      requestUrl = new URL(request.url());
    } catch {
      return;
    }
    if (requestUrl.origin !== options.baseOrigin) return;
    if (ignoredResourceTypes.has(request.resourceType())) return;
    if (matchesAny(request.url(), ignoredUrls)) return;
    const lowerPath = requestUrl.pathname.toLowerCase();
    if (ignoredExtensions.some((extension: string) => lowerPath.endsWith(extension))) return;
    failedSameOriginRequests.push(requestFailureDetail(request));
  });

  async function capture(stateId: string, captureOptions: CaptureOptions = {}) {
    const priority = captureOptions.priority ?? 50;
    const metrics = await page.evaluate(
      ({ tapTargetMinimumPx, textMinimumPx, maxReportedElements }) => {
        const isVisible = (element: Element) => {
          const html = element as HTMLElement;
          const style = window.getComputedStyle(html);
          const rect = html.getBoundingClientRect();
          return style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number(style.opacity || '1') > 0
            && rect.width > 0
            && rect.height > 0
            && rect.bottom > 0
            && rect.right > 0
            && rect.top < window.innerHeight
            && rect.left < window.innerWidth;
        };
        const labelFor = (element: Element) => {
          const html = element as HTMLElement;
          return (
            html.getAttribute('aria-label')
            || html.getAttribute('title')
            || html.textContent
            || html.tagName
          ).trim().replace(/\s+/g, ' ').slice(0, 100);
        };
        const interactiveSelector = [
          'a[href]',
          'button',
          'input:not([type="hidden"])',
          'select',
          'textarea',
          '[role="button"]',
          '[role="link"]',
          '[tabindex]:not([tabindex="-1"])'
        ].join(',');
        const interactive = [...document.querySelectorAll(interactiveSelector)].filter(isVisible);
        const smallTapTargets = interactive
          .map((element) => ({ element, rect: (element as HTMLElement).getBoundingClientRect() }))
          .filter(({ rect }) => rect.width < tapTargetMinimumPx || rect.height < tapTargetMinimumPx)
          .slice(0, maxReportedElements)
          .map(({ element, rect }) => ({
            label: labelFor(element),
            tag: element.tagName.toLowerCase(),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }));
        const textCandidates = [...document.querySelectorAll(
          'p,li,a,button,label,input,textarea,select,figcaption,small'
        )].filter(isVisible);
        const smallTextElements = textCandidates
          .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < textMinimumPx)
          .slice(0, maxReportedElements)
          .map((element) => ({
            label: labelFor(element),
            tag: element.tagName.toLowerCase(),
            fontSizePx: Number.parseFloat(getComputedStyle(element).fontSize)
          }));
        const visibleImages = [...document.images].filter(isVisible);
        const brokenVisibleImages = visibleImages
          .filter((image) => image.complete && image.naturalWidth === 0)
          .slice(0, maxReportedElements)
          .map((image) => image.currentSrc || image.src || image.alt || 'unidentified image');
        const incompleteVisibleImages = visibleImages.filter((image) => !image.complete);
        const visibleImagesMissingAlt = visibleImages
          .filter((image) => !image.hasAttribute('alt') || !image.alt.trim())
          .slice(0, maxReportedElements)
          .map((image) => image.currentSrc || image.src || 'unidentified image');
        const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
          .filter(isVisible)
          .slice(0, maxReportedElements)
          .map((heading) => ({
            level: Number(heading.tagName.slice(1)),
            text: labelFor(heading)
          }));
        const root = document.documentElement;
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          document: {
            scrollWidth: root.scrollWidth,
            clientWidth: root.clientWidth,
            scrollHeight: root.scrollHeight,
            clientHeight: root.clientHeight,
            domNodeCount: document.querySelectorAll('*').length
          },
          horizontalOverflowPx: Math.max(0, root.scrollWidth - window.innerWidth),
          visibleInteractiveCount: interactive.length,
          smallTapTargetCount: smallTapTargets.length,
          smallTapTargets,
          smallTextElementCount: smallTextElements.length,
          smallTextElements,
          imageCount: document.images.length,
          visibleImageCount: visibleImages.length,
          brokenVisibleImageCount: brokenVisibleImages.length,
          brokenVisibleImages,
          incompleteVisibleImageCount: incompleteVisibleImages.length,
          visibleImagesMissingAltCount: visibleImagesMissingAlt.length,
          visibleImagesMissingAlt,
          headings,
          landmarkCounts: {
            header: document.querySelectorAll('header,[role="banner"]').length,
            nav: document.querySelectorAll('nav,[role="navigation"]').length,
            main: document.querySelectorAll('main,[role="main"]').length,
            footer: document.querySelectorAll('footer,[role="contentinfo"]').length
          }
        };
      },
      {
        tapTargetMinimumPx: Number(config.checks?.tapTargetMinimumPx || 40),
        textMinimumPx: Number(config.checks?.textMinimumPx || 12),
        maxReportedElements: Number(config.checks?.maxReportedElements || 12)
      }
    );

    const safeState = stateId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const screenshotName = `${options.projectId}-${browser}-${safeState}.jpg`;
    const screenshotAbsolute = path.join(screenshotsDir, screenshotName);
    await page.screenshot({
      path: screenshotAbsolute,
      type: 'jpeg',
      quality: Number(config.evidence?.screenshotQuality || 72),
      fullPage: false,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css'
    });
    const screenshotBytes = readFileSync(screenshotAbsolute);
    const screenshotPath = path.relative(process.cwd(), screenshotAbsolute).split(path.sep).join('/');

    states.push({
      stateId: safeState,
      priority,
      route: page.url(),
      title: await page.title(),
      metrics,
      screenshot: {
        path: screenshotPath,
        sha256: createHash('sha256').update(screenshotBytes).digest('hex'),
        bytes: screenshotBytes.byteLength,
        type: 'jpeg',
        scale: 'css'
      }
    });
  }

  async function finalize() {
    if (finalized && finalReceipt) return finalReceipt;
    const checks: Check[] = [
      {
        id: 'required-visual-state-captured',
        passed: states.length > 0,
        detail: `${states.length} visual state(s) captured.`
      },
      {
        id: 'no-horizontal-overflow',
        passed: states.every((state) => (state.metrics.horizontalOverflowPx || 0) <= 1),
        detail: `Maximum observed overflow: ${Math.max(0, ...states.map((state) => state.metrics.horizontalOverflowPx || 0))}px.`
      },
      {
        id: 'no-visible-broken-images',
        passed: states.every((state) => (state.metrics.brokenVisibleImageCount || 0) === 0),
        detail: `${states.reduce((sum, state) => sum + (state.metrics.brokenVisibleImageCount || 0), 0)} broken visible image(s) observed.`
      },
      {
        id: 'no-page-errors',
        passed: pageErrors.length === 0,
        detail: `${pageErrors.length} uncaught page error(s) observed.`
      },
      {
        id: 'no-unexpected-console-errors',
        passed: consoleErrors.length === 0,
        detail: `${consoleErrors.length} unexpected console error(s) observed.`
      },
      {
        id: 'no-same-origin-request-failures',
        passed: failedSameOriginRequests.length === 0,
        detail: `${failedSameOriginRequests.length} same-origin non-media request failure(s) observed.`
      }
    ];
    const overallStatus = checks.every((check) => check.passed) ? 'passed' : 'failed';
    finalReceipt = {
      schemaVersion: '1.0',
      protocol: 'Clover Visual QA v1',
      generatedAt: new Date().toISOString(),
      projectId: options.projectId,
      browser,
      overallStatus,
      source: {
        repository: process.env.GITHUB_REPOSITORY || null,
        branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || gitCapture(['branch', '--show-current']),
        commit: process.env.GITHUB_SHA || gitCapture(['rev-parse', 'HEAD'])
      },
      checks,
      states,
      errors: {
        consoleErrors,
        pageErrors,
        failedSameOriginRequests
      },
      advisories: {
        smallTapTargetCount: states.reduce((sum, state) => sum + (state.metrics.smallTapTargetCount || 0), 0),
        smallTextElementCount: states.reduce((sum, state) => sum + (state.metrics.smallTextElementCount || 0), 0),
        visibleImagesMissingAltCount: states.reduce((sum, state) => sum + (state.metrics.visibleImagesMissingAltCount || 0), 0),
        incompleteVisibleImageCount: states.reduce((sum, state) => sum + (state.metrics.incompleteVisibleImageCount || 0), 0)
      },
      boundaries: {
        productionMutationAuthorized: false,
        browserCredentialsAllowed: false,
        externalWritesAllowed: false
      }
    };
    const receiptPath = path.join(receiptsDir, `${options.projectId}-${browser}.json`);
    writeFileSync(receiptPath, `${JSON.stringify(finalReceipt, null, 2)}\n`, 'utf8');
    finalized = true;
    return finalReceipt;
  }

  return { capture, finalize };
}
