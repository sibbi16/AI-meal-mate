'use client';

import { Button } from '@/components/ui/button';
import { updatePassword } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/hooks';

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const queryParams = useSearchParams();
  const error = queryParams.get('error');
  const errorDescription = queryParams.get('error_description');

  useEffect(() => {
    const setupSession = async () => {
      try {
        const accessToken = sessionStorage.getItem('temp_access_token');
        const refreshToken = sessionStorage.getItem('temp_refresh_token');
        
        if (accessToken && refreshToken) {
          console.log('Setting session from stored tokens');
          const supabase = createClient();
          
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('Session setup error:', error);
          } else {
            console.log('Session set successfully');
          }
          
          // Clear the temporary tokens regardless of success/failure
          sessionStorage.removeItem('temp_access_token');
          sessionStorage.removeItem('temp_refresh_token');
        }
      } catch (error) {
        console.error('Session setup error:', error);
      }
    };

    // Set up session in background but don't block form rendering
    setupSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsLoading(true);
    await handleRequest(e, updatePassword, router);
    setIsLoading(false);
  };

  return (
    <div className={cn('flex flex-col gap-6')}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Set Your Password</CardTitle>
          <CardDescription>Please enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} method="POST">
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="New password"
                  required
                  name="password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="passwordConfirm">Confirm new password</Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  placeholder="Confirm new password"
                  required
                  name="passwordConfirm"
                />
              </div>
              {error && <p className="text-sm text-red-500">{errorDescription}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save new password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
