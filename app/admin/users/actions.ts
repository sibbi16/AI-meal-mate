'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { getOrganisationSettings } from '@/utils/auth-helpers/settings';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getURL } from '@/utils/helpers';
import type { Database, Tables } from '@/utils/supabase/types';

// Admin client with service role access
const supabaseAdmin = createAdminClient();

export interface OrganisationMembership {
  id: string;
  user_id: string;
  organisation_id: string;
  role: string;
  organisation?: {
    id: string;
    name: string;
    slug: string;
  };
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface AdminUser {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  email_confirmed_at?: string;
  created_at?: string;
  last_sign_in_at?: string;
  role?: string;
  is_active?: boolean;
  organisations?: OrganisationMembership[];
}

export interface CreateUserData {
  email: string;
  full_name?: string;
  role?: 'admin' | 'user';
  organisation_id?: string;
  organisation_role?: string;
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  role?: string;
  password?: string;
}

interface AuthUpdateData {
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

export interface CreateOrganisationData {
  name: string;
  slug: string;
}

export interface UpdateOrganisationData {
  name?: string;
  slug?: string;
}

export interface AdminOrganisation extends Tables<'organisations'> {
  organisation_memberships?: OrganisationMembership[];
}

// Check if current user is admin
async function verifyAdminAccess(): Promise<string> {
  const supabase = createServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/auth/login');
    return 'Unauthorized: Admin access required';
  }

  // Check if user has admin role
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || roleData?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  return user.id;
}

// Get all users with their roles and organisations
export async function getAllUsers(): Promise<AdminUser[]> {
  await verifyAdminAccess();

  // Get users from auth.users
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (authError) {
    throw new Error(`Failed to fetch users: ${authError.message}`);
  }

  // Get roles and organisations for users
  const userIds = authUsers.users.map(user => user.id);
  
  const { data: roles } = await supabaseAdmin
    .from('roles')
    .select('user_id, role')
    .in('user_id', userIds);

  const { data: organisations } = await supabaseAdmin
    .from('organisation_memberships')
    .select(`
      id,
      user_id,
      organisation_id,
      role,
      organisation:organisations(id, name, slug)
    `)
    .in('user_id', userIds);

  // Get public user data
  const { data: publicUsers } = await supabaseAdmin
    .from('users')
    .select('id, full_name, avatar_url, is_active')
    .in('id', userIds);

  // Combine all data
  const users: AdminUser[] = authUsers.users.map(authUser => {
    const role = roles?.find(r => r.user_id === authUser.id);
    const userOrgs = organisations?.filter(org => org.user_id === authUser.id) || [];
    const publicUser = publicUsers?.find(p => p.id === authUser.id);

    return {
      id: authUser.id,
      email: authUser.email,
      full_name: publicUser?.full_name || '',
      avatar_url: publicUser?.avatar_url || '',
      email_confirmed_at: authUser.email_confirmed_at,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at,
      role: role?.role || 'user',
      is_active: publicUser?.is_active ?? true,
      organisations: userOrgs
    };
  });

  return users;
}

// Get all organisations with their members
export async function getAllOrganisations(): Promise<AdminOrganisation[]> {
  await verifyAdminAccess();

  const { data: organisations, error } = await supabaseAdmin
    .from('organisations')
    .select(`
      *,
      organisation_memberships(
        id,
        user_id,
        organisation_id,
        role,
        user:users(id, full_name, avatar_url)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch organisations: ${error.message}`);
  }

  return organisations || [];
}

// Create new user
export async function createUser(data: CreateUserData) {
  await verifyAdminAccess();

  try {
    // Create auth user and let the database trigger handle public user record and role creation
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: getURL('/auth/callback?redirectTo=/auth/update-password'),
      data: {
        full_name: data.full_name || '',
        system_role: data.role || 'user',
        ...(data.organisation_id && data.organisation_role && {
          organisation_id: data.organisation_id,
          organisation_role: data.organisation_role
        })
      }
    });

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    if (!authUser.user) {
      throw new Error('Failed to create user: No user data returned');
    }

    // The database trigger automatically creates:
    // - public.users record
    // - public.roles record  
    // - public.organisation_memberships record (if organisation data provided)
    // So we don't need to manually insert into these tables

    revalidatePath('/admin/users');
    return { success: true, user: authUser.user };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
    throw new Error(errorMessage);
  }
}

