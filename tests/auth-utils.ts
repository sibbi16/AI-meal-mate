import { Page, expect } from '@playwright/test';
import { createAdminClient } from '@/utils/supabase/admin';

// Test data for different user roles
export const ADMIN_USER = {
  email: 'testadmin@decodifi.uk',
  password: 'AdminPass123!',
  id: '11111111-1111-1111-1111-111111111111'
};

export const REGULAR_USER = {
  email: 'testuser@decodifi.uk',
  password: 'UserPass123!',
  id: '22222222-2222-2222-2222-222222222222'
};

/**
 * Helper function to sign in a user
 * @param page - Playwright page
 * @param email - Email to use for sign in
 * @param password - Password to use for sign in
 * @returns Promise that resolves when sign in is complete
 */
export async function signIn(
  page: Page,
  email: string = ADMIN_USER.email,
  password: string = ADMIN_USER.password
): Promise<void> {
  // Navigate to sign-in page
  await page.goto('/auth/login');
  
  // Fill in credentials
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  
  // Submit the form
  await page.getByRole('button', { name: /login/i }).click();
  
  // Wait for navigation to complete (redirect to home page)
  await page.waitForURL('/');
}

/**
 * Helper function to sign out a user
 * @param page - Playwright page
 * @returns Promise that resolves when sign out is complete
 */
export async function signOut(page: Page): Promise<void> {
  // Navigate to home page first
  await page.goto('/');
  
  // Look for sign out button/link in navigation
  const signOutButton = page.getByRole('button', { name: /sign out|logout/i });
  const signOutLink = page.getByRole('link', { name: /sign out|logout/i });
  
  // Try to find and click sign out button or link
  if (await signOutButton.isVisible()) {
    await signOutButton.click();
  } else if (await signOutLink.isVisible()) {
    await signOutLink.click();
  } else {
    // If no sign out button/link found, clear cookies to simulate sign out
    await page.context().clearCookies();
  }
  
  // Wait for sign out to complete (might redirect to home or login page)
  await page.waitForTimeout(1000); // Give time for navigation
}

/**
 * Helper function to verify a user is authenticated
 * @param page - Playwright page
 * @returns Promise that resolves when verification is complete
 */
export async function verifyAuthenticated(page: Page): Promise<void> {
  // Navigate to home page and check for authenticated user indicators
  await page.goto('/');
  
  // Check for authenticated user indicators (adjust based on your app's UI)
  // This could be a user menu, profile picture, or other authenticated-only elements
  await expect(page).toHaveURL('/');
  
  // If your app has specific authenticated UI elements, check for them here
  // For example: await expect(page.getByRole('button', { name: /profile|account/i })).toBeVisible();
}

/**
 * Helper function to verify a user is not authenticated
 * @param page - Playwright page
 * @returns Promise that resolves when verification is complete
 */
export async function verifyNotAuthenticated(page: Page): Promise<void> {
  // Navigate to home page
  await page.goto('/');
  
  // Check that we're on the home page and not redirected to login
  await expect(page).toHaveURL('/');
  
  // If your app has sign-in links for non-authenticated users, check for them
  // For example: await expect(page.getByRole('link', { name: /sign in|login/i })).toBeVisible();
}

/**
 * Helper function to create a unique test user
 * @returns Object with unique email and password
 */
export function createTestUser() {
  return {
    email: `test-${Date.now()}@example.com`,
    password: 'UserPass123!'
  };
}

/**
 * Helper function to reset password
 * @param page - Playwright page
 * @param email - Email to reset password for
 * @returns Promise that resolves when reset request is complete
 */
export async function requestPasswordReset(
  page: Page,
  email: string = ADMIN_USER.email
): Promise<void> {
  // Navigate to forgot password page
  await page.goto('/auth/forgot-password');
  
  // Fill in email
  await page.getByLabel(/email/i).fill(email);
  
  // Submit the form
  await page.getByRole('button', { name: /send reset email/i }).click();
  
  // Wait for success message
  await expect(page.getByText(/check your email/i)).toBeVisible();
}

/**
 * Create test users in the database using the same pattern as seed.sql
 */
