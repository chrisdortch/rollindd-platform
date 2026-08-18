import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices, webkit } from 'playwright';

const baseUrl = process.env.CLOVER_BASE_URL || 'http://127.0.0.1:4173';
const evidenceDir = process.env.CLOVER_EVIDENCE_DIR || '.clover-preview-evidence';
const includeWebKit = process.env.CLOVER_INCLUDE_WEBKIT === 'true';
const candidateCommit = process.env.CLOVER_CANDIDATE_SHA || 'unknown';
const baseCommit = process.env.CLOVER_BASE_SHA || 'unknown';
const routes = ['/', '/sites/rollindd'];

const profiles = [
  {
    name: 'desktop-chromium',
    engine: 'chromium',
    contextOptions: { viewport: { width: 1440, height: 1000 } }
  },
  {
    name: 'mobile-chromium',
    engine: 'chromium',
    contextOptions: withoutDefaultBrowserType(devices['Pixel 7'])
  }
];

if (includeWebKit) {
  profiles.push({
    name: 'mobile-webkit',
    engine: 'webkit',
    contextOptions: withoutDefaultBrowserType(devices['iPhone 14'])
  });
}

const audit = {
  schemaVersion: '1.1',
  status: 'running',
  candidateCommit,
  baseCommit,
  baseUrl,
  includeWebKit,
  profiles: profiles.map(({ name, engine }) => ({ name, engine })),
  routes,
  results: [],
  ignoredNetworkFailures: [],
  failures: []
};

await mkdir(path.join(evidenceDir, 'screenshots'), { recursive: true });
await mkdir(path.join(evidenceDir, 'traces'), { recursive: true });
await persistAudit();

try {
  for (const profile of profiles) {
    await runProfile(profile);
  }
  audit.status = 'passed';
  await persistAudit();
} catch (error) {
  audit.status = 'failed';
  audit.failures.push({
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null
  });
  await persistAudit();
  throw error;
}

async function runProfile(profile) {
  const browserType = profile.engine === 'webkit' ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    ...profile.contextOptions,
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    colorScheme: 'dark',
    reducedMotion: 'reduce'
  });
  const tracePath = path.join(evidenceDir, 'traces', `${profile.name}.zip`);
  let failed = false;

  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data) => {
        window.__cloverSharedCollection = data;
      }
    });
  });
  await context.route(/\.(?:mp3|mp4)(?:\?.*)?$/i, (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() })
  );

  try {
    for (const routePath of routes) {
      const result = await runRoute(context, profile, routePath);
      audit.results.push(result);
      await persistAudit();
    }
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    if (failed) {
      await context.tracing.stop({ path: tracePath }).catch(() => undefined);
    } else {
      await context.tracing.stop().catch(() => undefined);
    }
    await context.close();
    await browser.close();
  }
}

