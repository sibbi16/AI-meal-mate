import { createClient } from '@/utils/supabase/server';
import SideNavigation from './SideNavigation';

export default async function Navbar() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    // Check if user has admin role
    const { data: roleData } = await supabase
      .from('roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    isAdmin = roleData?.role === 'admin';
  }

  return (
    <>
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <SideNavigation user={user} isAdmin={isAdmin} />
    </>
  );
}
