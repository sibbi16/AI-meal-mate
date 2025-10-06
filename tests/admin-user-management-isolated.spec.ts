import { test, expect } from '@playwright/test';
import { ADMIN_USER } from './auth-utils';
import { createAdminClient } from '@/utils/supabase/admin';

// Disable parallel execution for this entire file to avoid session conflicts
test.describe.configure({ 
  mode: 'serial',
  timeout: 60000 // Increase timeout for admin operations
});

// Helper function to create a unique test user for admin operations
async function createTestUserForAdmin() {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 12);
  const additionalRandom = Math.floor(Math.random() * 10000);
  const uniqueUser = {
    email: `test-admin-user-${timestamp}-${randomSuffix}-${additionalRandom}@example.com`,
    full_name: `Test Admin User ${timestamp}`,
    id: null as string | null
  };

  // Pre-cleanup: ensure no leftover user with this email exists
  await cleanupAdminTestUser(uniqueUser.email);

  return uniqueUser;
}

// Helper function to cleanup old test users to prevent accumulation
async function cleanupOldTestUsers() {
  const adminClient = createAdminClient();
  
  try {
    // Get all users
    const { data: users } = await adminClient.auth.admin.listUsers();
    
    // Find test users older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const oldTestUsers = users.users.filter(user => {
      if (!user.email?.includes('test-admin-user-')) return false;
      
      // Extract timestamp from email
      const match = user.email.match(/test-admin-user-(\d+)-/);
      if (!match) return false;
      
      const userTimestamp = parseInt(match[1]);
      return userTimestamp < oneHourAgo;
    });

    // Delete old test users
    for (const user of oldTestUsers) {
      await cleanupAdminTestUser(user.email!);
    }

    if (oldTestUsers.length > 0) {
      console.log(`🧹 Cleaned up ${oldTestUsers.length} old test users`);
    }
  } catch (error) {
    console.warn('⚠️ Warning during old test user cleanup:', error);
  }
}

// Helper function to cleanup test users created during admin tests
async function cleanupAdminTestUser(email: string) {
  const adminClient = createAdminClient();
  
  try {
    // Find user by email
    const { data: users } = await adminClient.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);
    
    if (user) {
      console.log(`Cleaning up test user: ${email} (${user.id})`);
      
      // Clean up related records first
      try {
        // Delete roles
        await adminClient
          .from('roles')
          .delete()
          .eq('user_id', user.id);
        
        // Delete organisation memberships
        await adminClient
          .from('organisation_memberships')
          .delete()
          .eq('user_id', user.id);
        
        // Delete public user record
        await adminClient
          .from('users')
          .delete()
          .eq('id', user.id);
      } catch (dbError) {
        console.warn(`⚠️ Warning cleaning up DB records for ${email}:`, dbError);
      }

      // Delete auth user last
      await adminClient.auth.admin.deleteUser(user.id);
      console.log(`✅ Successfully deleted auth user: ${email}`);
    }
  } catch (error) {
    console.warn(`⚠️ Warning cleaning up admin test user ${email}:`, error);
  }
}

// Helper function to sign in as admin with robust session management
async function signInAsAdmin(page: import('@playwright/test').Page) {
  // Clear any existing sessions first
  await page.context().clearCookies();
  
  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill(ADMIN_USER.email);
  await page.getByLabel(/password/i).fill(ADMIN_USER.password);
  await page.getByRole('button', { name: /login/i }).click();
  
  // Wait for successful login
  await expect(page).toHaveURL('/');
  
  // Verify admin access by checking we can access admin area
  await page.goto('/admin');
  await expect(page).toHaveURL('/admin');
  await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });
  
  // Give a moment for the session and roles to be properly loaded
  await page.waitForTimeout(2000);
  
  console.log('Admin authentication verified successfully');
}

