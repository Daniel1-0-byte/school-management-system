'use client';

import React, { useState, useEffect } from 'react';
import { Search, Shield, User, AlertCircle, Loader2, Lock, Trash2, Power } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Profile, PaginatedResponse } from '@/types';

interface UserWithSchool extends Profile {
  schools?: { id: string; name: string };
  email?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(role && { role }),
        ...(status && { status }),
      });

      const response = await fetch(
        `/api/platform-admin/users?${params.toString()}`,
        { 
          headers: { 'Accept': 'application/json' },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data: PaginatedResponse<UserWithSchool> = await response.json();
      setUsers(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize, search, role, status]);

  const getRoleIcon = (systemRole: string) => {
    switch (systemRole) {
      case 'Admin':
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return <User className="w-4 h-4 text-blue-500" />;
    }
  };

  const getRoleBadgeColor = (systemRole: string) => {
    switch (systemRole) {
      case 'Admin':
        return 'bg-purple-500/20 text-purple-600';
      case 'Teacher':
        return 'bg-blue-500/20 text-blue-600';
      case 'Parent':
        return 'bg-green-500/20 text-green-600';
      case 'Accountant':
        return 'bg-orange-500/20 text-orange-600';
      case 'BusCoordinator':
        return 'bg-cyan-500/20 text-cyan-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  };

  const getStatusBadgeColor = (userStatus: string) => {
    switch (userStatus) {
      case 'active':
        return 'bg-green-500/20 text-green-600';
      case 'inactive':
        return 'bg-red-500/20 text-red-600';
      case 'invited':
        return 'bg-yellow-500/20 text-yellow-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.size === 0) {
      setError('No users selected');
      return;
    }

    try {
      const response = await fetch('/api/platform-admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          action,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update users');
      }

      setSelectedUsers(new Set());
      setPage(1);
      setTimeout(() => fetchUsers(), 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update users');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-2">Manage all users across all schools</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-600">Error</p>
            <p className="text-sm text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-4 items-center">
          <p className="text-sm font-medium text-blue-600">
            {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction('suspend')}
              className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 rounded transition-colors"
            >
              <Power className="w-4 h-4 inline mr-1" />
              Suspend
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              className="px-3 py-1 text-xs bg-red-500/20 text-red-600 hover:bg-red-500/30 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              Deactivate
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Teacher">Teacher</option>
            <option value="Parent">Parent</option>
            <option value="Accountant">Accountant</option>
            <option value="BusCoordinator">Bus Coordinator</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="invited">Invited</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground w-12">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(new Set(users.map(u => u.id)));
                        } else {
                          setSelectedUsers(new Set());
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">School</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedUsers);
                          if (e.target.checked) {
                            newSelected.add(user.id);
                          } else {
                            newSelected.delete(user.id);
                          }
                          setSelectedUsers(newSelected);
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {(user.firstName?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.systemRole)}`}>
                        {getRoleIcon(user.systemRole)}
                        {user.systemRole}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {/* @ts-ignore */}
                      {user.schools?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * pageSize >= total}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
