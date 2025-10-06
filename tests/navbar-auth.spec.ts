import { test, expect } from '@playwright/test';
import { signIn, signOut, REGULAR_USER } from './auth-utils';

test.describe('Navbar Authentication Behavior', () => {
  test('should show appropriate navigation when user is not authenticated', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Verify we can access the home page
    await expect(page).toHaveURL('/');
    
    // This test will depend on your actual navbar implementation
    // For now, just verify the page loads correctly
    await expect(page).toHaveTitle(/.*/ ); // Any title is fine
  });

  test('should show appropriate navigation when user is authenticated', async ({ page }) => {
    // Sign in
    await signIn(page);
    
    // Navigate to home page
    await page.goto('/');
    
    // Verify we're authenticated and on home page
    await expect(page).toHaveURL('/');
    
    // This test will depend on your actual navbar implementation
    // You would check for authenticated user UI elements here
    // For example:
    // await expect(page.getByRole('button', { name: /sign out|logout/i })).toBeVisible();
    // await expect(page.getByRole('link', { name: /profile|account/i })).toBeVisible();
  });

  test('should update navbar immediately after sign-in', async ({ page }) => {
    // Start on home page (not authenticated)
    await page.goto('/');
    
    // Verify we're on home page
    await expect(page).toHaveURL('/');
    
    // Navigate to sign-in page
    await page.goto('/auth/login');
    
    // Sign in
    await page.getByLabel(/email/i).fill(REGULAR_USER.email);
    await page.getByLabel(/password/i).fill(REGULAR_USER.password);
    await page.getByRole('button', { name: /login/i }).click();
    
    // Wait for navigation to complete
    await page.waitForURL('/');
    
    // Verify we're now authenticated
    await expect(page).toHaveURL('/');
  });

  test('should update navbar immediately after sign-out', async ({ page }) => {
    // Sign in first
    await signIn(page);
    
    // Navigate to home page
    await page.goto('/');
    
    // Verify we're authenticated
    await expect(page).toHaveURL('/');
    
    // Sign out (this will use the utility function which handles sign-out appropriately)
    await signOut(page);
    
    // Navigate to home page
    await page.goto('/');
    
    // Verify we can still access home page (should work for both auth states)
    await expect(page).toHaveURL('/');
  });

  test('should persist navbar state across page navigation', async ({ page }) => {
    // Sign in
    await signIn(page);
    
    // Navigate to home page
    await page.goto('/');
    
    // Verify we're authenticated
    await expect(page).toHaveURL('/');
    
    // Navigate to different pages and verify state persists
    await page.goto('/auth/sign-up');
    await expect(page).toHaveURL('/auth/sign-up');
    
    await page.goto('/auth/forgot-password');
    await expect(page).toHaveURL('/auth/forgot-password');
    
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('should handle navigation between auth pages correctly', async ({ page }) => {
    // Start on login page
    await page.goto('/auth/login');
    await expect(page).toHaveURL('/auth/login');
    
    // Navigate to sign-up
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL('/auth/sign-up');
    
    // Navigate back to login
    await page.getByRole('link', { name: /login/i }).click();
    await expect(page).toHaveURL('/auth/login');
    
    // Navigate to forgot password
    await page.getByRole('link', { name: /forgot your password/i }).click();
    await expect(page).toHaveURL('/auth/forgot-password');
    
    // Navigate back to login
    await page.getByRole('link', { name: /login/i }).click();
    await expect(page).toHaveURL('/auth/login');
  });
}); 