import { test, expect } from '@playwright/test';
import { ADMIN_USER, REGULAR_USER } from './auth-utils';
import { createAdminClient } from '@/utils/supabase/admin';

// Helper function to create a unique test user for password reset tests
async function createPasswordResetTestUser() {
  const timestamp = Date.now();
  const uniqueUser = {
    email: `test-password-reset-${timestamp}@example.com`,
    password: 'TestPass123!',
    id: null as string | null
  };

  const adminClient = createAdminClient();
  
  try {
    const { data: userData } = await adminClient.auth.admin.createUser({
      email: uniqueUser.email,
      password: uniqueUser.password,
      user_metadata: {},
      email_confirm: true
    });

    if (userData.user) {
      uniqueUser.id = userData.user.id;
    }

    return uniqueUser;
  } catch (error) {
    console.error('❌ Error creating password reset test user:', error);
    throw error;
  }
}

// Helper function to cleanup a password reset test user
async function cleanupPasswordResetTestUser(userId: string) {
  const adminClient = createAdminClient();
  
  try {
    await adminClient.auth.admin.deleteUser(userId);
  } catch (error) {
    console.warn('⚠️ Warning cleaning up password reset test user:', error);
  }
}

test.describe('Supabase Authentication Features', () => {
  test('should handle email verification flow', async ({ page }) => {
    // Navigate to sign-up page
    await page.goto('/auth/sign-up');
    
    // Fill in sign-up form
    await page.getByLabel(/email/i).fill(`test-${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill(REGULAR_USER.password);
    await page.getByLabel(/repeat password/i).fill(REGULAR_USER.password);
    
    // Submit the form
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Verify redirect to success page with email verification message
    await expect(page).toHaveURL('/auth/sign-up-success');
  });
});

// Password reset test runs only on chromium to avoid email service conflicts
test.describe('Password Reset Flow', () => {
  test('should handle password reset flow correctly', async ({ page, context }, testInfo) => {
    // Skip this test on all projects except desktop chromium to avoid email service conflicts
    test.skip(testInfo.project.name !== 'chromium', `Password reset test only runs on desktop chromium, skipping ${testInfo.project.name}`);
    
    // Create a unique user for this test to avoid conflicts between browsers
    const testUser = await createPasswordResetTestUser();
    
    try {
      // Navigate to forgot password page
      await page.goto('/auth/forgot-password');
      
      // Fill in email
      await page.getByLabel(/email/i).fill(testUser.email);
      
      // Submit the form
      await page.getByRole('button', { name: /send reset email/i }).click();
      
      // Verify success message about password reset email
      await expect(page.getByText(/check your email/i)).toBeVisible();
      await page.waitForTimeout(2000); // Give more time for email processing

      // emails are sent to mailpit running on localhost:44324
      await page.goto('http://localhost:44324');
      
      // Wait for page to load
      await page.waitForTimeout(1000);
      
      // Wait for the email to appear (up to 10 seconds)
      let emailFound = false;
      for (let i = 0; i < 10; i++) {
        try {
          await expect(page.locator('body')).toContainText(testUser.email, { timeout: 1000 });
          emailFound = true;
          break;
        } catch (e) {
          console.log(`Attempt ${i + 1}: Email not found yet, refreshing...`);
          await page.reload();
          await page.waitForTimeout(1000);
        }
      }
      
      if (!emailFound) {
        throw new Error(`Email for ${testUser.email} not found in mailpit after 10 attempts`);
      }
      
      await expect(page.locator('body')).toContainText(/Reset Your Password/i);

      // open the email in the browser by clicking on the subject
      await page.locator('body').getByRole('link', { name: /Reset Your Password/i }).first().click();

      // wait for the email to be opened
      await page.waitForTimeout(2000);
      
      // click the reset password button. It's inside an iframe so we need to switch to it
      // Retry mechanism for iframe loading
      let resetLinkClicked = false;
      for (let i = 0; i < 5; i++) {
        try {
          const resetLink = page.frameLocator('iframe#preview-html').getByRole('link', { name: /Reset password/i }).first();
          await expect(resetLink).toBeVisible({ timeout: 2000 });
          await resetLink.click();
          resetLinkClicked = true;
          break;
        } catch (e) {
          console.log(`Attempt ${i + 1}: Reset link not ready, waiting...`);
          await page.waitForTimeout(1000);
        }
      }
      
      if (!resetLinkClicked) {
        throw new Error('Failed to click reset password link after 5 attempts');
      }

      // the link opened in a new tab so we need to switch to it
      const pagePromise = context.waitForEvent('page');
      await expect(page.locator('body')).toContainText(/Reset Your Password/i);
      const newPage = await pagePromise;

      // Wait for the new page to fully load
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(1000);

      // Verify we're on the update password page
      await expect(newPage).toHaveURL(/\/auth\/update-password/);
      
      // Wait for the form to be visible
      await expect(newPage.getByText(/Reset Your Password/i)).toBeVisible();

      // fill in the new password
      const newPassword = testUser.password + '1';
      
      // Fill password field - wait for it to be available
      const passwordField = newPage.getByLabel('New password', { exact: true });
      await expect(passwordField).toBeVisible();
      await passwordField.fill(newPassword);
      await expect(passwordField).toHaveValue(newPassword);
      
      // Fill confirm password field  
      const confirmField = newPage.getByLabel('Confirm new password', { exact: true });
      await confirmField.fill(newPassword);
      await expect(confirmField).toHaveValue(newPassword);
      
      // Wait for any loading to complete before submitting
      await newPage.waitForTimeout(500);
      
      // Submit the form
      const submitButton = newPage.getByRole('button', { name: /Save new password/i });
      await submitButton.click();

      // Wait for navigation to complete
      await newPage.waitForTimeout(3000);

      // verify redirect to home page (may include query params for success message)
      await expect(newPage).toHaveURL(/^http:\/\/localhost:3000\/(\?.*)?$/);

      // sign in with the new password
      await newPage.goto('/auth/login');
      await newPage.getByLabel(/email/i).fill(testUser.email);
      await newPage.getByLabel(/password/i).fill(newPassword);
      await newPage.getByRole('button', { name: /login/i }).click();
      
      // Verify successful login
      await expect(newPage).toHaveURL('/');
    } finally {
      // Cleanup the test user
      if (testUser.id) {
        await cleanupPasswordResetTestUser(testUser.id);
      }
    }
  });
});

// Other authentication tests run in parallel
test.describe('Other Authentication Features', () => {
  test('should handle session refresh correctly', async ({ page }) => {
    // Sign in
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(ADMIN_USER.email);
    await page.getByLabel(/password/i).fill(ADMIN_USER.password);
    await page.getByRole('button', { name: /login/i }).click();
    
    // Verify authenticated
    await expect(page).toHaveURL('/');
    
    // Wait for a period that's less than the session refresh interval
    // Note: This is to test that the session is refreshed automatically
    await page.waitForTimeout(5000);
    
    // Navigate to another page
    await page.goto('/auth/sign-up');
    
    // Navigate back to home
    await page.goto('/');
    
    // Verify still can navigate normally (session is maintained)
    await expect(page).toHaveURL('/');
  });

  test('should handle sign-up with password validation', async ({ page }) => {
    // Navigate to sign-up page
    await page.goto('/auth/sign-up');
    
    // Test password mismatch
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel('Password', { exact: true }).fill(REGULAR_USER.password);
    await page.getByLabel(/repeat password/i).fill('different-password');
    
    // Submit the form
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Verify password mismatch error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    
    // Fix the password mismatch
    await page.getByLabel(/repeat password/i).clear();
    await page.getByLabel(/repeat password/i).fill(REGULAR_USER.password);
    
    // Submit again
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Should redirect to success page
    await expect(page).toHaveURL('/auth/sign-up-success');
  });

  test('should handle authentication state persistence', async ({ page }) => {
    // Sign in
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(ADMIN_USER.email);
    await page.getByLabel(/password/i).fill(ADMIN_USER.password);
    await page.getByRole('button', { name: /login/i }).click();
    
    // Verify authenticated
    await expect(page).toHaveURL('/');
    
    // Refresh the page
    await page.reload();
    
    // Verify still authenticated (should stay on home page)
    await expect(page).toHaveURL('/');
    
    // Navigate to other pages
    await page.goto('/auth/sign-up');
    await expect(page).toHaveURL('/auth/sign-up');
    
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('should handle invalid login attempts gracefully', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Try with invalid credentials
    await page.getByLabel(/email/i).fill('nonexistent@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    
    // Submit the form
    await page.getByRole('button', { name: /login/i }).click();
    
    // Should show error message and stay on login page
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible();
    await expect(page).toHaveURL('/auth/login');
  });
}); 