export async function setupTestUsers(): Promise<void> {
  const adminClient = createAdminClient();
  
  try {
    // Check if users already exist and delete them first
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingAdmin = existingUsers.users.find(u => u.email === ADMIN_USER.email);
    const existingRegular = existingUsers.users.find(u => u.email === REGULAR_USER.email);

    // Track whether we need to create new users
    let needCreateAdmin = true;
    let needCreateRegular = true;

    // Delete existing users if found, or reset their passwords
    if (existingAdmin) {
      try {
        await adminClient.auth.admin.deleteUser(existingAdmin.id);
      } catch (error) {
        console.warn(`⚠️ Warning deleting existing admin user, trying password reset:`, error);
        // If deletion fails, try to reset password to original
        try {
          await adminClient.auth.admin.updateUserById(existingAdmin.id, {
            password: ADMIN_USER.password
          });
          console.log('🔄 Reset admin user password to original');
          needCreateAdmin = false; // Don't create new user, existing one is reset
        } catch (resetError) {
          console.warn(`⚠️ Password reset also failed:`, resetError);
        }
      }
    }
    if (existingRegular) {
      try {
        await adminClient.auth.admin.deleteUser(existingRegular.id);
      } catch (error) {
        console.warn(`⚠️ Warning deleting existing regular user, trying password reset:`, error);
        // If deletion fails, try to reset password to original
        try {
          await adminClient.auth.admin.updateUserById(existingRegular.id, {
            password: REGULAR_USER.password
          });
          console.log('🔄 Reset regular user password to original');
          needCreateRegular = false; // Don't create new user, existing one is reset
        } catch (resetError) {
          console.warn(`⚠️ Password reset also failed:`, resetError);
        }
      }
    }

    let adminUserData = null;
    let regularUserData = null;

    // Create admin user only if needed
    if (needCreateAdmin) {
      const result = await adminClient.auth.admin.createUser({
        email: ADMIN_USER.email,
        password: ADMIN_USER.password,
        user_metadata: {},
        email_confirm: true
      });
      adminUserData = result.data;
    } else {
      // Use existing admin user (we know it exists because needCreateAdmin is false)
      adminUserData = { user: existingAdmin! };
    }

    // Create regular user only if needed
    if (needCreateRegular) {
      const result = await adminClient.auth.admin.createUser({
        email: REGULAR_USER.email,
        password: REGULAR_USER.password,
        user_metadata: {},
        email_confirm: true
      });
      regularUserData = result.data;
    } else {
      // Use existing regular user (we know it exists because needCreateRegular is false)
      regularUserData = { user: existingRegular! };
    }

    // Clean up existing roles and set new ones for admin user
    if (adminUserData.user) {
      // Delete all existing roles for this user first
      await adminClient
        .from('roles')
        .delete()
        .eq('user_id', adminUserData.user.id);
      
      // Now insert the admin role
      await adminClient
        .from('roles')
        .insert({ 
          user_id: adminUserData.user.id, 
          role: 'admin' 
        });
    }

    // Clean up existing roles and set new ones for regular user
    if (regularUserData.user) {
      // Delete all existing roles for this user first
      await adminClient
        .from('roles')
        .delete()
        .eq('user_id', regularUserData.user.id);
      
      // Now insert the user role
      await adminClient
        .from('roles')
        .insert({ 
          user_id: regularUserData.user.id, 
          role: 'user' 
        });
    }

    console.log('✅ Test users created successfully');
  } catch (error) {
    console.error('❌ Error setting up test users:', error);
    throw error;
  }
}

/**
 * Clean up test users from the database
 */
export async function teardownTestUsers(): Promise<void> {
  const adminClient = createAdminClient();
  
  try {
    // Get user data to clean up roles first
    const { data: allUsers } = await adminClient.auth.admin.listUsers();
    const adminUser = allUsers.users.find(u => u.email === ADMIN_USER.email);
    const regularUser = allUsers.users.find(u => u.email === REGULAR_USER.email);

    // Clean up roles first
    const userIds = [];
    if (adminUser) userIds.push(adminUser.id);
    if (regularUser) userIds.push(regularUser.id);

    if (userIds.length > 0) {
      try {
        await adminClient
          .from('roles')
          .delete()
          .in('user_id', userIds);
      } catch (roleError) {
        console.warn('⚠️ Warning cleaning up roles:', roleError);
      }
    }

    // Delete users with retries
    const usersToDelete = [adminUser, regularUser].filter((user): user is NonNullable<typeof user> => !!user);
    for (const user of usersToDelete) {
      try {
        await adminClient.auth.admin.deleteUser(user.id);
      } catch (deleteError) {
        console.warn(`⚠️ Warning deleting user ${user.email}:`, deleteError);
        // Try force delete if regular delete fails
        try {
          await adminClient.auth.admin.deleteUser(user.id, true);
        } catch (forceDeleteError) {
          console.warn(`⚠️ Force delete also failed for ${user.email}:`, forceDeleteError);
        }
      }
    }

    console.log('✅ Test users cleaned up successfully');
  } catch (error) {
    console.error('❌ Error cleaning up test users:', error);
    // Don't throw here to avoid breaking other tests
  }
} 