// Send welcome email to new user (re-invite if needed)
export async function sendWelcomeEmail(userId: string) {
  await verifyAdminAccess();

  try {
    // Get user email
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getUserError || !authUser.user?.email) {
      throw new Error('User not found or email not available');
    }

    // Re-send invite email using admin.inviteUserByEmail
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(authUser.user.email, {
      redirectTo: getURL('/auth/callback?redirectTo=/auth/update-password'),
      data: authUser.user.user_metadata
    });

    if (inviteError) {
      throw new Error(`Failed to send welcome email: ${inviteError.message}`);
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send welcome email';
    throw new Error(errorMessage);
  }
}

// Send password reset or invite based on user verification status
export async function sendPasswordResetOrInvite(userId: string) {
  await verifyAdminAccess();

  try {
    // Get user email and verification status
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getUserError || !authUser.user?.email) {
      throw new Error('User not found or email not available');
    }

    // Check if user is active before sending any emails
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('is_active')
      .eq('id', userId)
      .single();

    if (userDataError) {
      console.error('Error checking user active status:', userDataError);
      // Continue if we can't check status, but log the error
    } else if (userData && userData.is_active === false) {
      throw new Error('Cannot send emails to deactivated users. Please reactivate the user first.');
    }

    const isVerified = !!authUser.user.email_confirmed_at;

    if (isVerified) {
      // User is verified - send password reset email
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(authUser.user.email, {
        redirectTo: getURL('/auth/callback?redirectTo=/auth/update-password'),
      });

      if (resetError) {
        throw new Error(`Failed to send password reset email: ${resetError.message}`);
      }

      return { success: true, type: 'password_reset' };
    } else {
      // User is not verified - send invite email
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(authUser.user.email, {
        redirectTo: getURL('/auth/callback?redirectTo=/auth/update-password'),
        data: authUser.user.user_metadata
      });

      if (inviteError) {
        throw new Error(`Failed to send invite email: ${inviteError.message}`);
      }

      return { success: true, type: 'invite' };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    throw new Error(errorMessage);
  }
}

// Update user
export async function updateUser(userId: string, data: UpdateUserData) {
  await verifyAdminAccess();

  try {
    // Update auth user
    const updateData: AuthUpdateData = {};
    if (data.email) updateData.email = data.email;
    if (data.full_name !== undefined) {
      updateData.user_metadata = { full_name: data.full_name };
    }

    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        updateData
      );

      if (authError) {
        throw new Error(`Failed to update user: ${authError.message}`);
      }
    }

    // Update user profile
    if (data.full_name !== undefined) {
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .update({ full_name: data.full_name || null })
        .eq('id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }
    }

    // Update role
    if (data.role) {
      const { error: roleError } = await supabaseAdmin
        .from('roles')
        .upsert([{
          user_id: userId,
          role: data.role as 'admin' | 'user'
        }]);

      if (roleError) {
        console.error('Role update error:', roleError);
      }
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
    throw new Error(errorMessage);
  }
}

// Delete user
export async function deleteUser(userId: string) {
  await verifyAdminAccess();

  try {
    // Delete from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      throw new Error(`Failed to delete user: ${authError.message}`);
    }

    // The database cascades will handle the rest via RLS policies
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
    throw new Error(errorMessage);
  }
}

