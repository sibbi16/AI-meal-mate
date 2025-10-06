import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthTypes, getOrganisationSettings } from '@/utils/auth-helpers/settings';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function AdminSystemPage() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return redirect('/auth/login');
  }

  // Check if user has admin role
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || roleData?.role !== 'admin') {
    return redirect('/');
  }

  const authSettings = getAuthTypes();
  const orgSettings = getOrganisationSettings();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">System Settings</h1>
          <p className="text-gray-400">
            View current system configuration
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">
            ← Back to Admin
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Authentication Settings */}
        <div className="bg-zinc-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Authentication Settings</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h3 className="font-medium mb-2">OAuth</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                authSettings.allowOauth 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {authSettings.allowOauth ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <h3 className="font-medium mb-2">Email Authentication</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                authSettings.allowEmail 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {authSettings.allowEmail ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <h3 className="font-medium mb-2">Password Authentication</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                authSettings.allowPassword 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {authSettings.allowPassword ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Organisation Settings */}
        <div className="bg-zinc-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Organisation Settings</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-medium mb-2">Organisations</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                orgSettings.allowOrganisations 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {orgSettings.allowOrganisations ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <h3 className="font-medium mb-2">User Can Create Organisations</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                orgSettings.allowUserCreateOrganisations 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {orgSettings.allowUserCreateOrganisations ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <h3 className="font-medium mb-2">Organisation Invites</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                orgSettings.allowOrganisationInvites 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {orgSettings.allowOrganisationInvites ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <h3 className="font-medium mb-2">Organisation Role Management</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                orgSettings.allowOrganisationRoleManagement 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {orgSettings.allowOrganisationRoleManagement ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Environment Information */}
        <div className="bg-zinc-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Environment Information</h2>
          <div className="grid gap-4">
            <div>
              <h3 className="font-medium mb-2">Supabase URL</h3>
              <p className="text-sm text-gray-400 font-mono">
                {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'}
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Site URL</h3>
              <p className="text-sm text-gray-400 font-mono">
                {process.env.NEXT_PUBLIC_SITE_URL || 'Not configured'}
              </p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="text-sm">
            <strong>Note:</strong> These settings are configured in the authentication settings file. 
            To modify them, update the configuration in <code>utils/auth-helpers/settings.ts</code>.
          </p>
        </div>
      </div>
    </div>
  );
} 