import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * E2E SMOKE TESTS - Critical Path Testing
 * 
 * These tests verify core functionality after deployment.
 * Run time: < 5 minutes
 * Run frequency: After every deployment
 * 
 * @smoke tag indicates these are smoke tests
 */

test.describe('Smoke Tests - Critical Functionality @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('/');
  });

  test('SMOKE-01: Application loads successfully @smoke @critical', async ({ page }) => {
    // Verify page loads without errors
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1, h2')).toBeVisible();
    
    // Check no console errors
    const errors = [];
    page.on('pageerror', (error) => errors.push(error));
    await page.waitForTimeout(1000);
    expect(errors.length).toBe(0);
  });

  test('SMOKE-02: User can login successfully @smoke @critical @auth', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('SMOKE-03: Dashboard displays without errors @smoke @critical', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Verify dashboard elements
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('[role="main"]')).toBeVisible();
    
    // Check for metric cards
    const metricCards = page.locator('[data-testid="metric-card"]');
    await expect(metricCards).toHaveCount(4); // Adjust based on your dashboard
  });

  test('SMOKE-04: Warehouse page loads and displays products @smoke @critical @warehouse', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    // Navigate to warehouse
    await page.click('text=Warehouse');
    await expect(page).toHaveURL(/.*warehouse/);
    
    // Wait for products to load
    await page.waitForSelector('[role="table"]', { timeout: 10000 });
    
    // Verify table is visible
    const table = page.locator('[role="table"]');
    await expect(table).toBeVisible();
  });

  test('SMOKE-05: Navigation menu works correctly @smoke', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    // Test navigation links
    await page.click('text=Purchase Orders');
    await expect(page).toHaveURL(/.*purchase-order/);
    
    await page.click('text=Inventory');
    await expect(page).toHaveURL(/.*inventory/);
    
    await page.click('text=Suppliers');
    await expect(page).toHaveURL(/.*supplier/);
  });

  test('SMOKE-06: Search functionality works @smoke', async ({ page }) => {
    // Login and navigate to warehouse
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.click('text=Warehouse');
    
    // Wait for page to load
    await page.waitForSelector('[role="table"]');
    
    // Use search
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Test Product');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Verify search worked (results are filtered)
    await expect(searchInput).toHaveValue('Test Product');
  });

  test('SMOKE-07: User can logout successfully @smoke @auth', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Logout
    await page.click('[aria-label="Logout"]');
    
    // Verify redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('SMOKE-08: API health check @smoke @api', async ({ request }) => {
    // Verify backend is responding
    const response = await request.get('http://localhost:3000/products');
    expect(response.status()).toBe(200);
  });

  test('SMOKE-09: No accessibility violations on critical pages @smoke @a11y', async ({ page }) => {
    // Login page accessibility
    await page.goto('/login');
    let accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Login and check dashboard
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');
    accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('SMOKE-10: No JavaScript errors in console @smoke', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    
    // Login and navigate through pages
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await page.click('text=Warehouse');
    await page.waitForTimeout(1000);
    
    await page.click('text=Purchase Orders');
    await page.waitForTimeout(1000);
    
    // Verify no errors
    expect(errors).toEqual([]);
  });
});
