import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getAllUsers, AdminUser } from '@/app/admin/users/actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mail, 
  Calendar, 
  Clock, 
  Shield, 
  User, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Edit,
  Settings,
  Activity
} from 'lucide-react';
import UserActionButtons from '@/components/admin/UserActionButtons';

interface UserDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  let users: AdminUser[] = [];
  let error: string | null = null;

  try {
    users = await getAllUsers();
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    error = errorMessage;
  }

  const currentUser = users.find(u => u.id === id);

  if (!currentUser) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-muted-foreground mb-6">The user you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/admin/users">
              Back to Users
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">Admin</Badge>;
      default:
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">User</Badge>;
    }
  };

  const getStatusBadge = (confirmed?: string) => {
    if (confirmed) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Confirmed</Badge>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
        </div>
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/admin/users">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Link>
        </Button>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={currentUser.avatar_url || ''} alt={currentUser.full_name || 'User'} />
              <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600">
                {currentUser.full_name?.charAt(0) || currentUser.email?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{currentUser.full_name || 'Unnamed User'}</h1>
              <p className="text-muted-foreground text-lg flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {currentUser.email}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/admin/users/${currentUser.id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              Edit User
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading user: {error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  User Details
                </CardTitle>
                <CardDescription>
                  Basic information about this user account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                    <p className="text-sm">{currentUser.email}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-sm">{currentUser.full_name || 'Not provided'}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">System Role</label>
                    <div>{getRoleBadge(currentUser.role)}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                    <div>{getStatusBadge(currentUser.email_confirmed_at)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Account Activity
                </CardTitle>
                <CardDescription>
                  Recent activity and account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Account Created
                    </label>
                    <p className="text-sm font-medium">{formatDate(currentUser.created_at)}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Last Sign In
                    </label>
                    <p className="text-sm font-medium">{formatDateTime(currentUser.last_sign_in_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organisations Card */}
            {currentUser.organisations && currentUser.organisations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Organisations
                  </CardTitle>
                  <CardDescription>
                    Organisations this user is a member of
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {currentUser.organisations.map((org, index) => {
                      const orgRoleClass = org.role === 'admin' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800';
                      
                      return (
                        <Card key={index} className="border-dashed">
                          <CardContent className="pt-4">
                            <h3 className="font-semibold text-sm">{org.organisation?.name}</h3>
                            <p className="text-xs text-muted-foreground">/{org.organisation?.slug}</p>
                            <Badge variant="outline" className={`mt-2 text-xs ${orgRoleClass}`}>
                              {org.role}
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common actions for this user
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <UserActionButtons user={currentUser} variant="sidebar" />
                <Separator />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Edit user information</p>
                  <p>• Send password reset email</p>
                  <p>• Delete user account</p>
                </div>
              </CardContent>
            </Card>

            {/* User Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Account Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Organisations</span>
                  <Badge variant="outline">
                    {currentUser.organisations?.length || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Account Age</span>
                  <span className="text-sm font-medium">
                    {currentUser.created_at ? 
                      `${Math.floor((Date.now() - new Date(currentUser.created_at).getTime()) / (1000 * 60 * 60 * 24))} days` : 
                      'Unknown'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
} 