test.describe('Admin User Management (Isolated)', () => {
  test.beforeAll(async () => {
    // Cleanup old test users before starting
    await cleanupOldTestUsers();
  });

  test('should create a new user', async ({ page }, testInfo) => {
    // Skip on non-chromium to avoid email service conflicts
    test.skip(testInfo.project.name !== 'chromium', `Admin tests only run on desktop chromium, skipping ${testInfo.project.name}`);
    
    const testUser = await createTestUserForAdmin();
    
    try {
      // Sign in as admin
      await signInAsAdmin(page);
      
      // Navigate to admin dashboard first
      await page.goto('/admin');
      await expect(page).toHaveURL('/admin');
      await expect(page.getByText('Admin Dashboard')).toBeVisible();
      
      // Navigate to create user page via the quick action button
      await page.getByRole('link', { name: /create user/i }).click();
      await expect(page).toHaveURL('/admin/users/create');
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      
      // Debug: Check what's actually on the page
      const pageContent = await page.locator('body').textContent();
      console.log('Create user page content (first 500 chars):', pageContent?.substring(0, 500));
      
      // Try different variations of the text
      const createUserHeading = page.getByText('Create New User').or(
        page.getByRole('heading', { name: /create.*user/i })
      ).or(
        page.locator('h1, h2, h3').filter({ hasText: /create.*user/i })
      );
      
      await expect(createUserHeading).toBeVisible({ timeout: 10000 });
      
      // Fill in user creation form
      await page.getByLabel('Email Address').fill(testUser.email);
      await page.getByLabel('Full Name').fill(testUser.full_name);
      
      // Wait for form to load and find the select trigger
      await page.waitForTimeout(1000);
      
      // Try multiple selectors for the role select
      const roleSelect = page.locator('button').filter({ hasText: 'Select a role' }).or(
        page.locator('[data-testid="role-select"]')
      ).or(
        page.locator('div.space-y-2').filter({ hasText: 'System Role' }).locator('button')
      );
      
      await roleSelect.first().click();
      await page.getByRole('option', { name: 'User' }).click();
      
      // Submit form
      const createButton = page.getByRole('button', { name: /create user/i });
      await createButton.click();
      
      // Wait a moment for any processing
      await page.waitForTimeout(3000);
      
      // Check for error messages
      const errorElements = page.locator('div').filter({ hasText: /Failed to|Error|already exists|Invalid|required/i });
      const errorCount = await errorElements.count();
      
      if (errorCount > 0) {
        const errorText = await errorElements.first().textContent();
        console.log('Form error detected in first test:', errorText);
        throw new Error(`Form submission failed with error: ${errorText}`);
      }
      
      // Check current URL for debugging
      const currentUrl = page.url();
      console.log('Current URL after form submission (first test):', currentUrl);
      
      // If redirected to login, it means session was lost - try to re-authenticate
      if (currentUrl.includes('/auth/login')) {
        console.log('Session lost, re-authenticating...');
        await signInAsAdmin(page);
        await page.goto('/admin/users');
      }
      
      // Verify we're on the users list page
      await expect(page).toHaveURL('/admin/users');
      
      // Verify user appears in the list
      await expect(page.locator('body')).toContainText(testUser.email);
      await expect(page.locator('body')).toContainText(testUser.full_name);
      
      // Verify user has 'Pending' status (not confirmed yet)
      await expect(page.locator('body')).toContainText('Pending');
      
    } finally {
      // Cleanup
      await cleanupAdminTestUser(testUser.email);
    }
  });

  test('should handle complete user lifecycle: create -> invite -> set password', async ({ page, context }, testInfo) => {
    // Skip on non-chromium to avoid email service conflicts
    test.skip(testInfo.project.name !== 'chromium', `Admin tests only run on desktop chromium, skipping ${testInfo.project.name}`);
    
    const testUser = await createTestUserForAdmin();
    
    try {
      // Sign in as admin
      await signInAsAdmin(page);
      
      // Navigate to admin dashboard and create user
      await page.goto('/admin');
      await page.getByRole('link', { name: /create user/i }).click();
      await page.getByLabel('Email Address').fill(testUser.email);
      await page.getByLabel('Full Name').fill(testUser.full_name);
      
      // Wait for form to load and find the select trigger
      await page.waitForTimeout(1000);
      
      // Try multiple selectors for the role select
      const roleSelect = page.locator('button').filter({ hasText: 'Select a role' }).or(
        page.locator('[data-testid="role-select"]')
      ).or(
        page.locator('div.space-y-2').filter({ hasText: 'System Role' }).locator('button')
      );
      
      await roleSelect.first().click();
      await page.getByRole('option', { name: 'User' }).click();
      
      // Submit form and handle potential errors
      const createButton = page.getByRole('button', { name: /create user/i });
      
      // Wait for any form validation to complete
      await page.waitForTimeout(500);
      
      // Submit the form
      await createButton.click();
      
      // Wait a moment for any processing
      await page.waitForTimeout(3000);
      
      // Check for error messages
      const errorElements = page.locator('div').filter({ hasText: /Failed to|Error|already exists|Invalid|required/i });
      const errorCount = await errorElements.count();
      
      if (errorCount > 0) {
        const errorText = await errorElements.first().textContent();
        console.log('Form error detected:', errorText);
        throw new Error(`Form submission failed with error: ${errorText}`);
      }
      
      // Check current URL
      const currentUrl = page.url();
      console.log('Current URL after form submission:', currentUrl);
      
      // If still on create page, log page content for debugging
      if (currentUrl.includes('/create')) {
        const pageContent = await page.locator('body').textContent();
        console.log('Page content (first 500 chars):', pageContent?.substring(0, 500));
        
        // Check if button is still in submitting state
        const buttonText = await createButton.textContent();
        console.log('Button text:', buttonText);
      }
      
      // Wait for successful navigation
      await expect(page).toHaveURL('/admin/users', { timeout: 5000 });
      
      // Check mailpit for the email
      await page.goto('http://localhost:44324');
      
      // Wait for email to appear
      let emailFound = false;
      for (let i = 0; i < 10; i++) {
        try {
          await expect(page.locator('body')).toContainText(testUser.email, { timeout: 1000 });
          emailFound = true;
          break;
        } catch (e) {
          await page.reload();
          await page.waitForTimeout(1000);
        }
      }
      
      if (!emailFound) {
        throw new Error(`Welcome email for ${testUser.email} not found in mailpit after 10 attempts`);
      }
      
      // Click on the email
      await page.locator('body').getByRole('link', { name: /You have been invited/i }).first().click();
      await page.waitForTimeout(2000);
      
      // Click the reset password link in the email
      let resetLinkClicked = false;
      for (let i = 0; i < 5; i++) {
        try {
          const resetLink = page.frameLocator('iframe#preview-html').getByRole('link', { name: /Accept the invite/i }).first();
          await expect(resetLink).toBeVisible({ timeout: 2000 });
          await resetLink.click();
          resetLinkClicked = true;
          break;
        } catch (e) {
          await page.waitForTimeout(1000);
        }
      }
      
      if (!resetLinkClicked) {
        throw new Error('Failed to click reset password link after 5 attempts');
      }
      
      // Handle new page opening
      const pagePromise = context.waitForEvent('page');
      const newPage = await pagePromise;
      
      await newPage.waitForLoadState('networkidle');
      
      // Wait for the callback client to process and redirect
      await newPage.waitForTimeout(5000);
      
      // Debug current state
      const callbackUrl = newPage.url();
      console.log('Current URL after callback processing:', callbackUrl);
      
      // If still on callback-client, wait a bit more and check for redirect
      if (callbackUrl.includes('callback-client')) {
        console.log('Still on callback-client, waiting for redirect...');
        // Wait for the redirect to happen with a longer timeout
        await expect(newPage).toHaveURL(/\/auth\/update-password/, { timeout: 15000 });
      } else {
        // Should already be on update-password page
        await expect(newPage).toHaveURL(/\/auth\/update-password/);
      }
      
      // Wait for the password form to be loaded (session setup might take time)
      await newPage.waitForSelector('input[name="password"]', { timeout: 10000 });
      
      // Wait a bit more for session setup to complete in the background
      await newPage.waitForTimeout(2000);
      
      // Set password for the first time
      const newPassword = 'NewUserPass123!';
      
      await newPage.getByLabel('New password', { exact: true }).fill(newPassword);
      await newPage.getByLabel('Confirm new password', { exact: true }).fill(newPassword);
      await newPage.getByRole('button', { name: /Save new password/i }).click();
      
      // Verify successful password set
      await expect(newPage).toHaveURL(/^http:\/\/localhost:3000\/(\?.*)?$/);
      
      // Test login with new password
      await newPage.goto('/auth/login');
      await newPage.getByLabel(/email/i).fill(testUser.email);
      await newPage.getByLabel(/password/i).fill(newPassword);
      await newPage.getByRole('button', { name: /login/i }).click();
      
      // Verify successful login
      await expect(newPage).toHaveURL('/');
      
    } finally {
      // Cleanup
      await cleanupAdminTestUser(testUser.email);
    }
  });

  test('should delete a user', async ({ page }, testInfo) => {
    // Skip on non-chromium to avoid conflicts
    test.skip(testInfo.project.name !== 'chromium', `Admin tests only run on desktop chromium, skipping ${testInfo.project.name}`);
    
    const testUser = await createTestUserForAdmin();
    
    try {
      // Sign in as admin
      await signInAsAdmin(page);
      
      // Create user first
      await page.goto('/admin');
      await page.getByRole('link', { name: /create user/i }).click();
      await page.getByLabel('Email Address').fill(testUser.email);
      await page.getByLabel('Full Name').fill(testUser.full_name);
      
      // Wait for form to load and find the select trigger
      await page.waitForTimeout(1000);
      
      // Try multiple selectors for the role select
      const roleSelect = page.locator('button').filter({ hasText: 'Select a role' }).or(
        page.locator('[data-testid="role-select"]')
      ).or(
        page.locator('div.space-y-2').filter({ hasText: 'System Role' }).locator('button')
      );
      
      await roleSelect.first().click();
      await page.getByRole('option', { name: 'User' }).click();
      await page.getByRole('button', { name: /create user/i }).click();
      
      await expect(page).toHaveURL('/admin/users');
      
      // Verify user exists
      await expect(page.locator('body')).toContainText(testUser.email);
      
      // Click delete button
      const deleteButton = page.locator('[title="Delete user"]');
      
      // Handle confirmation dialog
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Are you sure you want to delete user');
        expect(dialog.message()).toContain(testUser.email);
        await dialog.accept();
      });
      
      await deleteButton.first().click();
      
      // Wait for deletion to complete
      await page.waitForTimeout(2000);
      
      // Verify user is removed from list
      await page.reload();
      await expect(page.locator('body')).not.toContainText(testUser.email);
      
    } finally {
      // Cleanup (should already be deleted, but just in case)
      await cleanupAdminTestUser(testUser.email);
    }
  });

  test('should send invite email to unverified user', async ({ page }, testInfo) => {
    // Skip on non-chromium to avoid email service conflicts
    test.skip(testInfo.project.name !== 'chromium', `Admin tests only run on desktop chromium, skipping ${testInfo.project.name}`);
    
    const testUser = await createTestUserForAdmin();
    
    try {
      // Sign in as admin
      await signInAsAdmin(page);
      
      // Create user first (will be unverified)
      await page.goto('/admin');
      await page.getByRole('link', { name: /create user/i }).click();
      await page.getByLabel('Email Address').fill(testUser.email);
      await page.getByLabel('Full Name').fill(testUser.full_name);
      
      // Wait for form to load and find the select trigger
      await page.waitForTimeout(1000);
      
      // Try multiple selectors for the role select
      const roleSelect = page.locator('button').filter({ hasText: 'Select a role' }).or(
        page.locator('[data-testid="role-select"]')
      ).or(
        page.locator('div.space-y-2').filter({ hasText: 'System Role' }).locator('button')
      );
      
      await roleSelect.first().click();
      await page.getByRole('option', { name: 'User' }).click();
      await page.getByRole('button', { name: /create user/i }).click();
      
      await expect(page).toHaveURL('/admin/users');
      
      // Send invite to the unverified user
      const sendButton = page.locator('[title*="Send"]').first();
      await sendButton.click();
      
      // Handle the success alert for invite
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Invite email sent successfully');
        await dialog.accept();
      });
      
      await page.waitForTimeout(2000);
      
      // Verify invite email was sent to mailpit
      await page.goto('http://localhost:44324');
      await expect(page.locator('body')).toContainText(testUser.email);
      await expect(page.locator('body')).toContainText(/You have been invited/i);
      
    } finally {
      // Cleanup
      await cleanupAdminTestUser(testUser.email);
    }
  });

  test('should send password reset to verified user', async ({ page }, testInfo) => {
    // Skip on non-chromium to avoid email service conflicts
    test.skip(testInfo.project.name !== 'chromium', `Admin tests only run on desktop chromium, skipping ${testInfo.project.name}`);
    
    const testUser = await createTestUserForAdmin();
    
    try {
      // Sign in as admin
      await signInAsAdmin(page);
      
      // First create and verify the user by completing the full invite flow
      await page.goto('/admin');
      await page.getByRole('link', { name: /create user/i }).click();
      await page.getByLabel('Email Address').fill(testUser.email);
      await page.getByLabel('Full Name').fill(testUser.full_name);
      
      // Wait for form to load and find the select trigger
      await page.waitForTimeout(1000);
      
      // Try multiple selectors for the role select
      const roleSelect = page.locator('button').filter({ hasText: 'Select a role' }).or(
        page.locator('[data-testid="role-select"]')
      ).or(
        page.locator('div.space-y-2').filter({ hasText: 'System Role' }).locator('button')
      );
      
      await roleSelect.first().click();
      await page.getByRole('option', { name: 'User' }).click();
      await page.getByRole('button', { name: /create user/i }).click();
      
      await expect(page).toHaveURL('/admin/users');
      
      // Go through the invite flow to verify the user first
      await page.goto('http://localhost:44324');
      
      // Wait for email to appear
      let emailFound = false;
      for (let i = 0; i < 10; i++) {
        try {
          await expect(page.locator('body')).toContainText(testUser.email, { timeout: 1000 });
          emailFound = true;
          break;
        } catch (e) {
          await page.reload();
          await page.waitForTimeout(1000);
        }
      }
      
      if (!emailFound) {
        throw new Error(`Invite email for ${testUser.email} not found in mailpit`);
      }
      
      // Click on the invite email
      await page.locator('body').getByRole('link', { name: /You have been invited/i }).first().click();
      await page.waitForTimeout(2000);
      
      // Click the invite link
      const resetLink = page.frameLocator('iframe#preview-html').getByRole('link', { name: /Accept the invite/i }).first();
      await expect(resetLink).toBeVisible({ timeout: 2000 });
      
      // Get the invite URL to process it
      const inviteUrl = await resetLink.getAttribute('href');
      
      // Open the invite URL in the same context to verify the user
      await page.goto(inviteUrl!);
      
      // Wait for redirect to update password page
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Set initial password to verify the user
      const initialPassword = 'InitialPass123!';
      await page.getByLabel('New password', { exact: true }).fill(initialPassword);
      await page.getByLabel('Confirm new password', { exact: true }).fill(initialPassword);
      await page.getByRole('button', { name: /Save new password/i }).click();
      
      // Wait for successful password set (user is now verified)
      await expect(page).toHaveURL(/^http:\/\/localhost:3000\/(\?.*)?$/);
      
      // Now go back to admin panel and try sending password reset to the verified user
      await signInAsAdmin(page);
      await page.goto('/admin/users');
      
      // Send password reset to the now-verified user
      const sendButton = page.locator('[title*="Send"]').first();
      await sendButton.click();
      
      // Handle the success alert for password reset
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Password reset email sent successfully');
        await dialog.accept();
      });
      
      await page.waitForTimeout(2000);
      
      // Verify password reset email was sent to mailpit
      await page.goto('http://localhost:44324');
      await expect(page.locator('body')).toContainText(testUser.email);
      await expect(page.locator('body')).toContainText(/Reset Your Password/i);
      
    } finally {
      // Cleanup
      await cleanupAdminTestUser(testUser.email);
    }
  });

  test('should deactivate user and prevent login, then reactivate and allow login', async ({ page, context }, testInfo) => {
    // Skip on non-chromium to avoid conflicts
    test.skip(testInfo.project.name !== 'chromium', `Admin tests only run on desktop chromium, skipping ${testInfo.project.name}`);
    
    const testUser = await createTestUserForAdmin();
    const testPassword = 'TestUserPass123!';
    
    try {
      // Create user directly using admin client to bypass UI issues
      const adminClient = createAdminClient();
      
      // Create the auth user with password
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: testUser.email,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          full_name: testUser.full_name
        }
      });
      
      if (authError || !authData.user) {
        throw new Error(`Failed to create user: ${authError?.message}`);
      }
      
      const userId = authData.user.id;
      
      // Create public user record
      await adminClient.from('users').insert({
        id: userId,
        full_name: testUser.full_name,
        is_active: true
      });
      
      // Create role record
      await adminClient.from('roles').insert({
        user_id: userId,
        role: 'user'
      });
      
      console.log(`Created test user: ${testUser.email} with ID: ${userId}`);
      
      // Test initial login works
      const loginPage1 = await context.newPage();
      await loginPage1.goto('/auth/login');
      await loginPage1.getByLabel(/email/i).fill(testUser.email);
      await loginPage1.getByLabel(/password/i).fill(testPassword);
      await loginPage1.getByRole('button', { name: /login/i }).click();
      await expect(loginPage1).toHaveURL('/');
      console.log('✅ Initial login successful');
      await loginPage1.close();
      
      // Deactivate user directly via database
      const { error: deactivateError } = await adminClient
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);
      
      if (deactivateError) {
        throw new Error(`Failed to deactivate user: ${deactivateError.message}`);
      }
      
      console.log('✅ User deactivated in database');
      
      // Test that deactivated user cannot login
      const loginPage2 = await context.newPage();
      await loginPage2.goto('/auth/login');
      await loginPage2.getByLabel(/email/i).fill(testUser.email);
      await loginPage2.getByLabel(/password/i).fill(testPassword);
      await loginPage2.getByRole('button', { name: /login/i }).click();
      
      // Should see error message about deactivated account
      await expect(loginPage2.locator('body')).toContainText('deactivated', { timeout: 5000 });
      
      // Should still be on login page
      await expect(loginPage2).toHaveURL(/\/auth\/login/);
      console.log('✅ Deactivated user login blocked');
      await loginPage2.close();
      
      // Reactivate user
      const { error: reactivateError } = await adminClient
        .from('users')
        .update({ is_active: true })
        .eq('id', userId);
      
      if (reactivateError) {
        throw new Error(`Failed to reactivate user: ${reactivateError.message}`);
      }
      
      console.log('✅ User reactivated in database');
      
      // Test that reactivated user can login again
      const loginPage3 = await context.newPage();
      await loginPage3.goto('/auth/login');
      await loginPage3.getByLabel(/email/i).fill(testUser.email);
      await loginPage3.getByLabel(/password/i).fill(testPassword);
      await loginPage3.getByRole('button', { name: /login/i }).click();
      
      // Should successfully login
      await expect(loginPage3).toHaveURL('/');
      console.log('✅ Reactivated user login successful');
      await loginPage3.close();
      
    } finally {
      // Cleanup
      await cleanupAdminTestUser(testUser.email);
    }
  });

  test('should prevent deactivated user from bypassing security via forgot password', async ({ page, context }, testInfo) => {
    // Skip on non-chromium to avoid conflicts
    test.skip(testInfo.project.name !== 'chromium', `Admin tests only run on desktop chromium, skipping ${testInfo.project.name}`);
    
    const testUser = await createTestUserForAdmin();
    const testPassword = 'TestUserPass123!';
    
    try {
      // Create user directly using admin client
      const adminClient = createAdminClient();
      
      // Create the auth user with password
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: testUser.email,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          full_name: testUser.full_name
        }
      });
      
      if (authError || !authData.user) {
        throw new Error(`Failed to create user: ${authError?.message}`);
      }
      
      const userId = authData.user.id;
      
      // Create public user record (initially active)
      await adminClient.from('users').insert({
        id: userId,
        full_name: testUser.full_name,
        is_active: true
      });
      
      // Create role record
      await adminClient.from('roles').insert({
        user_id: userId,
        role: 'user'
      });
      
      console.log(`Created test user: ${testUser.email} with ID: ${userId}`);
      
      // Deactivate the user
      const { error: deactivateError } = await adminClient
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);
      
      if (deactivateError) {
        throw new Error(`Failed to deactivate user: ${deactivateError.message}`);
      }
      
      console.log('✅ User deactivated');
      
      // Try to use forgot password - should be blocked now
      const forgotPasswordPage = await context.newPage();
      await forgotPasswordPage.goto('/auth/forgot-password');
      await forgotPasswordPage.getByLabel(/email/i).fill(testUser.email);
      await forgotPasswordPage.getByRole('button', { name: /send reset email/i }).click();
      
      // Wait for redirect/page update
      await forgotPasswordPage.waitForTimeout(3000);
      
      // Check if redirected back to forgot password page with error parameters
      const currentUrl = forgotPasswordPage.url();
      console.log('Current URL after form submission:', currentUrl);
      
      // Should see error message about deactivated account, NOT success
      await expect(forgotPasswordPage.locator('body')).toContainText('contact an administrator', { timeout: 5000 });
      
      // Should NOT see success message
      const successMessage = forgotPasswordPage.getByText(/check your email/i);
      const successVisible = await successMessage.isVisible().catch(() => false);
      expect(successVisible).toBe(false);
      
      console.log('✅ Password reset blocked for deactivated user');
      await forgotPasswordPage.close();
      
      // Verify no email was sent to mailpit
      await page.goto('http://localhost:44324');
      await page.waitForTimeout(2000); // Give time for any potential email
      
      // Should NOT find any email for this user
      const emailBody = await page.locator('body').textContent();
      expect(emailBody).not.toContain(testUser.email);
      
      console.log('✅ No password reset email sent to deactivated user');
      
      // Verify the user still cannot login
      const loginTestPage = await context.newPage();
      await loginTestPage.goto('/auth/login');
      await loginTestPage.getByLabel(/email/i).fill(testUser.email);
      await loginTestPage.getByLabel(/password/i).fill(testPassword);
      await loginTestPage.getByRole('button', { name: /login/i }).click();
      
      await expect(loginTestPage.locator('body')).toContainText('deactivated', { timeout: 5000 });
      console.log('✅ User still cannot login');
      await loginTestPage.close();
      
    } finally {
      // Cleanup
      await cleanupAdminTestUser(testUser.email);
    }
  });

  test('should properly redirect forgot password to update password page, not homepage', async ({ page, context }, testInfo) => {
    // Skip on non-chromium to avoid conflicts
    test.skip(testInfo.project.name !== 'chromium', `Admin tests only run on desktop chromium, skipping ${testInfo.project.name}`);
    
    const testUser = await createTestUserForAdmin();
    const testPassword = 'TestUserPass123!';
    
    try {
      // Create user directly using admin client
      const adminClient = createAdminClient();
      
      // Create the auth user with password
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: testUser.email,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          full_name: testUser.full_name
        }
      });
      
      if (authError || !authData.user) {
        throw new Error(`Failed to create user: ${authError?.message}`);
      }
      
      const userId = authData.user.id;
      
      // Create public user record (active user)
      await adminClient.from('users').insert({
        id: userId,
        full_name: testUser.full_name,
        is_active: true
      });
      
      // Create role record
      await adminClient.from('roles').insert({
        user_id: userId,
        role: 'user'
      });
      
      console.log(`Created test user: ${testUser.email} with ID: ${userId}`);
      
      // Test forgot password flow
      const forgotPasswordPage = await context.newPage();
      await forgotPasswordPage.goto('/auth/forgot-password');
      await forgotPasswordPage.getByLabel(/email/i).fill(testUser.email);
      await forgotPasswordPage.getByRole('button', { name: /send reset email/i }).click();
      
      // Wait for server action redirect and success message
      await forgotPasswordPage.waitForTimeout(3000);
      await expect(forgotPasswordPage.getByText(/check your email/i)).toBeVisible();
      console.log('✅ Password reset email sent');
      await forgotPasswordPage.close();
      
      // Check mailpit for the reset email
      await page.goto('http://localhost:44324');
      
      // Wait for email to appear
      let emailFound = false;
      for (let i = 0; i < 10; i++) {
        try {
          await expect(page.locator('body')).toContainText(testUser.email, { timeout: 1000 });
          emailFound = true;
          break;
        } catch (e) {
          await page.reload();
          await page.waitForTimeout(1000);
        }
      }
      
      if (!emailFound) {
        throw new Error(`Reset email for ${testUser.email} not found in mailpit`);
      }
      
      // Click on the reset email
      await page.locator('body').getByRole('link', { name: /Reset Your Password/i }).first().click();
      await page.waitForTimeout(2000);
      
      // Click the reset password link
      let resetLinkClicked = false;
      for (let i = 0; i < 5; i++) {
        try {
          const resetLink = page.frameLocator('iframe#preview-html').getByRole('link', { name: /Reset password/i }).first();
          await expect(resetLink).toBeVisible({ timeout: 2000 });
          await resetLink.click();
          resetLinkClicked = true;
          break;
        } catch (e) {
          await page.waitForTimeout(1000);
        }
      }
      
      if (!resetLinkClicked) {
        throw new Error('Failed to click reset password link');
      }
      
      // Handle new page opening
      const pagePromise = context.waitForEvent('page');
      const resetPage = await pagePromise;
      await resetPage.waitForLoadState('networkidle');
      await resetPage.waitForTimeout(2000);
      
      // CRITICAL: Should reach the update password page, NOT the homepage
      await expect(resetPage).toHaveURL(/\/auth\/update-password/);
      
      // Should see the password reset form, not homepage content
      await expect(resetPage.getByText('Set Your Password')).toBeVisible();
      
      // Should NOT see homepage-specific content (avoid navigation matches)
      const homepageContent = resetPage.locator('main').getByText(/Get Started|Welcome to|Dashboard/i);
      const homepageContentVisible = await homepageContent.isVisible().catch(() => false);
      expect(homepageContentVisible).toBe(false);
      
      console.log('✅ Password reset properly redirected to update password page');
      
      // Complete the password reset to verify it works
      const newPassword = 'NewSecurePass123!';
      await resetPage.getByLabel('New password', { exact: true }).fill(newPassword);
      await resetPage.getByLabel('Confirm new password', { exact: true }).fill(newPassword);
      await resetPage.getByRole('button', { name: /Save new password/i }).click();
      
      // Should successfully complete password reset
      await expect(resetPage).toHaveURL(/^http:\/\/localhost:3000\/(\?.*)?$/);
      console.log('✅ Password reset completed successfully');
      await resetPage.close();
      
      // Verify the user can login with the new password
      const loginTestPage = await context.newPage();
      await loginTestPage.goto('/auth/login');
      await loginTestPage.getByLabel(/email/i).fill(testUser.email);
      await loginTestPage.getByLabel(/password/i).fill(newPassword);
      await loginTestPage.getByRole('button', { name: /login/i }).click();
      
      await expect(loginTestPage).toHaveURL('/');
      console.log('✅ User can login with new password');
      await loginTestPage.close();
      
    } finally {
      // Cleanup
      await cleanupAdminTestUser(testUser.email);
    }
  });

  test('should prevent admin from sending password reset emails to deactivated users', async ({ page, context }, testInfo) => {
    // Skip on non-chromium to avoid conflicts
    test.skip(testInfo.project.name !== 'chromium', `Admin tests only run on desktop chromium, skipping ${testInfo.project.name}`);
    
    const testUser = await createTestUserForAdmin();
    const testPassword = 'TestUserPass123!';
    
    try {
      // Create user directly using admin client
      const adminClient = createAdminClient();
      
      // Create the auth user with password
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: testUser.email,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          full_name: testUser.full_name
        }
      });
      
      if (authError || !authData.user) {
        throw new Error(`Failed to create user: ${authError?.message}`);
      }
      
      const userId = authData.user.id;
      
      // Create public user record (initially active)
      await adminClient.from('users').insert({
        id: userId,
        full_name: testUser.full_name,
        is_active: true
      });
      
      // Create role record
      await adminClient.from('roles').insert({
        user_id: userId,
        role: 'user'
      });
      
      console.log(`Created test user: ${testUser.email} with ID: ${userId}`);
      
      // Deactivate the user
      const { error: deactivateError } = await adminClient
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);
      
      if (deactivateError) {
        throw new Error(`Failed to deactivate user: ${deactivateError.message}`);
      }
      
      console.log('✅ User deactivated');
      
      // Sign in as admin and go to user management
      await signInAsAdmin(page);
      await page.goto('/admin/users');
      
      // Find the deactivated user's row
      await expect(page.locator('body')).toContainText(testUser.email);
      
      // Try to send password reset email from admin panel
      const sendButton = page.locator(`[title*="Send"]`).first();
      await sendButton.click();
      
      // Should see error alert about deactivated user
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Cannot send emails to deactivated users');
        await dialog.accept();
      });
      
      await page.waitForTimeout(2000);
      
      console.log('✅ Admin prevented from sending email to deactivated user');
      
      // Verify no email was sent to mailpit
      await page.goto('http://localhost:44324');
      await page.waitForTimeout(2000); // Give time for any potential email
      
      // Should NOT find any email for this user
      const emailBody = await page.locator('body').textContent();
      expect(emailBody).not.toContain(testUser.email);
      
      console.log('✅ No password reset email sent from admin panel to deactivated user');
      
    } finally {
      // Cleanup
      await cleanupAdminTestUser(testUser.email);
    }
  });
}); 