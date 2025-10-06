'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AuthCallbackClient() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Checking URL fragment...');
        
        // Get the URL fragment (everything after #)
        const fragment = window.location.hash.substring(1);
        console.log('URL fragment:', fragment);
        
        if (!fragment) {
          console.error('No URL fragment found');
          setStatus('No authentication tokens found');
          window.location.href = `/auth/login?error=Invalid%20Link&error_description=The%20authentication%20link%20is%20missing%20required%20tokens.`;
          return;
        }
        
        const params = new URLSearchParams(fragment);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        
        console.log('Parsed tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
        
        if (accessToken && refreshToken) {
          setStatus('Processing authentication...');
          
          // Store tokens temporarily for the session
          sessionStorage.setItem('temp_access_token', accessToken);
          sessionStorage.setItem('temp_refresh_token', refreshToken);
          
          setStatus('Redirecting...');
          
          // Check if this is an invite
          if (type === 'invite') {
            console.log('Redirecting to update password for invite');
            const redirectUrl = '/auth/update-password?status=Welcome!&status_description=Please%20set%20your%20password%20to%20complete%20your%20account%20setup.';
            window.location.href = redirectUrl;
          } else {
            console.log('Redirecting to:', redirectTo);
            window.location.href = redirectTo;
          }
        } else {
          console.error('Missing tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
          setStatus('Missing authentication tokens');
          window.location.href = `/auth/login?error=Invalid%20Link&error_description=The%20authentication%20link%20is%20missing%20required%20tokens.`;
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        window.location.href = `/auth/login?error=Authentication%20Error&error_description=An%20unexpected%20error%20occurred.`;
      }
    };

    // Add a small delay to ensure the page is fully loaded
    setTimeout(handleAuthCallback, 100);
  }, [redirectTo]);

  return (
    <>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">{status}</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we process your authentication...</p>
        </div>
      </div>
    </>
  );
} 