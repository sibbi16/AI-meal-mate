'use client';

import { AuthProvider } from '@/providers/auth-provider';
import { QueryResult, UserWithRoles } from '@/utils/supabase/server';

export default function Providers({ userQueryResult, children }: { userQueryResult?: QueryResult<UserWithRoles>, children: React.ReactNode }) {
  return (
    <AuthProvider userQueryResult={userQueryResult}>
      {children}
    </AuthProvider>
  );
}