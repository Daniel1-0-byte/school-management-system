'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit2, Trash2, AlertCircle, Loader2, Pause, Play, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PaginatedResponse, School } from '@/types';
import { SchoolFormModal } from '@/components/platform-admin/school-form-modal';

interface SchoolWithStats extends School {
  totalUsers?: number;
  totalStudents?: number;
  subscription?: any;
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch schools
  const fetchSchools = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(status && { status }),
      });

      const response = await fetch(
        `/api/platform-admin/schools?${params.toString()}`,
        { 
          headers: { 'Accept': 'application/json' },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch schools');
      }

      const data: PaginatedResponse<SchoolWithStats> = await response.json();
      setSchools(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, [page, pageSize, search, status]);

  const handleOpenModal = (school?: SchoolWithStats) => {
    setSelectedSchool(school || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSchool(null);
  };

  const handleSubmitForm = async (data: Partial<School>) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const method = selectedSchool ? 'PUT' : 'POST';
      const url = selectedSchool
        ? `/api/platform-admin/schools/${selectedSchool.id}`
        : '/api/platform-admin/schools';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${selectedSchool ? 'update' : 'create'} school`);
      }

      handleCloseModal();
      
      // Refetch schools to ensure newly created/updated school appears correctly
      // Reset to page 1 to show latest changes
      setPage(1);
      setTimeout(() => fetchSchools(), 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(id);
      const response = await fetch(`/api/platform-admin/schools/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete school');
      }

      // Refetch schools list after deletion
      await fetchSchools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete school');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/platform-admin/schools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update school');
      }

      // Refetch schools to ensure status change persists
      await fetchSchools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update school');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-600';
      case 'suspended':
        return 'bg-yellow-500/20 text-yellow-600';
      case 'pending_verification':
        return 'bg-blue-500/20 text-blue-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Schools</h1>
          <p className="text-muted-foreground mt-2">Manage all schools in the system</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          <span>Add School</span>
        </button>
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

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search schools by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
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
            <option value="suspended">Suspended</option>
            <option value="pending_verification">Pending</option>
          </select>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading schools...</p>
          </div>
        ) : schools.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No schools found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    School Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{school.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(school.status)}`}>
                        {school.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{school.email || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(school.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {school.status === 'pending_verification' && (
                        <button
                          onClick={() => handleStatusChange(school.id, 'active')}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded transition-colors"
                          title="Approve School"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusChange(school.id, school.status === 'active' ? 'suspended' : school.status === 'suspended' ? 'active' : 'suspended')}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded hover:bg-muted transition-colors"
                        title={school.status === 'active' ? 'Suspend' : school.status === 'suspended' ? 'Activate' : ''}
                        style={{display: school.status === 'pending_verification' ? 'none' : 'inline-flex'}}
                      >
                        {school.status === 'active' ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenModal(school)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded hover:bg-muted transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(school.id)}
                        disabled={deletingId === school.id}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs text-red-600 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                      >
                        {deletingId === school.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
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
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} schools
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

      {/* School Form Modal */}
      <SchoolFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitForm}
        school={selectedSchool || undefined}
        isLoading={isSubmitting}
      />
    </div>
  );
}
