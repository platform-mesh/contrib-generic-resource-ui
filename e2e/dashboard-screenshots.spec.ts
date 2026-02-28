import { test, Page } from 'playwright/test';
import * as fs from 'fs';

/**
 * Dashboard Visual Snapshot Tests
 *
 * Takes screenshots of the dashboard page in different states using the
 * serve-local configuration (mockGraphql: true). No real gateway needed.
 *
 * Run with: task screenshots:dashboard
 * Requires: ng serve --configuration=serve-local --serve-path=/ui/generic-resource
 */

const STANDALONE_BASE = 'https://localhost:4200/ui/generic-resource';
const SCREENSHOT_DIR = 'test-results/screenshots/dashboard';

async function waitForDashboardReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  // Wait for either cards to render or empty/error state
  await page
    .waitForSelector('.category-section, .dashboard-empty, .dashboard-error, .dashboard-loading', {
      timeout: 15000,
    })
    .catch(() => {});
  // Wait for cards to finish loading (busy indicator disappears)
  await page
    .waitForSelector('.category-section', { timeout: 10000 })
    .catch(() => {});
  // Let card data queries settle
  await page.waitForTimeout(2000);
}

test.describe('Dashboard Screenshots', () => {
  test.setTimeout(60000);

  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('01 - full dashboard view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${STANDALONE_BASE}/#/dashboard`);
    await waitForDashboardReady(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-dashboard-full.png`,
      fullPage: true,
    });
    console.log('Captured: 01-dashboard-full.png');
  });

  test('02 - dashboard at narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${STANDALONE_BASE}/#/dashboard`);
    await waitForDashboardReady(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-dashboard-narrow.png`,
      fullPage: true,
    });
    console.log('Captured: 02-dashboard-narrow.png');
  });

  test('03 - individual card close-ups', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${STANDALONE_BASE}/#/dashboard`);
    await waitForDashboardReady(page);

    // Screenshot each card individually
    const cards = page.locator('.card-wrapper');
    const count = await cards.count();
    console.log(`Found ${count} cards`);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      if (await card.isVisible()) {
        await card.screenshot({
          path: `${SCREENSHOT_DIR}/03-card-${String(i + 1).padStart(2, '0')}.png`,
        });
        console.log(`Captured: 03-card-${String(i + 1).padStart(2, '0')}.png`);
      }
    }
  });

  test('04 - card hover state with menu', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${STANDALONE_BASE}/#/dashboard`);
    await waitForDashboardReady(page);

    // Hover over the first card to reveal the action menu
    const firstCard = page.locator('.card-inner').first();
    if (await firstCard.isVisible()) {
      await firstCard.hover();
      await page.waitForTimeout(300);

      await firstCard.screenshot({
        path: `${SCREENSHOT_DIR}/04-card-hover.png`,
      });
      console.log('Captured: 04-card-hover.png');

      // Click the overflow menu button
      const menuBtn = firstCard.locator('.card-menu-trigger');
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `${SCREENSHOT_DIR}/04-card-menu-open.png`,
          fullPage: false,
        });
        console.log('Captured: 04-card-menu-open.png');
      }
    }
  });

  test('05 - category sections', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${STANDALONE_BASE}/#/dashboard`);
    await waitForDashboardReady(page);

    const sections = page.locator('.category-section');
    const sectionCount = await sections.count();
    console.log(`Found ${sectionCount} category sections`);

    for (let i = 0; i < sectionCount; i++) {
      const section = sections.nth(i);
      if (await section.isVisible()) {
        const title = await section.locator('.category-title').textContent().catch(() => `section-${i + 1}`);
        const safeName = (title ?? `section-${i + 1}`)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, '-')
          .substring(0, 30);

        await section.screenshot({
          path: `${SCREENSHOT_DIR}/05-section-${safeName}.png`,
        });
        console.log(`Captured: 05-section-${safeName}.png`);
      }
    }
  });
});