async function runRoute(context, profile, routePath) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const ignoredFailures = [];
  const routeSlug = routePath === '/' ? 'home' : 'site-rollindd';
  const screenshotPrefix = `${profile.name}-${routeSlug}`;

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const requestUrl = request.url();
    const errorText = request.failure()?.errorText || '';
    const expectedCancelledRscNavigation =
      requestUrl.startsWith(baseUrl) &&
      requestUrl.includes('_rsc=') &&
      errorText.includes('ERR_ABORTED');
    const expectedCancelledMedia =
      /\.(?:mp3|mp4)(?:\?|$)/i.test(requestUrl) && errorText.includes('ERR_ABORTED');
    const record = `${request.method()} ${requestUrl} ${errorText}`.trim();
    if (expectedCancelledRscNavigation || expectedCancelledMedia) {
      ignoredFailures.push(record);
      audit.ignoredNetworkFailures.push({ profile: profile.name, routePath, record });
    } else {
      failedRequests.push(record);
    }
  });

  try {
    const response = await page.goto(
      `${baseUrl}${routePath}?_vercel_share=temporary-review-token`,
      { waitUntil: 'domcontentloaded' }
    );
    assert(response, `${profile.name} ${routePath}: missing document response`);
    assert(response.ok(), `${profile.name} ${routePath}: HTTP ${response.status()}`);

    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    const introHeading = page.getByRole('heading', { name: 'RollinDD', exact: true });
    const introRegion = page.getByRole('region', { name: /collection introduction/i });
    const introHero = introRegion.locator('.hero').first();
    const enterButton = page.getByRole('button', { name: 'Enter the collection' });
    const shareButton = page.getByRole('button', { name: 'Share collection' });
    const libraryHeading = page.getByRole('heading', { name: '7 Productions' });
    const player = page.getByRole('region', { name: 'Player' });

    await introHeading.waitFor({ state: 'visible' });
    await enterButton.waitFor({ state: 'visible' });
    assert.equal(await libraryHeading.count(), 0, `${profile.name} ${routePath}: library rendered before entry`);
    assert.equal(await player.isVisible().catch(() => false), false, `${profile.name} ${routePath}: idle player is visible`);

    const heroAssets = await verifyHeroAssets(page, introHero);
    const introOverflow = await horizontalOverflow(page);
    assert(introOverflow <= 1, `${profile.name} ${routePath}: intro overflow ${introOverflow}px`);

    if (profile.name.startsWith('mobile-')) {
      const enterBox = await enterButton.boundingBox();
      const shareBox = await shareButton.boundingBox();
      assert(enterBox && shareBox, `${profile.name} ${routePath}: mobile action boxes unavailable`);
      assert(
        enterBox.width > shareBox.width * 1.8,
        `${profile.name} ${routePath}: primary action is not full-width`
      );
    }

    await page.screenshot({
      path: path.join(evidenceDir, 'screenshots', `${screenshotPrefix}-intro.png`),
      fullPage: false,
      animations: 'disabled'
    });

    await shareButton.click();
    await page.waitForFunction(() => Boolean(window.__cloverSharedCollection?.url));
    const sharedUrl = await page.evaluate(() => window.__cloverSharedCollection.url);
    const parsedShareUrl = new URL(sharedUrl);
    assert.equal(parsedShareUrl.pathname, routePath, `${profile.name} ${routePath}: shared pathname changed`);
    assert.equal(parsedShareUrl.search, '', `${profile.name} ${routePath}: shared query leaked`);
    assert.equal(parsedShareUrl.hash, '', `${profile.name} ${routePath}: shared hash leaked`);

    await enterButton.click();
    await page.waitForURL((url) => url.hash === '#tracks');
    await libraryHeading.waitFor({ state: 'visible' });
    assert.equal(await introHeading.count(), 0, `${profile.name} ${routePath}: intro remained stacked above library`);
    assert.equal(await player.isVisible().catch(() => false), false, `${profile.name} ${routePath}: idle player is visible after entry`);

    await page.goBack();
    await page.waitForURL((url) => url.hash === '');
    await introHeading.waitFor({ state: 'visible' });
    assert.equal(await libraryHeading.count(), 0, `${profile.name} ${routePath}: browser Back did not restore intro`);

    await page.goForward();
    await page.waitForURL((url) => url.hash === '#tracks');
    await libraryHeading.waitFor({ state: 'visible' });
    assert.equal(await introHeading.count(), 0, `${profile.name} ${routePath}: browser Forward did not restore library`);
    assert.equal(await player.isVisible().catch(() => false), false, `${profile.name} ${routePath}: idle player appeared after Forward`);

    const idleOverflow = await horizontalOverflow(page);
    assert(idleOverflow <= 1, `${profile.name} ${routePath}: idle library overflow ${idleOverflow}px`);
    await page.screenshot({
      path: path.join(evidenceDir, 'screenshots', `${screenshotPrefix}-library-idle.png`),
      fullPage: false,
      animations: 'disabled'
    });

    await page
      .getByRole('button', { name: 'Play I. The Essence of Fearlessness' })
      .first()
      .click();
    await player.waitFor({ state: 'visible' });
    await page.waitForTimeout(350);

    const playerPosition = await player.evaluate((element) => getComputedStyle(element).position);
    assert.equal(playerPosition, 'fixed', `${profile.name} ${routePath}: active player is not fixed`);
    const playerBox = await player.boundingBox();
    const viewport = page.viewportSize();
    assert(playerBox && viewport, `${profile.name} ${routePath}: player geometry unavailable`);
    assert(playerBox.y >= 0, `${profile.name} ${routePath}: player begins above viewport`);
    assert(
      playerBox.y + playerBox.height <= viewport.height + 1,
      `${profile.name} ${routePath}: player extends below viewport`
    );
    if (profile.name.startsWith('mobile-')) {
      assert(
        playerBox.height <= 150,
        `${profile.name} ${routePath}: mobile player is ${playerBox.height}px tall`
      );
    }

    const activeOverflow = await horizontalOverflow(page);
    assert(activeOverflow <= 1, `${profile.name} ${routePath}: active library overflow ${activeOverflow}px`);
    await page.screenshot({
      path: path.join(evidenceDir, 'screenshots', `${screenshotPrefix}-player-active.png`),
      fullPage: false,
      animations: 'disabled'
    });

    await page.getByRole('button', { name: 'Collection intro' }).click();
    await page.waitForURL((url) => url.hash === '');
    await introHeading.waitFor({ state: 'visible' });
    assert.equal(await libraryHeading.count(), 0, `${profile.name} ${routePath}: intro button did not replace library`);

    assert.deepEqual(consoleErrors, [], `${profile.name} ${routePath}: console errors detected`);
    assert.deepEqual(pageErrors, [], `${profile.name} ${routePath}: page errors detected`);
    assert.deepEqual(failedRequests, [], `${profile.name} ${routePath}: request failures detected`);

    return {
      status: 'passed',
      profile: profile.name,
      engine: profile.engine,
      routePath,
      heroAssets,
      sharedUrl,
      introOverflow,
      idleOverflow,
      activeOverflow,
      activePlayer: {
        position: playerPosition,
        x: playerBox.x,
        y: playerBox.y,
        width: playerBox.width,
        height: playerBox.height
      },
      consoleErrors,
      pageErrors,
      failedRequests,
      ignoredFailures
    };
  } catch (error) {
    await page
      .screenshot({
        path: path.join(evidenceDir, 'screenshots', `${screenshotPrefix}-failure.png`),
        fullPage: false,
        animations: 'disabled'
      })
      .catch(() => undefined);
    throw error;
  } finally {
    await page.close();
  }
}

