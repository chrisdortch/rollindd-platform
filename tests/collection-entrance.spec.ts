import { expect, test } from '@playwright/test';

test('collection entrance communicates its identity and shares a clean route', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        (
          window as typeof window & {
            __rollinddShared?: ShareData;
          }
        ).__rollinddShared = data;
      }
    });
  });
  await page.route(/\.(?:mp3|mp4|m4a|wav)(?:\?.*)?$/i, (route) => route.abort());

  const response = await page.goto('/?temporary=do-not-share', {
    waitUntil: 'domcontentloaded'
  });
  expect(response?.ok()).toBeTruthy();

  const entrance = page.getByRole('region', {
    name: 'RollinDD collection introduction'
  });
  await expect(
    entrance.getByRole('heading', { name: 'RollinDD', level: 1 })
  ).toBeVisible();
  await expect(
    entrance.getByText(
      'Fearlessness, love, wisdom, patience, collaboration, competition, and luminous resilience.'
    )
  ).toBeVisible();
  await expect(
    entrance.getByRole('link', { name: 'Enter the collection' })
  ).toHaveAttribute('href', '#tracks');
  await expect(page.locator('#tracks')).toBeAttached();

  await entrance.getByRole('button', { name: 'Share collection' }).click();
  await expect(entrance.getByRole('status')).toHaveText('Share complete');

  const shareData = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __rollinddShared?: ShareData;
        }
      ).__rollinddShared
  );
  expect(shareData?.title).toBe('RollinDD');
  expect(shareData?.text).toContain('Fearlessness');

  const sharedUrl = new URL(String(shareData?.url));
  expect(sharedUrl.pathname).toBe('/');
  expect(sharedUrl.search).toBe('');
  expect(sharedUrl.hash).toBe('');
});
