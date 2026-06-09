const { test, expect } = require('@playwright/test');
const { MOCK_LOCATION_HOME, MOCK_LOCATION_DEST, MOCK_TRAVEL_ACTIVE } = require('./helpers/mocks');
const { setupAuthenticatedSession } = require('./helpers/auth');

// All travel tests start from an authenticated session with no active travel.
test.beforeEach(async ({ page }) => {
  await setupAuthenticatedSession(page);
});

test.describe('World Areas page', () => {
  test('shows a card for every location returned by the API', async ({ page }) => {
    await page.route('**/api/world/locations', route =>
      route.fulfill({ json: { success: true, data: [MOCK_LOCATION_HOME, MOCK_LOCATION_DEST] } })
    );

    await page.goto('/world/areas');

    const cards = page.locator('.wa-card-name');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText('The Starting Village');
    await expect(cards.nth(1)).toContainText('The Dark Forest');
  });

  test('marks the starting location as "Here"', async ({ page }) => {
    await page.route('**/api/world/locations', route =>
      route.fulfill({ json: { success: true, data: [MOCK_LOCATION_HOME] } })
    );

    await page.goto('/world/areas');

    // The isStartingLocation card should show the "Here" badge
    await expect(page.locator('.wa-here-badge')).toBeVisible();
  });
});

test.describe('Area Forum page', () => {
  test.beforeEach(async ({ page }) => {
    // These mocks are needed by every test that opens an area forum page
    await page.route('**/api/world/locations/loc2', route =>
      route.fulfill({ json: { success: true, data: MOCK_LOCATION_DEST } })
    );
    await page.route(/\/api\/posts/, route =>
      route.fulfill({ json: { success: true, data: [], meta: { total: 0 } } })
    );
  });

  test('clicking a location card navigates to its area forum', async ({ page }) => {
    await page.route('**/api/world/locations', route =>
      route.fulfill({ json: { success: true, data: [MOCK_LOCATION_HOME, MOCK_LOCATION_DEST] } })
    );

    await page.goto('/world/areas');
    await page.locator('.wa-card', { hasText: 'The Dark Forest' }).click();

    await page.waitForURL('**/world/areas/loc2');
    await expect(page.locator('.af-banner-title')).toContainText('The Dark Forest');
  });

  test('shows the location lore and region name', async ({ page }) => {
    await page.goto('/world/areas/loc2');

    await expect(page.locator('.af-banner-title')).toContainText('The Dark Forest');
    await expect(page.locator('.af-banner-region')).toContainText('Heartlands');
  });

  test('TravelPanel shows "Travel here" button for a location the character is not at', async ({ page }) => {
    await page.goto('/world/areas/loc2');

    // MOCK_CHAR.currentLocation = null and MOCK_LOCATION_DEST.isStartingLocation = false
    // → character is not here → travel button is shown
    await expect(page.locator('.tp-go-btn')).toContainText('Travel here');
  });

  test('TravelPanel shows "You are here" for the starting location', async ({ page }) => {
    await page.route('**/api/world/locations/loc1', route =>
      route.fulfill({ json: { success: true, data: MOCK_LOCATION_HOME } })
    );

    await page.goto('/world/areas/loc1');

    // MOCK_CHAR.currentLocation = null and MOCK_LOCATION_HOME.isStartingLocation = true
    // → character IS here → "You are here" indicator shown
    await expect(page.locator('.tp-here-text')).toContainText('You are here');
  });
});

test.describe('Starting travel', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/world/locations/loc2', route =>
      route.fulfill({ json: { success: true, data: MOCK_LOCATION_DEST } })
    );
    await page.route(/\/api\/posts/, route =>
      route.fulfill({ json: { success: true, data: [], meta: { total: 0 } } })
    );
  });

  test('clicking Travel here calls POST /api/travel', async ({ page }) => {
    const travelRequests = [];
    await page.route('**/api/travel', async route => {
      if (route.request().method() === 'POST') {
        travelRequests.push(JSON.parse(route.request().postData()));
        await route.fulfill({ json: { success: true, data: MOCK_TRAVEL_ACTIVE } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/world/areas/loc2');
    await page.click('.tp-go-btn');

    await expect(page.locator('.tp-bar.tp-traveling')).toBeVisible();
    // Verify the correct location ID was sent in the request body
    expect(travelRequests[0]).toMatchObject({ toLocationId: 'loc2' });
  });

  test('TravelPanel shows countdown after travel starts', async ({ page }) => {
    await page.route('**/api/travel', route =>
      route.fulfill({ json: { success: true, data: MOCK_TRAVEL_ACTIVE } })
    );

    await page.goto('/world/areas/loc2');
    await page.click('.tp-go-btn');

    await expect(page.locator('.tp-traveling-label')).toContainText('Arriving in');
  });

  test('cancel button appears while traveling', async ({ page }) => {
    await page.route('**/api/travel', route =>
      route.fulfill({ json: { success: true, data: MOCK_TRAVEL_ACTIVE } })
    );

    await page.goto('/world/areas/loc2');
    await page.click('.tp-go-btn');

    await expect(page.locator('.tp-cancel-btn')).toBeVisible();
  });

  test('clicking Cancel sends DELETE /api/travel/cancel', async ({ page }) => {
    await page.route('**/api/travel', route =>
      route.fulfill({ json: { success: true, data: MOCK_TRAVEL_ACTIVE } })
    );

    let cancelCalled = false;
    await page.route('**/api/travel/cancel', route => {
      cancelCalled = true;
      route.fulfill({ json: { success: true } });
    });

    await page.goto('/world/areas/loc2');
    await page.click('.tp-go-btn');
    await expect(page.locator('.tp-cancel-btn')).toBeVisible();
    await page.click('.tp-cancel-btn');

    await expect(page.locator('.tp-go-btn')).toBeVisible(); // back to normal state
    expect(cancelCalled).toBe(true);
  });
});
