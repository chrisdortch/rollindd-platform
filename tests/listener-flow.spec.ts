import { expect, test } from '@playwright/test';

test('listener can search, open words, and advance to the next production', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/RollinDD/);
  await expect(page.getByRole('heading', { name: '7 Productions' })).toBeVisible();

  const noHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1
  );
  expect(noHorizontalOverflow).toBe(true);

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

  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
});
