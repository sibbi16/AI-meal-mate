'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getURL, getErrorRedirect, getStatusRedirect } from 'utils/helpers';
import { getAuthTypes } from 'utils/auth-helpers/settings';

function isValidEmail(email: string) {
  var regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return regex.test(email);
}

export async function redirectToPath(path: string) {
  return redirect(path);
}

export async function SignOut(formData?: FormData) {
  const pathName = String(formData?.get('pathName') || '/').trim();

  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return getErrorRedirect(
      pathName,
      'Hmm... Something went wrong.',
      'You could not be signed out.'
    );
  }

  return '/auth/login';
}

export async function SignIn(email: string, password: string) {
  const supabase = createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Check if user is active
  if (authData.user) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.error('Error checking user status:', userError);
      // If we can't check the status, allow login but log the error
    } else if (userData && userData.is_active === false) {
      // Sign out the user immediately
      await supabase.auth.signOut();
      throw new Error('Your account has been deactivated. Please contact an administrator.');
    }
  }

  return '/';
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password')).trim();
  const passwordConfirm = String(formData.get('passwordConfirm')).trim();

  // Check that the password and confirmation match
  if (password !== passwordConfirm) {
    return getErrorRedirect(
      '/auth/update-password',
      'Your password could not be updated.',
      'Passwords do not match.'
    );
  }

  const supabase = createClient();
  const { error, data } = await supabase.auth.updateUser({
    password
  });

  if (error) {
    return getErrorRedirect(
      '/auth/update-password',
      'Your password could not be updated.',
      error.message
    );
  } else if (data.user) {
    return getStatusRedirect(
      '/',
      'Success!',
      'Your password has been updated.'
    );
  } else {
    return getErrorRedirect(
      '/auth/update-password',
      'Hmm... Something went wrong.',
      'Your password could not be updated.'
    );
  }
}

export async function updateEmail(formData: FormData) {
  // Get form data
  const newEmail = String(formData.get('newEmail')).trim();

  // Check that the email is valid
  if (!isValidEmail(newEmail)) {
    return getErrorRedirect(
      '/',
      'Your email could not be updated.',
      'Invalid email address.'
    );
  }

  const supabase = createClient();

  const callbackUrl = getURL(
    getStatusRedirect('/', 'Success!', `Your email has been updated.`)
  );

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    {
      emailRedirectTo: callbackUrl
    }
  );

  if (error) {
    return getErrorRedirect(
      '/account',
      'Your email could not be updated.',
      error.message
    );
  } else {
    return getStatusRedirect(
      '/account',
      'Confirmation emails sent.',
      `You will need to confirm the update by clicking the links sent to both the old and new email addresses.`
    );
  }
}

export async function updateName(formData: FormData) {
  // Get form data
  const fullName = String(formData.get('fullName')).trim();

  const supabase = createClient();
  const { error, data } = await supabase.auth.updateUser({
    data: { full_name: fullName }
  });

  if (error) {
    return getErrorRedirect(
      '/account',
      'Your name could not be updated.',
      error.message
    );
  } else if (data.user) {
    return getStatusRedirect(
      '/account',
      'Success!',
      'Your name has been updated.'
    );
  } else {
    return getErrorRedirect(
      '/account',
      'Hmm... Something went wrong.',
      'Your name could not be updated.'
    );
  }
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email')).trim();

  if (!isValidEmail(email)) {
    return getErrorRedirect(
      '/auth/forgot-password',
      'Invalid email address.',
      'Please enter a valid email address.'
    );
  }

  const supabase = createClient();
  const supabaseAdmin = createAdminClient();

  try {
    // First check if auth user exists - we need to use listUsers and filter by email
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error listing users:', authError);
      // Continue with reset attempt if we can't check status
    }

    let authUser = null;
    if (authUsers && authUsers.users) {
      authUser = authUsers.users.find(user => user.email === email);
    }

    if (authUser) {
      // Check if the user is active in our users table using admin client for permissions
      const { data: userData, error: userDataError } = await supabaseAdmin
        .from('users')
        .select('is_active')
        .eq('id', authUser.id)
        .single();

      if (userDataError) {
        console.error('Error checking user active status:', userDataError);
        // Continue with reset attempt if we can't check status
      } else if (userData && userData.is_active === false) {
        return getErrorRedirect(
          '/auth/forgot-password',
          'Your account has been deactivated.',
          'Please contact an administrator for assistance.'
        );
      }
    }

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getURL('/auth/callback?redirectTo=/auth/update-password'),
    });

    if (error) {
      return getErrorRedirect(
        '/auth/forgot-password',
        'Unable to send password reset email.',
        error.message
      );
    }

    return getStatusRedirect(
      '/auth/forgot-password',
      'Check your email.',
      'Password reset instructions sent.'
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return getErrorRedirect(
      '/auth/forgot-password',
      'Unable to send password reset email.',
      errorMessage
    );
  }
}
