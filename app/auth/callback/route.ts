import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

export async function GET(request: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the `@supabase/ssr` package. It exchanges an auth code for the user's session.
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/';

  // Handle explicit error parameters first
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      getErrorRedirect(
        `${requestUrl.origin}/auth/login`,
        error,
        errorDescription || 'An authentication error occurred.'
      )
    );
  }

  // Handle missing code - for invite links, this is normal as they use URL fragments
  if (!code) {
    console.log('No code provided - likely an invite link with URL fragment');
    // For invite links, redirect to a client-side handler that can process the URL fragment
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/callback-client${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`
    );
  }

  const supabase = createClient();

  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError, code);
      
      // Provide more specific error handling
      if (exchangeError.message.includes('expired')) {
        return NextResponse.redirect(
          getErrorRedirect(
            `${requestUrl.origin}/auth/login`,
            'Link expired',
            'The authentication link has expired. Please request a new one.'
          )
        );
      } else if (exchangeError.message.includes('invalid')) {
        return NextResponse.redirect(
          getErrorRedirect(
            `${requestUrl.origin}/auth/login`,
            'Invalid link',
            'The authentication link is invalid. Please request a new one.'
          )
        );
      } else {
        return NextResponse.redirect(
          getErrorRedirect(
            `${requestUrl.origin}/auth/login`,
            'Authentication failed',
            "Sorry, we weren't able to authenticate you. Please try again."
          )
        );
      }
    }

    // Check if this is a password reset or recovery flow
    const { data: { user } } = await supabase.auth.getUser();
    
    // For password reset and invites, redirect to update password
    if (user && redirectTo === '/auth/update-password') {
      return NextResponse.redirect(
        getStatusRedirect(
          `${requestUrl.origin}/auth/update-password`,
          'Welcome!',
          'Please set your password to complete your account setup.'
        )
      );
    }

    // URL to redirect to after code exchange completes
    return NextResponse.redirect(
      getStatusRedirect(
        `${requestUrl.origin}${redirectTo}`,
        'Success!',
        'You have been signed in.'
      )
    );
  } catch (error) {
    console.error('Unexpected error in auth callback:', error);
    return NextResponse.redirect(
      getErrorRedirect(
        `${requestUrl.origin}/auth/login`,
        'Error',
        'An unexpected error occurred. Please try again.'
      )
    );
  }
}
