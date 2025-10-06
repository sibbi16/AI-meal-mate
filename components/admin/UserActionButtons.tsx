'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { deleteUser, sendPasswordResetOrInvite, deactivateUser, reactivateUser } from '@/app/admin/users/actions';
import { useRouter } from 'next/navigation';
import type { AdminUser } from '@/app/admin/users/actions';
import { Edit, Mail, Trash2, UserX, UserCheck } from 'lucide-react';

interface UserActionButtonsProps {
  user: AdminUser;
  variant?: 'compact' | 'sidebar';
}

export default function UserActionButtons({ user, variant = 'compact' }: UserActionButtonsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete user ${user.email}? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteUser(user.id);
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setError(null);

    try {
      const result = await sendPasswordResetOrInvite(user.id);
      
      if (result.type === 'password_reset') {
        alert('Password reset email sent successfully!');
      } else {
        alert('Invite email sent successfully!');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
      setError(errorMessage);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleToggleActive = async () => {
    const isActive = user.is_active ?? true;
    const action = isActive ? 'deactivate' : 'reactivate';
    const actionText = isActive ? 'deactivate' : 'reactivate';
    
    if (!confirm(`Are you sure you want to ${actionText} user ${user.email}?`)) {
      return;
    }

    setIsTogglingActive(true);
    setError(null);

    try {
      if (isActive) {
        await deactivateUser(user.id);
        alert('User deactivated successfully!');
      } else {
        await reactivateUser(user.id);
        alert('User reactivated successfully!');
      }
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${actionText} user`;
      setError(errorMessage);
    } finally {
      setIsTogglingActive(false);
    }
  };

  // Determine if user is verified to show appropriate button text
  const isVerified = !!user.email_confirmed_at;
  const buttonText = isVerified ? 'Send Password Reset' : 'Send Invite';
  const buttonTitle = isVerified ? 'Send password reset email' : 'Send invite email';
  
  // Determine activation status
  const isActive = user.is_active ?? true;
  const activationText = isActive ? 'Deactivate User' : 'Reactivate User';
  const activationTitle = isActive ? 'Deactivate user account' : 'Reactivate user account';

  if (variant === 'sidebar') {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/users/${user.id}/edit`)}
          className="w-full justify-start"
          title="Edit user"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit User
        </Button>
        
        <Button
          variant="outline"
          onClick={handleSendEmail}
          disabled={isSendingEmail}
          className="w-full justify-start"
          title={buttonTitle}
        >
          <Mail className="w-4 h-4 mr-2" />
          {isSendingEmail ? 'Sending...' : buttonText}
        </Button>
        
        <Button
          variant="outline"
          onClick={handleToggleActive}
          disabled={isTogglingActive}
          className={`w-full justify-start ${
            isActive 
              ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
          }`}
          title={activationTitle}
        >
          {isActive ? <UserX className="w-4 h-4 mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
          {isTogglingActive ? (isActive ? 'Deactivating...' : 'Reactivating...') : activationText}
        </Button>
        
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Delete user"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {isDeleting ? 'Deleting...' : 'Delete User'}
        </Button>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Compact variant for table
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/admin/users/${user.id}/edit`)}
        className="h-8 w-8 p-0 hover:bg-green-50 dark:hover:bg-green-950"
        title="Edit user"
      >
        <Edit className="w-4 h-4 text-green-600" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSendEmail}
        disabled={isSendingEmail}
        className="h-8 w-8 p-0 hover:bg-orange-50 dark:hover:bg-orange-950"
        title={buttonTitle}
      >
        <Mail className={`w-4 h-4 ${isSendingEmail ? 'text-zinc-400' : 'text-orange-600'}`} />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleActive}
        disabled={isTogglingActive}
        className={`h-8 w-8 p-0 ${
          isActive 
            ? 'hover:bg-orange-50 dark:hover:bg-orange-950' 
            : 'hover:bg-green-50 dark:hover:bg-green-950'
        }`}
        title={activationTitle}
      >
        {isActive ? (
          <UserX className={`w-4 h-4 ${isTogglingActive ? 'text-zinc-400' : 'text-orange-600'}`} />
        ) : (
          <UserCheck className={`w-4 h-4 ${isTogglingActive ? 'text-zinc-400' : 'text-green-600'}`} />
        )}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting}
        className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950"
        title="Delete user"
      >
        <Trash2 className={`w-4 h-4 ${isDeleting ? 'text-zinc-400' : 'text-red-600'}`} />
      </Button>

      {error && (
        <div className="absolute top-full left-0 right-0 bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mt-2 z-10">
          {error}
        </div>
      )}
    </div>
  );
} 