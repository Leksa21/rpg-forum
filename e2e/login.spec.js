const { test, expect } = require('@playwright/test');
const { MOCK_TOKEN, MOCK_USER, MOCK_CHAR } = require('./helpers/mocks');

// Registers all mocks needed after a successful login (APIs called when the
// app navigates away from the login page).
async function mockPostLoginAPIs(page) {
  await page.route('**/api/auth/login', route =>
    route.fulfill({ json: { success: true, data: { token: MOCK_TOKEN, user: MOCK_USER } } })
  );
  await page.route('**/api/characters/me', route =>
    route.fulfill({ json: { success: true, data: MOCK_CHAR } })
  );
  await page.route('**/api/characters/all', route =>
    route.fulfill({ json: { success: true, data: [MOCK_CHAR] } })
  );
  await page.route('**/api/auth/me', route =>
    route.fulfill({ json: { success: true, data: MOCK_USER } })
  );
}

test.describe('Login page', () => {
  test('renders the login form with email, password, and submit button', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h2')).toContainText('Enter the Realm');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows a validation error when the form is submitted empty', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');

    await expect(page.locator('.auth-alert-error')).toContainText('All fields are required');
  });

  test('shows an error message when credentials are invalid', async ({ page }) => {
    await page.route('**/api/auth/login', route =>
      route.fulfill({
        status: 401,
        json: { success: false, error: 'Invalid credentials' },
      })
    );

    await page.goto('/login');
    await page.fill('#email', 'wrong@test.com');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('.auth-alert-error')).toContainText('Invalid credentials');
  });

  test('shows loading state while request is in flight', async ({ page }) => {
    // Delay the response so we can catch the loading state
    await page.route('**/api/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({ json: { success: true, data: { token: MOCK_TOKEN, user: MOCK_USER } } });
    });
    await page.route('**/api/characters/me', route =>
      route.fulfill({ json: { success: true, data: MOCK_CHAR } })
    );

    await page.goto('/login');
    await page.fill('#email', 'test@test.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await expect(page.locator('button[type="submit"]')).toHaveText('Opening the gates…');
  });
});

test.describe('Login → Character Select flow', () => {
  test('redirects to /character-select after successful login', async ({ page }) => {
    await mockPostLoginAPIs(page);

    await page.goto('/login');
    await page.fill('#email', 'test@test.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/character-select');
    // Character name appears in the roster list
    await expect(page.locator('.csr-row-name')).toContainText('Aragorn');
  });

  test('clicking Enter the Realm on character-select navigates to /dashboard', async ({ page }) => {
    await mockPostLoginAPIs(page);

    await page.goto('/login');
    await page.fill('#email', 'test@test.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/character-select');

    // The living character is auto-selected — click the action button to enter
    await page.click('.csr-action-btn');
    await page.waitForURL('**/dashboard');

    await expect(page.locator('.db-hero-name')).toContainText('Aragorn');
  });

  test('links to /register page for new users', async ({ page }) => {
    await page.goto('/login');

    await page.click('text=Begin your legend');
    await page.waitForURL('**/register');
  });
});
