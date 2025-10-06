'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addMemberToOrganisation } from '@/app/admin/users/actions';
import { useRouter } from 'next/navigation';
import type { AdminOrganisation, AdminUser } from '@/app/admin/users/actions';

interface ManageMembersFormProps {
  organisation: AdminOrganisation;
  availableUsers: AdminUser[];
}

export function ManageMembersForm({ organisation, availableUsers }: ManageMembersFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const userId = String(formData.get('user_id')).trim();
    const role = String(formData.get('role')).trim();

    if (!userId || !role) {
      setError('User and role are required');
      setIsSubmitting(false);
      return;
    }

    try {
      await addMemberToOrganisation({
        user_id: userId,
        organisation_id: organisation.id,
        role: role
      });
      
      setSuccess('Member added successfully!');
      router.refresh();
      
      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add member';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (availableUsers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          All users are already members of this organisation.
        </p>
        <p className="text-sm text-muted-foreground">
          Create new users in the admin panel to add more members.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="user_id">Select User</Label>
        <Select name="user_id" required>
          <SelectTrigger>
            <SelectValue placeholder="Choose a user to add" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name || user.email} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select name="role" required>
          <SelectTrigger>
            <SelectValue placeholder="Choose a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Admin: Full access to organisation settings and member management<br />
          Member: Can access organisation resources and collaborate<br />
          Viewer: Read-only access to organisation content
        </p>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Adding Member...' : 'Add Member'}
      </Button>
    </form>
  );
} 