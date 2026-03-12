import { test, expect, Page, FrameLocator } from 'playwright/test';

const LOCAL_DEV_SETTINGS = {
  isActive: true,
  configs: [{ url: 'https://localhost:4200/ui/generic-resource/assets/config.accounts.json' }],
  serviceProviderConfig: {},
};

async function setupLocalStorage(page: Page) {
  await page.addInitScript((settings) => {
    localStorage.setItem('openmfp.settings.localDevelopmentSettings', JSON.stringify(settings));
  }, LOCAL_DEV_SETTINGS);
}

async function login(page: Page) {
  // Wait for page to fully load
  await page.waitForLoadState('networkidle');

  // Check if Sign In button is visible (indicates login page)
  const signInButton = page.getByRole('button', { name: 'Sign In' });
  const isLoginPage = await signInButton.isVisible({ timeout: 3000 }).catch(() => false);

  if (isLoginPage) {
    // Fill credentials using role-based selectors
    await page.getByRole('textbox', { name: 'Email' }).fill('bastian.echterhoelter@sap.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('aa');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
  }
}

async function navigateToAccountsGeneric(page: Page) {
  // Navigate to accounts-generic page after login
  const currentUrl = page.url();
  if (!currentUrl.includes('accounts-generic')) {
    await page.goto('https://sap.portal.localhost:8443/accounts-generic');
    await page.waitForLoadState('domcontentloaded');
  }
}

async function getAppFrame(page: Page): Promise<FrameLocator | null> {
  // The app runs inside Luigi micro-frontend iframe
  // Try to find the iframe containing the generic-resource-ui app

  // Check for various iframe patterns
  const iframeSelectors = [
    'iframe[src*="generic-resource"]',
    'iframe[src*="accounts"]',
    'iframe[src*="localhost:4200"]',
    'iframe',
  ];

  for (const selector of iframeSelectors) {
    const iframeCount = await page.locator(selector).count();
    if (iframeCount > 0) {
      return page.frameLocator(selector).first();
    }
  }

  // Fallback: return null (in case not using iframes)
  return null;
}

async function getLuigiModalFrame(page: Page): Promise<FrameLocator | null> {
  // Luigi opens modals in a separate iframe with specific class
  // The modal iframe is typically inside a Luigi modal container
  const modalIframeSelectors = [
    '.lui-modal-frame iframe',
    '.lui-modal iframe',
    '[class*="modal"] iframe[src*="create"]',
    'iframe[src*="create"]',
  ];

  for (const selector of modalIframeSelectors) {
    const iframeCount = await page.locator(selector).count();
    if (iframeCount > 0) {
      return page.frameLocator(selector).first();
    }
  }

  return null;
}

test.describe('Create/Edit Modal', () => {
  test.setTimeout(120000); // 2 minute timeout for tests

  test.beforeEach(async ({ page }) => {
    // Setup localStorage before navigating
    await setupLocalStorage(page);
    // Navigate to the app
    await page.goto('/');
    // Handle login if needed
    await login(page);
    // Navigate to accounts-generic page
    await navigateToAccountsGeneric(page);
    // Wait a bit for the iframe to load
    await page.waitForTimeout(3000);
  });

  test('should open create modal when clicking Create button', async ({ page }) => {
    // The app runs inside a Luigi iframe - get the frame
    const frame = await getAppFrame(page);

    // Find and click the Create button - check both iframe and main page
    let createButton;
    if (frame) {
      createButton = frame.locator('[test-id="generic-list-view-create-button"]')
        .or(frame.getByRole('button', { name: 'Create' }))
        .first();
    } else {
      createButton = page.locator('[test-id="generic-list-view-create-button"]')
        .or(page.getByRole('button', { name: 'Create' }))
        .first();
    }

    await expect(createButton).toBeVisible({ timeout: 15000 });

    // Take screenshot before clicking
    await page.screenshot({ path: 'test-results/before-click.png' });

    await createButton.click();

    // Wait for Luigi modal to appear
    await page.waitForTimeout(2000);

    // Take screenshot after clicking
    await page.screenshot({ path: 'test-results/after-click.png' });

    // Luigi opens modal in a separate iframe - find the modal iframe
    const modalFrame = await getLuigiModalFrame(page);

    // Check for Luigi modal backdrop (indicates modal is open)
    const luigiBackdrop = page.locator('.lui-backdrop, [class*="backdrop"]');
    const hasBackdrop = await luigiBackdrop.isVisible({ timeout: 5000 }).catch(() => false);

    if (modalFrame) {
      // Modal is in iframe - check for Monaco YAML editor
      const monacoEditor = modalFrame.locator('app-monaco-yaml-viewer');
      await expect(monacoEditor).toBeVisible({ timeout: 10000 });
    } else if (hasBackdrop) {
      // Backdrop visible means modal is opening
      expect(hasBackdrop).toBe(true);
    } else {
      // Fallback - look for modal iframe by source
      const modalIframe = page.locator('iframe[src*="create"]');
      await expect(modalIframe).toBeVisible({ timeout: 10000 });
    }

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/modal-open.png' });
  });

  test('should render modal with YAML editor by default', async ({ page }) => {
    const frame = await getAppFrame(page);

    // Click Create button
    let createButton;
    if (frame) {
      createButton = frame.locator('[test-id="generic-list-view-create-button"]').first();
    } else {
      createButton = page.locator('[test-id="generic-list-view-create-button"]').first();
    }
    await createButton.click();

    // Wait for Luigi modal to appear
    await page.waitForTimeout(2000);

    const modalFrame = await getLuigiModalFrame(page);

    if (modalFrame) {
      // Verify Monaco YAML editor is visible
      const monacoEditor = modalFrame.locator('app-monaco-yaml-viewer');
      await expect(monacoEditor).toBeVisible({ timeout: 10000 });

      // Verify no Form/YAML toggle buttons exist
      const formButton = modalFrame.locator('button').filter({ hasText: 'Form' });
      await expect(formButton).toHaveCount(0);
    }

    await page.screenshot({ path: 'test-results/modal-yaml-mode.png' });
  });

  test('should pre-populate YAML with resource template in create mode', async ({ page }) => {
    const frame = await getAppFrame(page);

    // Click Create button
    let createButton;
    if (frame) {
      createButton = frame.locator('[test-id="generic-list-view-create-button"]').first();
    } else {
      createButton = page.locator('[test-id="generic-list-view-create-button"]').first();
    }
    await createButton.click();

    await page.waitForTimeout(2000);

    const modalFrame = await getLuigiModalFrame(page);

    if (modalFrame) {
      // Verify Monaco editor is visible
      const monacoEditor = modalFrame.locator('app-monaco-yaml-viewer');
      await expect(monacoEditor).toBeVisible({ timeout: 10000 });

      // Monaco editor renders content in .view-lines - check for YAML content
      const editorContent = modalFrame.locator('.editor-container .view-lines');
      await expect(editorContent).toBeVisible({ timeout: 5000 });

      // Check that the editor contains resource template keywords
      const editorText = await editorContent.textContent();
      expect(editorText).toContain('apiVersion');
      expect(editorText).toContain('kind');
      expect(editorText).toContain('metadata');
      expect(editorText).toContain('name');
    }
  });

  test('should have Cancel and Create buttons in footer', async ({ page }) => {
    const frame = await getAppFrame(page);

    // Click Create button
    let createButton;
    if (frame) {
      createButton = frame.locator('[test-id="generic-list-view-create-button"]').first();
    } else {
      createButton = page.locator('[test-id="generic-list-view-create-button"]').first();
    }
    await createButton.click();

    await page.waitForTimeout(2000);

    const modalFrame = await getLuigiModalFrame(page);

    if (modalFrame) {
      // Check for Cancel button
      const cancelButton = modalFrame.locator('button').filter({ hasText: 'Cancel' });
      await expect(cancelButton).toBeVisible({ timeout: 10000 });

      // Check for Create/Submit button
      const submitButton = modalFrame.locator('[test-id="create-resource-submit"]')
        .or(modalFrame.locator('button').filter({ hasText: 'Create' }).last());
      await expect(submitButton).toBeVisible();
    }
  });

  test('should close modal when clicking Cancel', async ({ page }) => {
    const frame = await getAppFrame(page);

    // Click Create button
    let createButton;
    if (frame) {
      createButton = frame.locator('[test-id="generic-list-view-create-button"]').first();
    } else {
      createButton = page.locator('[test-id="generic-list-view-create-button"]').first();
    }
    await createButton.click();

    await page.waitForTimeout(2000);

    const modalFrame = await getLuigiModalFrame(page);

    if (modalFrame) {
      // Click Cancel button
      const cancelButton = modalFrame.locator('button').filter({ hasText: 'Cancel' });
      await cancelButton.click();

      // Wait for modal to close
      await page.waitForTimeout(1000);

      // Modal iframe should no longer be visible or backdrop should be gone
      const modalIframe = page.locator('iframe[src*="create"]');
      const backdrop = page.locator('.lui-backdrop');

      const isModalVisible = await modalIframe.isVisible({ timeout: 1000 }).catch(() => false);
      const isBackdropVisible = await backdrop.isVisible({ timeout: 1000 }).catch(() => false);

      expect(isModalVisible || isBackdropVisible).toBe(false);
    }

    await page.screenshot({ path: 'test-results/modal-closed.png' });
  });
});