// Create new organisation
export async function createOrganisation(data: CreateOrganisationData) {
  await verifyAdminAccess();

  try {
    const { data: organisation, error } = await supabaseAdmin
      .from('organisations')
      .insert([{
        name: data.name,
        slug: data.slug
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create organisation: ${error.message}`);
    }

    revalidatePath('/admin/organisations');
    return { success: true, organisation };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create organisation';
    throw new Error(errorMessage);
  }
}

// Update organisation
export async function updateOrganisation(organisationId: string, data: UpdateOrganisationData) {
  await verifyAdminAccess();

  try {
    const { data: organisation, error } = await supabaseAdmin
      .from('organisations')
      .update(data)
      .eq('id', organisationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update organisation: ${error.message}`);
    }

    revalidatePath('/admin/organisations');
    return { success: true, organisation };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update organisation';
    throw new Error(errorMessage);
  }
}

// Delete organisation
export async function deleteOrganisation(organisationId: string) {
  await verifyAdminAccess();

  try {
    const { error } = await supabaseAdmin
      .from('organisations')
      .delete()
      .eq('id', organisationId);

    if (error) {
      throw new Error(`Failed to delete organisation: ${error.message}`);
    }

    revalidatePath('/admin/organisations');
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete organisation';
    throw new Error(errorMessage);
  }
}

// Send magic link
export async function sendMagicLink(userId: string) {
  await verifyAdminAccess();

  try {
    // Get user email
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getUserError || !authUser.user?.email) {
      throw new Error('User not found or email not available');
    }

    // Send magic link
    const { error: magicError } = await supabaseAdmin.auth.signInWithOtp({
      email: authUser.user.email,
      options: {
        emailRedirectTo: getURL('/auth/callback')
      }
    });

    if (magicError) {
      throw new Error(`Failed to send magic link: ${magicError.message}`);
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
    throw new Error(errorMessage);
  }
}

// Reset user password (admin sets new password)
export async function resetUserPassword(userId: string, newPassword: string) {
  await verifyAdminAccess();

  try {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error(`Failed to reset password: ${updateError.message}`);
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
    throw new Error(errorMessage);
  }
}

// Organisation member management functions

export interface AddMemberData {
  user_id: string;
  organisation_id: string;
  role: string;
}

export interface UpdateMemberData {
  role: string;
}

// Add member to organisation
export async function addMemberToOrganisation(data: AddMemberData) {
  await verifyAdminAccess();

  try {
    const { error } = await supabaseAdmin
      .from('organisation_memberships')
      .insert([{
        user_id: data.user_id,
        organisation_id: data.organisation_id,
        role: data.role
      }]);

    if (error) {
      throw new Error(`Failed to add member: ${error.message}`);
    }

    revalidatePath('/admin/organisations');
    revalidatePath(`/admin/organisations/${data.organisation_id}`);
    revalidatePath(`/admin/organisations/${data.organisation_id}/manage`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add member';
    throw new Error(errorMessage);
  }
}

// Update member role
export async function updateMemberRole(membershipId: string, data: UpdateMemberData) {
  await verifyAdminAccess();

  try {
    const { error } = await supabaseAdmin
      .from('organisation_memberships')
      .update({ role: data.role })
      .eq('id', membershipId);

    if (error) {
      throw new Error(`Failed to update member role: ${error.message}`);
    }

    revalidatePath('/admin/organisations');
    revalidatePath(`/admin/organisations/*`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update member role';
    throw new Error(errorMessage);
  }
}

// Remove member from organisation
export async function removeMemberFromOrganisation(membershipId: string, organisationId: string) {
  await verifyAdminAccess();

  try {
    const { error } = await supabaseAdmin
      .from('organisation_memberships')
      .delete()
      .eq('id', membershipId);

    if (error) {
      throw new Error(`Failed to remove member: ${error.message}`);
    }

    revalidatePath('/admin/organisations');
    revalidatePath(`/admin/organisations/${organisationId}`);
    revalidatePath(`/admin/organisations/${organisationId}/manage`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove member';
    throw new Error(errorMessage);
  }
}

// Get organisation by ID with members
export async function getOrganisationById(organisationId: string): Promise<AdminOrganisation | null> {
  await verifyAdminAccess();

  const { data: organisation, error } = await supabaseAdmin
    .from('organisations')
    .select(`
      *,
      organisation_memberships(
        id,
        user_id,
        organisation_id,
        role,
        user:users(id, full_name, avatar_url)
      )
    `)
    .eq('id', organisationId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch organisation: ${error.message}`);
  }

  return organisation;
}

// Deactivate user
export async function deactivateUser(userId: string) {
  await verifyAdminAccess();

  // Update the user's is_active status to false
  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_active: false })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to deactivate user: ${error.message}`);
  }

  revalidatePath('/admin/users');
}

// Reactivate user
export async function reactivateUser(userId: string) {
  await verifyAdminAccess();

  // Update the user's is_active status to true
  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_active: true })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to reactivate user: ${error.message}`);
  }

  revalidatePath('/admin/users');
}