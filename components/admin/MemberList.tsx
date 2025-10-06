'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateMemberRole, removeMemberFromOrganisation } from '@/app/admin/users/actions';
import { useRouter } from 'next/navigation';
import type { AdminOrganisation } from '@/app/admin/users/actions';

interface MemberListProps {
  organisation: AdminOrganisation;
  memberCount: number;
}

export function MemberList({ organisation, memberCount }: MemberListProps) {
  const [updatingMembers, setUpdatingMembers] = useState<Set<string>>(new Set());
  const [removingMembers, setRemovingMembers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRoleUpdate = async (membershipId: string, newRole: string) => {
    setUpdatingMembers(prev => new Set(prev).add(membershipId));
    setError(null);

    try {
      await updateMemberRole(membershipId, { role: newRole });
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role';
      setError(errorMessage);
    } finally {
      setUpdatingMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(membershipId);
        return newSet;
      });
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!confirm('Are you sure you want to remove this member from the organisation?')) {
      return;
    }

    setRemovingMembers(prev => new Set(prev).add(membershipId));
    setError(null);

    try {
      await removeMemberFromOrganisation(membershipId, organisation.id);
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove member';
      setError(errorMessage);
    } finally {
      setRemovingMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(membershipId);
        return newSet;
      });
    }
  };

  if (memberCount === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          No members have been added to this organisation yet.
        </p>
        <p className="text-sm text-muted-foreground">
          Use the form on the left to add the first member.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {organisation.organisation_memberships?.map((membership) => (
          <div key={membership.id} className="bg-secondary/50 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {membership.user?.avatar_url && (
                  <img 
                    src={membership.user.avatar_url} 
                    alt="Avatar" 
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">
                    {membership.user?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {membership.user?.id || membership.user_id}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Role:</span>
                <Select 
                  value={membership.role} 
                  onValueChange={(value) => handleRoleUpdate(membership.id, value)}
                  disabled={updatingMembers.has(membership.id)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                {updatingMembers.has(membership.id) && (
                  <span className="text-xs text-muted-foreground">Updating...</span>
                )}
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveMember(membership.id)}
                disabled={removingMembers.has(membership.id)}
              >
                {removingMembers.has(membership.id) ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Total Members: {memberCount}
        </p>
      </div>
    </div>
  );
} 