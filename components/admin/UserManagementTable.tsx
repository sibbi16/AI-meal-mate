'use client';

import { useState } from 'react';
import { AdminUser } from '@/app/admin/users/actions';
import UserActionButtons from './UserActionButtons';
import { getOrganisationSettings } from '@/utils/auth-helpers/settings';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search, Filter, Users, Calendar, Clock, Mail, Shield } from 'lucide-react';

interface UserManagementTableProps {
  users: AdminUser[];
}

export default function UserManagementTable({ users }: UserManagementTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
    }
  };

  const getStatusBadgeClass = (confirmed?: string) => {
    return confirmed 
      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
      : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Search and Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-10 pr-8 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all appearance-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto w-12 h-12 text-zinc-400 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-600 dark:text-zinc-400 mb-2">No users found</h3>
          <p className="text-zinc-500 dark:text-zinc-500">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((user) => (
            <div key={user.id} className="group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 overflow-hidden flex flex-col">
              {/* User Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.full_name || 'User'} 
                        className="w-12 h-12 rounded-full ring-2 ring-zinc-200 dark:ring-zinc-700"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-zinc-200 dark:ring-zinc-700">
                        <span className="text-white font-semibold text-lg">
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
                        {user.full_name || 'Unnamed User'}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getStatusBadgeClass(user.email_confirmed_at)}`}>
                      {user.email_confirmed_at ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="p-6 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Calendar className="w-4 h-4" />
                    <span>Created</span>
                  </div>
                  <div className="text-zinc-900 dark:text-white font-medium">
                    {formatDate(user.created_at)}
                  </div>
                  
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Clock className="w-4 h-4" />
                    <span>Last Sign In</span>
                  </div>
                  <div className="text-zinc-900 dark:text-white font-medium">
                    {formatDateTime(user.last_sign_in_at)}
                  </div>
                </div>

                {/* Organisations */}
                {user.organisations && user.organisations.length > 0 && (
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Organisations</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.organisations.slice(0, 2).map((org, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs rounded-md border"
                        >
                          {org.organisation?.name} ({org.role})
                        </span>
                      ))}
                      {user.organisations.length > 2 && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-md border">
                          +{user.organisations.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons - Always at bottom */}
              <div className="p-6 pt-0 mt-auto">
                <div className="flex gap-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/admin/users/${user.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <div className="flex gap-1">
                    <UserActionButtons user={user} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Summary */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>
          <div className="text-sm text-zinc-500">
            {roleFilter !== 'all' && `Filtered by: ${roleFilter}`}
          </div>
        </div>
      </div>
    </div>
  );
} 