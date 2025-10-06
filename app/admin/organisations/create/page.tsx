import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getOrganisationSettings } from '@/utils/auth-helpers/settings';
import { createOrganisation } from '@/app/admin/users/actions';
import Link from 'next/link';
import CreateOrganisationForm from '@/components/ui/CreateOrganisationForm';

export default async function CreateOrganisationPage() {
  const { allowOrganisations } = getOrganisationSettings();
  
  if (!allowOrganisations) {
    return redirect('/admin');
  }

  // Verify admin access
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/auth/login');
  }

  // Check if user has admin role
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || roleData?.role !== 'admin') {
    redirect('/admin');
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link 
          href="/admin/organisations"
          className="text-primary hover:text-primary/80 mb-4 inline-block"
        >
          ← Back to Organisations
        </Link>
        <h1 className="text-3xl font-bold mb-2">Create Organisation</h1>
        <p className="text-muted-foreground">
          Create a new organisation and manage its members
        </p>
      </div>

      <div className="bg-card p-6 rounded-lg border">
        <CreateOrganisationForm />
      </div>
    </div>
  );
} 