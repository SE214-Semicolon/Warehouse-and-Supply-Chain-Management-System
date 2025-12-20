import { test, expect } from '@playwright/test';

/**
 * E2E WAREHOUSE TESTS - Full User Journeys
 * 
 * These tests cover complete warehouse management workflows.
 * Tagged for different test types: @regression, @smoke, @sanity
 * 
 * Testing Design Techniques:
 * - Happy Path Testing
 * - Decision Table Testing
 * - Error Guessing
 */

test.describe('Warehouse Management E2E @regression @warehouse', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to warehouse
    await page.click('text=Warehouse');
    await page.waitForURL(/.*warehouse/);
    await page.waitForSelector('[role="table"]');
  });

  // Happy Path - Complete CRUD workflow
  test('E2E-WH-01: Complete product lifecycle (Create → Read → Update → Delete) @regression @crud', async ({ page }) => {
    const productName = `E2E Product ${Date.now()}`;
    const sku = `SKU-E2E-${Date.now()}`;
    
    // CREATE: Add new product
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('[role="dialog"]');
    
    await page.fill('input[name="name"]', productName);
    await page.fill('input[name="sku"]', sku);
    await page.fill('textarea[name="description"]', 'E2E test product description');
    
    // Select category
    await page.click('input[name="categoryId"]');
    await page.click('li:has-text("Category 1")');
    
    await page.click('button:has-text("Save")');
    
    // Verify product created
    await expect(page.locator(`text=${productName}`)).toBeVisible({ timeout: 5000 });
    
    // READ: View product details
    const row = page.locator(`tr:has-text("${productName}")`);
    await row.locator('button[aria-label="View"]').click();
    
    await page.waitForSelector('[role="dialog"]');
    await expect(page.locator(`text=${productName}`)).toBeVisible();
    await expect(page.locator(`text=${sku}`)).toBeVisible();
    
    // Close view dialog
    await page.click('button:has-text("Close")');
    
    // UPDATE: Edit product
    await row.locator('button[aria-label="Edit"]').click();
    await page.waitForSelector('[role="dialog"]');
    
    const updatedName = `${productName} - Updated`;
    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill(updatedName);
    
    await page.click('button:has-text("Save")');
    
    // Verify update
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 5000 });
    
    // DELETE: Remove product
    const updatedRow = page.locator(`tr:has-text("${updatedName}")`);
    await updatedRow.locator('button[aria-label="Delete"]').click();
    
    // Confirm deletion
    await page.waitForSelector('text=Are you sure');
    await page.click('button:has-text("Confirm")');
    
    // Verify deletion
    await expect(page.locator(`text=${updatedName}`)).not.toBeVisible({ timeout: 5000 });
  });

  test('E2E-WH-02: Search and filter products @regression', async ({ page }) => {
    // Search by product name
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Test Product');
    
    await page.waitForTimeout(500);
    
    // Verify search results
    await expect(page.locator('text=Test Product')).toBeVisible();
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    // Apply filter
    await page.click('button:has-text("Filter")');
    await page.check('input[type="checkbox"][value="cat-1"]');
    await page.click('button:has-text("Apply")');
    
    // Verify filtered results
    await expect(page.locator('[role="table"] tbody tr')).toHaveCount(2, { timeout: 5000 });
  });

  test('E2E-WH-03: Pagination works correctly @regression', async ({ page }) => {
    // Verify first page
    await expect(page.locator('text=Page 1')).toBeVisible();
    
    // Go to next page
    await page.click('button[aria-label="Go to next page"]');
    
    // Verify page 2
    await expect(page.locator('text=Page 2')).toBeVisible();
    
    // Go back to previous page
    await page.click('button[aria-label="Go to previous page"]');
    
    // Verify back to page 1
    await expect(page.locator('text=Page 1')).toBeVisible();
  });

  test('E2E-WH-04: Sort products by column @regression', async ({ page }) => {
    // Click on Name column header to sort
    await page.click('th:has-text("Name")');
    
    // Wait for sort to apply
    await page.waitForTimeout(500);
    
    // Get first row product name
    const firstProduct = await page.locator('[role="table"] tbody tr:first-child td:nth-child(2)').textContent();
    
    // Click again to reverse sort
    await page.click('th:has-text("Name")');
    await page.waitForTimeout(500);
    
    // Verify sort order changed
    const firstProductReverse = await page.locator('[role="table"] tbody tr:first-child td:nth-child(2)').textContent();
    expect(firstProduct).not.toBe(firstProductReverse);
  });

  // Error Guessing - Validation and Error Handling
  test('E2E-WH-05: Form validation prevents invalid product creation @regression @validation', async ({ page }) => {
    // Try to create product without required fields
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('[role="dialog"]');
    
    // Click save without filling fields
    await page.click('button:has-text("Save")');
    
    // Verify validation errors
    await expect(page.locator('text=required|Required')).toBeVisible();
    
    // Fill only name (missing SKU)
    await page.fill('input[name="name"]', 'Invalid Product');
    await page.click('button:has-text("Save")');
    
    // Verify SKU validation error
    await expect(page.locator('text=SKU is required')).toBeVisible();
  });

  test('E2E-WH-06: Duplicate SKU validation @regression @validation', async ({ page }) => {
    // Get existing SKU from table
    const existingSku = await page.locator('[role="table"] tbody tr:first-child td:nth-child(3)').textContent();
    
    // Try to create product with duplicate SKU
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('[role="dialog"]');
    
    await page.fill('input[name="name"]', 'Duplicate SKU Product');
    await page.fill('input[name="sku"]', existingSku.trim());
    await page.fill('textarea[name="description"]', 'Test');
    
    await page.click('button:has-text("Save")');
    
    // Verify error message
    await expect(page.locator('text=SKU already exists|duplicate')).toBeVisible({ timeout: 5000 });
  });

  test('E2E-WH-07: Cancel button closes dialog without saving @regression', async ({ page }) => {
    // Open create dialog
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('[role="dialog"]');
    
    // Fill some data
    await page.fill('input[name="name"]', 'Should Not Save');
    await page.fill('input[name="sku"]', 'SHOULD-NOT-SAVE');
    
    // Click cancel
    await page.click('button:has-text("Cancel")');
    
    // Verify dialog closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // Verify product was not created
    await expect(page.locator('text=Should Not Save')).not.toBeVisible();
  });

  // Decision Table - Role-based permissions
  test('E2E-WH-08: Manager can create and edit but not delete @regression @permissions', async ({ page }) => {
    // Logout and login as manager
    await page.click('[aria-label="Logout"]');
    await page.waitForURL('/login');
    
    await page.fill('input[name="email"]', 'manager@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await page.click('text=Warehouse');
    await page.waitForSelector('[role="table"]');
    
    // Manager can see Add button
    await expect(page.locator('button:has-text("Add Product")')).toBeVisible();
    
    // Manager can see Edit button
    await expect(page.locator('button[aria-label="Edit"]').first()).toBeVisible();
    
    // Manager cannot see Delete button
    await expect(page.locator('button[aria-label="Delete"]')).not.toBeVisible();
  });

  // Boundary Value Analysis
  test('E2E-WH-09: Handle very long product names @regression @bva', async ({ page }) => {
    const longName = 'A'.repeat(255); // Maximum length
    
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('[role="dialog"]');
    
    await page.fill('input[name="name"]', longName);
    await page.fill('input[name="sku"]', `SKU-LONG-${Date.now()}`);
    await page.fill('textarea[name="description"]', 'Long name test');
    
    await page.click('button:has-text("Save")');
    
    // Verify product created with truncated display
    await expect(page.locator(`text=${longName.substring(0, 50)}`)).toBeVisible({ timeout: 5000 });
  });

  test('E2E-WH-10: Export products list @regression', async ({ page }) => {
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/products.*\.(csv|xlsx)/);
  });
});

test.describe('Warehouse Product Detail Page @regression', () => {
  test('E2E-WH-11: Navigate to product detail page @regression', async ({ page }) => {
    // Login and navigate to warehouse
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await page.click('text=Warehouse');
    await page.waitForSelector('[role="table"]');
    
    // Click on first product row
    await page.locator('[role="table"] tbody tr:first-child').click();
    
    // Verify navigation to detail page
    await expect(page).toHaveURL(/.*warehouse\/product\/.+/);
    
    // Verify product details displayed
    await expect(page.locator('h1, h2')).toBeVisible();
    await expect(page.locator('text=SKU')).toBeVisible();
    await expect(page.locator('text=Category')).toBeVisible();
  });
});
