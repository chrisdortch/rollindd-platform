import { expect, test } from '@playwright/test';
import { createVisualEvidenceRecorder } from './support/clover-visual-evidence';

test('listener can search, open words, and advance to the next production', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route(/\.(?:mp3|mp4|m4a|wav)(?:\?.*)?$/i, (route) => route.abort());

  const evidence = createVisualEvidenceRecorder(page, testInfo, {
    projectId: 'rollindd-platform',
    baseOrigin: 'http://127.0.0.1:3000'
  });
  let journeyCompleted = false;

  try {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/RollinDD/);
    await expect(page.getByRole('heading', { name: '7 Productions' })).toBeVisible();

    const noHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    );
    expect(noHorizontalOverflow).toBe(true);
    await evidence.capture('listener-home', { priority: 100 });

    const player = page.getByRole('region', { name: 'Player' });
    await page
      .getByRole('button', { name: 'Play I. The Essence of Fearlessness' })
      .first()
      .click();
    await expect(
      player.getByText('I. The Essence of Fearlessness', { exact: true })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Play next production' }).click();
    await expect(
      player.getByText('II. The Power of Love', { exact: true })
    ).toBeVisible();
    await evidence.capture('player-active', { priority: 90 });

    const search = page.getByPlaceholder('Keyword or "exact words"');
    await search.fill('"love for ourselves"');
    await expect(page.getByRole('heading', { name: '1 Matches' })).toBeVisible();
    await search.clear();

    await page
      .getByRole('button', { name: 'Open words for I. The Essence of Fearlessness' })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'Words for I. The Essence of Fearlessness'
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        'Fearlessness is not the absence of fear; it is the courage to face it.'
      )
    ).toBeVisible();
    await evidence.capture('words-dialog', { priority: 80 });

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
    journeyCompleted = true;
  } finally {
    const receipt = await evidence.finalize();
    if (journeyCompleted) expect(receipt.overallStatus).toBe('passed');
  }
});
