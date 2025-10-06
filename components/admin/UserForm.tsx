'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUser, updateUser, AdminUser } from '@/app/admin/users/actions';
import { getOrganisationSettings } from '@/utils/auth-helpers/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Organisation {
  id: string;
  name: string;
  slug: string;
}

interface UserFormProps {
  organisations: Organisation[];
  user?: AdminUser; // If provided, we're editing; otherwise creating
  mode: 'create' | 'edit';
}

export default function UserForm({ organisations, user, mode }: UserFormProps) {
  const router = useRouter();
  const { allowOrganisations } = getOrganisationSettings();
  
  const [formData, setFormData] = useState({
    email: user?.email || '',
    full_name: user?.full_name || '',
    role: (user?.role as 'admin' | 'user') || 'user',
    organisation_id: '',
    organisation_role: 'user'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'create') {
        const createData = {
          email: formData.email.trim(),
          full_name: formData.full_name.trim() || undefined,
          role: formData.role as 'admin' | 'user',
          organisation_id: formData.organisation_id || undefined,
          organisation_role: formData.organisation_role || undefined
        };

        await createUser(createData);
        router.push('/admin/users');
      } else {
        const updateData = {
          email: formData.email.trim(),
          full_name: formData.full_name.trim() || undefined,
          role: formData.role
        };

        if (!user?.id) {
          throw new Error('User ID is required for editing');
        }

        await updateUser(user.id, updateData);
        router.push('/admin/users');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save user';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            type="text"
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="John Doe"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">System Role *</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'user' })}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === 'create' && allowOrganisations && organisations.length > 0 && (
        <>
          <div className="space-y-2">
            <Label htmlFor="organisation_id">Add to Organisation (Optional)</Label>
            <Select value={formData.organisation_id} onValueChange={(value) => setFormData({ ...formData, organisation_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select an organisation..." />
              </SelectTrigger>
              <SelectContent>
                {organisations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.organisation_id && (
            <div className="space-y-2">
              <Label htmlFor="organisation_role">Organisation Role</Label>
              <Select value={formData.organisation_role} onValueChange={(value) => setFormData({ ...formData, organisation_role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/users')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
} 