async function verifyHeroAssets(page, hero) {
  await hero.waitFor({ state: 'visible' });
  const backgroundImage = await hero.evaluate(
    (element) => getComputedStyle(element).backgroundImage
  );
  const urls = [...backgroundImage.matchAll(/url\((?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\)/g)]
    .map((match) => match[1] || match[2] || match[3])
    .filter(Boolean)
    .map((url) => new URL(url, page.url()).toString());

  assert(urls.length > 0, `No hero background image URL found in: ${backgroundImage}`);

  const results = [];
  for (const url of urls) {
    const result = await page.evaluate(
      (source) =>
        new Promise((resolve) => {
          const image = new Image();
          const timer = window.setTimeout(
            () => resolve({ ok: false, source, reason: 'timeout', naturalWidth: 0, naturalHeight: 0 }),
            15000
          );
          image.onload = () => {
            window.clearTimeout(timer);
            resolve({
              ok: image.naturalWidth > 0 && image.naturalHeight > 0,
              source,
              reason: null,
              naturalWidth: image.naturalWidth,
              naturalHeight: image.naturalHeight
            });
          };
          image.onerror = () => {
            window.clearTimeout(timer);
            resolve({ ok: false, source, reason: 'error', naturalWidth: 0, naturalHeight: 0 });
          };
          image.src = source;
        }),
      url
    );
    assert(result.ok, `Hero image failed to load: ${url} (${result.reason})`);
    results.push(result);
  }

  return { backgroundImage, images: results };
}

async function horizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

function withoutDefaultBrowserType(device) {
  const contextOptions = { ...device };
  delete contextOptions.defaultBrowserType;
  return contextOptions;
}

function silentWav() {
  const sampleRate = 8000;
  const seconds = 0.35;
  const dataSize = Math.floor(sampleRate * seconds);
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  buffer.fill(128, 44);
  return buffer;
}

async function persistAudit() {
  await writeFile(
    path.join(evidenceDir, 'browser-audit.json'),
    `${JSON.stringify(audit, null, 2)}\n`
  );
}
