import { chromium, expect } from '@playwright/test';

const url = process.env.DEPLOYED_URL;
if (!url || new URL(url).protocol !== 'https:') throw new Error('DEPLOYED_URL must be an HTTPS URL');
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await expect.poll(async () => (await context.request.get(url)).status(), { timeout: 120_000, intervals: [2000, 5000] }).toBe(200);
  const target = new URL(url);
  target.searchParams.set('deployment', process.env.GITHUB_SHA || Date.now().toString());
  const response = await page.goto(target.href, { waitUntil: 'networkidle', timeout: 60_000 });
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle('JLK Wallpaper Studio');
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Shapes', exact: true }).click();
  await page.getByRole('button', { name: 'Add Diamond', exact: true }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Play animation', exact: true }).click();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('jlk-wallpaper-autosave-v1')).doc);
  await expect.poll(async () => (await saved()).animation.playing).toBe(true);
  const before = await saved();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Play animation', exact: true })).toBeVisible();
  await expect.poll(saved).toEqual({ ...before, animation: { ...before.animation, playing: false } });
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.screenshot({ path: 'live-iphone.png' });
  expect(errors).toEqual([]);
  console.log(`Verified public site ${url}: HTTP 200, rendered canvas, shape editing, complete artwork recovery with playback paused, zero runtime/console errors.`);
} finally { await browser.close(); }
