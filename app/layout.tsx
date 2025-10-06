import { Metadata } from 'next';
import Navbar from '@/components/ui/Navbar';
import MainContentWrapper from '@/components/ui/Navbar/MainContentWrapper';
import { Toaster } from '@/components/ui/sonner';
import { PropsWithChildren, Suspense } from 'react';
import { getURL } from '@/utils/helpers';
import { cookies } from 'next/headers';
import Providers from '@/providers/providers';
import 'styles/main.css';
import { createClient, getCurrentUserQueryResult } from '@/utils/supabase/server';

const title = 'Meal Mate - AI Cooking Assistant';
const description = 'Your intelligent meal planning assistant. Save recipes and create personalized weekly meal plans.';

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),
  title: title,
  description: description,
  openGraph: {
    title: title,
    description: description
  }
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value;
  console.log('using theme', theme);

  const supabase = createClient();
  let userQueryResult;
  
  try {
    userQueryResult = await getCurrentUserQueryResult(supabase);
  } catch (error) {
    console.error('Error getting user query result:', error);
    // Provide a fallback QueryResult
    userQueryResult = {
      queryKey: 'current_user_fallback',
      data: [],
      tableName: 'users',
      url: '',
      searchParams: {}
    };
  }

  return (
    <html lang="en" className={theme || 'light'}>
      <Providers userQueryResult={userQueryResult}>
        <body>
          <Navbar />
          <MainContentWrapper>
            {children}
          </MainContentWrapper>
          <Suspense>
            <Toaster />
          </Suspense>
        </body>
      </Providers>
    </html>
  );
}
