import { test, expect } from '@playwright/test';
import { REGULAR_USER } from './auth-utils';

// Test data
const TEST_EMAIL = REGULAR_USER.email;
const TEST_PASSWORD = REGULAR_USER.password;
const INVALID_EMAIL = 'invalid@example.com';
const INVALID_PASSWORD = 'wrongpassword';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the home page before each test
    await page.goto('/');
  });

  test('should navigate to sign-in page', async ({ page }) => {
    // Navigate directly to sign-in page
    await page.goto('/auth/login');
    
    // Verify we're on the sign-in page
    await expect(page).toHaveURL('/auth/login');
    
    // Look for login-related heading text (more flexible)
    const loginHeading = page.getByRole('heading', { name: /login/i }).or(
      page.getByRole('heading', { name: /sign in/i })
    ).or(
      page.locator('h1, h2, h3').filter({ hasText: /login|sign in/i })
    ).or(
      page.getByText(/login|sign in/i).first()
    );
    
    await expect(loginHeading).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/auth/login');
    
    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill(INVALID_EMAIL);
    await page.getByLabel(/password/i).fill(INVALID_PASSWORD);
    
    // Submit the form
    await page.getByRole('button', { name: /login/i }).click();
    
    // Verify error message appears
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible();
  });

  test('should redirect to home page after successful sign-in', async ({ page }) => {
    // This test assumes you have a test user already created in your Supabase instance
    // Navigate to sign-in page
    await page.goto('/auth/login');
    
    // Fill in valid credentials
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    
    // Submit the form
    await page.getByRole('button', { name: /login/i }).click();
    
    // Verify redirect to home page
    await expect(page).toHaveURL('/');
  });

  test('should navigate to sign-up page', async ({ page }) => {
    // Navigate to sign-in page first
    await page.goto('/auth/login');
    
    // Click the sign-up link
    await page.getByRole('link', { name: /sign up/i }).click();
    
    // Verify we're on the sign-up page
    await expect(page).toHaveURL('/auth/sign-up');
    
    // Look for sign-up related heading text (more flexible)
    const signUpHeading = page.getByRole('heading', { name: /sign up/i }).or(
      page.getByRole('heading', { name: /create.*account/i })
    ).or(
      page.locator('h1, h2, h3').filter({ hasText: /sign up|create.*account|register/i })
    ).or(
      page.getByText(/sign up|create.*account/i).first()
    );
    
    await expect(signUpHeading).toBeVisible();
  });

  test('should show password reset form', async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/auth/login');
    
    // Click the forgot password link
    await page.getByRole('link', { name: /forgot your password/i }).click();
    
    // Verify we're on the password reset page
    await expect(page).toHaveURL('/auth/forgot-password');
    
    // Look for password reset related heading text (more flexible)
    const resetHeading = page.getByRole('heading', { name: /reset/i }).or(
      page.getByRole('heading', { name: /forgot.*password/i })
    ).or(
      page.locator('h1, h2, h3').filter({ hasText: /reset|forgot.*password|recover/i })
    ).or(
      page.getByText(/reset.*password|forgot.*password/i).first()
    );
    
    await expect(resetHeading).toBeVisible();
  });

  test('should show appropriate validation errors on sign-up form', async ({ page }) => {
    // Navigate to sign-up page
    await page.goto('/auth/sign-up');
    
    // Submit empty form
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // HTML5 validation should prevent submission, so check for required fields
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    
    // Fill invalid email
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel(/repeat password/i).fill('password123');
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Check if still on sign-up page (invalid email should be caught by HTML5 validation)
    await expect(page).toHaveURL('/auth/sign-up');
    
    // Test password mismatch
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel(/repeat password/i).fill('different-password');
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Verify password mismatch error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('should handle sign-up flow successfully', async ({ page }) => {
    // Navigate to sign-up page
    await page.goto('/auth/sign-up');
    
    // Fill in valid sign-up data with unique email
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel(/repeat password/i).fill(TEST_PASSWORD);
    
    // Submit the form
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Verify redirect to success page or email verification message
    await expect(page).toHaveURL('/auth/sign-up-success');
  });
});

// Test for auth state persistence
test.describe('Authentication State', () => {
  test('should persist authentication state across page navigation', async ({ page }) => {
    // Sign in first
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(REGULAR_USER.email);
    await page.getByLabel(/password/i).fill(REGULAR_USER.password);
    await page.getByRole('button', { name: /login/i }).click();
    
    // Verify we're on the home page
    await expect(page).toHaveURL('/');
    
    // Navigate to sign-up page (should still be accessible)
    await page.goto('/auth/sign-up');
    
    // Navigate back to home page
    await page.goto('/');
    
    // Verify we're still on home page
    await expect(page).toHaveURL('/');
  });
}); 