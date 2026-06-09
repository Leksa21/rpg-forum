const { MOCK_TOKEN, MOCK_USER, MOCK_CHAR } = require('./mocks');

// Injects the mock token into localStorage before every page load in this test.
// Must be called before page.goto().
async function injectToken(page) {
  await page.addInitScript(token => {
    window.localStorage.setItem('token', token);
  }, MOCK_TOKEN);
}

// Mocks all session-related API calls so tests can skip the login flow.
async function mockSessionAPIs(page) {
  await page.route('**/api/auth/me', route =>
    route.fulfill({ json: { success: true, data: MOCK_USER } })
  );
  await page.route('**/api/characters/me', route =>
    route.fulfill({ json: { success: true, data: MOCK_CHAR } })
  );
  await page.route('**/api/characters/all', route =>
    route.fulfill({ json: { success: true, data: [MOCK_CHAR] } })
  );
  await page.route('**/api/travel/active', route =>
    route.fulfill({ json: { success: true, data: null } })
  );
}

// Combined helper — call this in beforeEach for tests that need an authenticated session.
async function setupAuthenticatedSession(page) {
  await injectToken(page);
  await mockSessionAPIs(page);
}

module.exports = { injectToken, mockSessionAPIs, setupAuthenticatedSession };
