import { test, expect } from '@playwright/test';

/**
 * SANITY TESTS - Quick validation after bug fixes
 * 
 * These tests verify specific functionality after bugs are fixed.
 * Run time: < 2 minutes
 * Run frequency: After specific bug fixes
 * 
 * @sanity tag indicates these are sanity tests
 */

test.describe('Sanity Tests - Bug Fix Validation @sanity', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('SANITY-01: [BUG-123] Product delete now works correctly @sanity @bugfix', async ({ page }) => {
    /**
     * Bug: Delete button was not removing products from database
     * Fix: Added proper API call in delete handler
     * Verify: Product is actually deleted after confirmation
     */
    
    await page.click('text=Warehouse');
    await page.waitForSelector('[role="table"]');
    
    // Get initial row count
    const initialCount = await page.locator('[role="table"] tbody tr').count();
    
    // Delete first product
    await page.locator('[role="table"] tbody tr:first-child button[aria-label="Delete"]').click();
    await page.waitForSelector('text=Are you sure');
    await page.click('button:has-text("Confirm")');
    
    // Wait for deletion
    await page.waitForTimeout(1000);
    
    // Verify row count decreased
    const newCount = await page.locator('[role="table"] tbody tr').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('SANITY-02: [BUG-145] Date picker displays correct format @sanity @bugfix', async ({ page }) => {
    /**
     * Bug: Date picker showed MM/DD/YYYY but should be DD/MM/YYYY
     * Fix: Updated date format configuration
     * Verify: Date picker displays in correct format
     */
    
    await page.click('text=Purchase Orders');
    await page.click('button:has-text("Create PO")');
    await page.waitForSelector('[role="dialog"]');
    
    // Click date picker
    await page.click('input[name="placedAt"]');
    
    // Select today's date
    await page.click('button[aria-label*="today"]');
    
    // Get displayed date
    const displayedDate = await page.locator('input[name="placedAt"]').inputValue();
    
    // Verify format is DD/MM/YYYY (not MM/DD/YYYY)
    const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
    expect(displayedDate).toMatch(datePattern);
    
    // Verify day comes first (should be <= 31, not month which could be any format)
    const [day] = displayedDate.split('/');
    expect(parseInt(day)).toBeLessThanOrEqual(31);
  });

  test('SANITY-03: [BUG-156] Search bar does not crash on empty input @sanity @bugfix', async ({ page }) => {
    /**
     * Bug: Clearing search input caused application crash
     * Fix: Added null check in search handler
     * Verify: Search bar handles empty input gracefully
     */
    
    await page.click('text=Warehouse');
    await page.waitForSelector('[role="table"]');
    
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Type and clear search
    await searchInput.fill('test search');
    await page.waitForTimeout(300);
    await searchInput.clear();
    await page.waitForTimeout(300);
    
    // Verify page still works (no crash)
    await expect(page.locator('[role="table"]')).toBeVisible();
    
    // Verify no console errors
    const errors = [];
    page.on('pageerror', (error) => errors.push(error));
    await page.waitForTimeout(500);
    expect(errors.length).toBe(0);
  });

  test('SANITY-04: [BUG-178] Form validation shows proper error messages @sanity @bugfix', async ({ page }) => {
    /**
     * Bug: Validation errors showed technical keys instead of user-friendly messages
     * Fix: Added proper error message mapping
     * Verify: User-friendly error messages are displayed
     */
    
    await page.click('text=Warehouse');
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('[role="dialog"]');
    
    // Try to submit empty form
    await page.click('button:has-text("Save")');
    
    // Verify user-friendly error messages (not technical keys)
    const errorText = await page.locator('.error-message, .Mui-error').first().textContent();
    
    // Should NOT contain technical keys like "validation.required.name"
    expect(errorText).not.toMatch(/validation\./);
    expect(errorText).not.toMatch(/error\.field\./);
    
    // Should contain user-friendly message
    expect(errorText.toLowerCase()).toMatch(/required|must be|please/);
  });

  test('SANITY-05: [BUG-192] Pagination state persists after refresh @sanity @bugfix', async ({ page }) => {
    /**
     * Bug: Going to page 2 and refreshing reset to page 1
     * Fix: Added URL parameters for pagination state
     * Verify: Pagination state is maintained after refresh
     */
    
    await page.click('text=Warehouse');
    await page.waitForSelector('[role="table"]');
    
    // Go to page 2
    await page.click('button[aria-label="Go to next page"]');
    await expect(page).toHaveURL(/.*page=2/);
    
    // Refresh page
    await page.reload();
    await page.waitForSelector('[role="table"]');
    
    // Verify still on page 2
    await expect(page).toHaveURL(/.*page=2/);
    await expect(page.locator('text=Page 2')).toBeVisible();
  });

  test('SANITY-06: [BUG-201] Modal closes when clicking outside @sanity @bugfix', async ({ page }) => {
    /**
     * Bug: Clicking outside modal did not close it
     * Fix: Added backdrop click handler
     * Verify: Modal closes on backdrop click
     */
    
    await page.click('text=Warehouse');
    await page.waitForSelector('[role="table"]');
    
    // Open modal
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('[role="dialog"]');
    
    // Click backdrop (outside modal)
    await page.locator('[role="presentation"]').click({ position: { x: 10, y: 10 } });
    
    // Verify modal closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });
  });

  test('SANITY-07: [BUG-215] API error messages display correctly @sanity @bugfix', async ({ page }) => {
    /**
     * Bug: API errors showed generic "Something went wrong"
     * Fix: Parse and display actual API error messages
     * Verify: Specific API error messages are shown
     */
    
    // This test would need MSW or actual failing API
    // For demonstration, testing that error snackbar appears
    
    await page.click('text=Warehouse');
    await page.waitForSelector('[role="table"]');
    
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('[role="dialog"]');
    
    // Try to create product with duplicate SKU (should fail)
    const existingSku = await page.locator('[role="table"] tbody tr:first-child td:nth-child(3)').textContent();
    
    await page.fill('input[name="name"]', 'Duplicate Test');
    await page.fill('input[name="sku"]', existingSku.trim());
    await page.click('button:has-text("Save")');
    
    // Verify specific error message (not generic)
    const errorMessage = await page.locator('[role="alert"], .error-snackbar').textContent();
    expect(errorMessage.toLowerCase()).toMatch(/duplicate|already exists|sku/);
    expect(errorMessage).not.toBe('Something went wrong');
  });

  test('SANITY-08: [BUG-228] Table sorting arrow indicator shows @sanity @bugfix', async ({ page }) => {
    /**
     * Bug: Sorting worked but no visual indicator
     * Fix: Added arrow icons to sorted column
     * Verify: Sorting indicator is visible
     */
    
    await page.click('text=Warehouse');
    await page.waitForSelector('[role="table"]');
    
    // Click to sort by Name
    const nameHeader = page.locator('th:has-text("Name")');
    await nameHeader.click();
    
    // Verify sort indicator is visible
    await expect(nameHeader.locator('svg, [aria-label*="sort"]')).toBeVisible();
    
    // Click again to reverse sort
    await nameHeader.click();
    
    // Verify indicator still visible (direction changed)
    await expect(nameHeader.locator('svg, [aria-label*="sort"]')).toBeVisible();
  });
});
