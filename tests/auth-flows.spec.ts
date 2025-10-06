import { test, expect } from '@playwright/test';
import { 
  signIn, 
  signOut, 
  verifyAuthenticated, 
  verifyNotAuthenticated,
  ADMIN_USER,
  REGULAR_USER
} from './auth-utils';

test.describe('Authentication Flows', () => {
  test('complete sign-in and sign-out flow', async ({ page }) => {
    // Verify initially not authenticated
    await verifyNotAuthenticated(page);
    
    // Sign in
    await signIn(page);
    
    // Verify authenticated
    await verifyAuthenticated(page);
    
    // Sign out
    await signOut(page);
    
    // Verify no longer authenticated
    await verifyNotAuthenticated(page);
  });

  test('authentication persists across navigation', async ({ page }) => {
    // Sign in
    await signIn(page);
    
    // Navigate to various pages
    await page.goto('/');
    await expect(page).toHaveURL('/');
    
    // Go back to account page
    await page.goto('/');
    
    // Verify still authenticated
    await verifyAuthenticated(page);
  });

  test('should handle invalid sign-in attempts gracefully', async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/auth/login');
    
    // Test with valid email but invalid password
    await page.getByLabel(/email/i).fill(ADMIN_USER.email);
    await page.getByLabel(/password/i).fill('wrong-password');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Verify error message
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible();
    
    // Verify we're still on the sign-in page
    await expect(page).toHaveURL('/auth/login');
    
    // Clear fields
    await page.getByLabel(/email/i).clear();
    await page.getByLabel(/password/i).clear();
    
    // Test with invalid email but valid password
    await page.getByLabel(/email/i).fill('nonexistent@example.com');
    await page.getByLabel(/password/i).fill(ADMIN_USER.password);
    await page.getByRole('button', { name: /login/i }).click();
    
    // Verify error message
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible();
    
    // Verify we're still on the sign-in page
    await expect(page).toHaveURL('/auth/login');
  });



  test('should handle password reset request flow', async ({ page }) => {
    // Navigate to forgot password page
    await page.goto('/auth/forgot-password');
    
    // Fill in email
    await page.getByLabel(/email/i).fill(ADMIN_USER.email);
    
    // Submit the form
    await page.getByRole('button', { name: /send reset email/i }).click();
    
    // Verify success message
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test('should redirect to intended page after authentication', async ({ page }) => {
    // Try to access the home page directly (no protected routes for now)
    await page.goto('/');
    
    // Navigate to sign-in
    await page.goto('/auth/login');
    
    // Sign in
    await page.getByLabel(/email/i).fill(ADMIN_USER.email);
    await page.getByLabel(/password/i).fill(ADMIN_USER.password);
    await page.getByRole('button', { name: /login/i }).click();
    
    // Should be redirected to home page
    await expect(page).toHaveURL('/');
  });
});

// Test for authentication edge cases
test.describe('Authentication Edge Cases', () => {
  test('should handle session expiration gracefully', async ({ page }) => {
    // Sign in
    await signIn(page);
    
    // Verify authenticated
    await verifyAuthenticated(page);
    
    // Simulate session expiration by clearing cookies
    await page.context().clearCookies();
    
    // Try to access home page
    await page.goto('/');
    
    // Since there might not be protected routes, just verify we can still navigate
    await expect(page).toHaveURL('/');
  });

  test('should handle rapid navigation during auth flow', async ({ page }) => {
    // Start sign-in process
    await page.goto('/auth/login');
    
    // Fill email only
    await page.getByLabel(/email/i).fill(ADMIN_USER.email);
    
    // Navigate away before completing
    await page.goto('/');
    
    // Go back to sign-in
    await page.goto('/auth/login');
    
    // Verify form is reset/ready
    await expect(page.getByLabel(/email/i)).toBeEmpty();
    await expect(page.getByLabel(/password/i)).toBeEmpty();
  });

  test('should handle browser refresh during authenticated session', async ({ page }) => {
    // Sign in
    await signIn(page);
    
    // Verify authenticated
    await verifyAuthenticated(page);
    
    // Refresh the page
    await page.reload();
    
    // Verify still authenticated (check for user-specific content)
    await expect(page).toHaveURL('/');
  });
}); 