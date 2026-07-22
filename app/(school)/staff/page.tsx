'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertCircle, Loader2, Mail, Phone, Download, Upload, UserCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Staff } from '@/lib/transformers/staff-transformer';
import { SchoolService } from '@/lib/services/school-service';
import { StaffBulkImport } from '@/components/staff-bulk-import';

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  useEffect(() => {
    const getSchoolId = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setSchoolId(data.session?.schoolId || null);
        }
      } catch (err) {
        console.error('[v0] Failed to get school ID:', err);
      }
    };
    getSchoolId();
  }, []);

  const fetchStaff = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      setError(null);

      const result = await SchoolService.getStaff(schoolId, {
        page,
        pageSize,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setStaff(result.staff);
        setTotal(result.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [schoolId, page, pageSize, search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const result = await SchoolService.deleteStaff(schoolId!, id);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        await fetchStaff();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff member');
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!schoolId) return;
    try {
      const result = await SchoolService.exportStaff(schoolId, format);
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        const link = document.createElement('a');
        link.href = result.url;
        link.click();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff</h1>
          <p className="text-muted-foreground mt-1">Manage school staff and personnel</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportDialog(!showImportDialog)}
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Import</span>
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors">
              <Download className="w-5 h-5" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 mt-0 w-32 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-t border-border"
              >
                Export JSON
              </button>
            </div>
          </div>
          <a
            href="/staff/add"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            <span>Add Staff</span>
          </a>
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

      {/* Import Dialog */}
      {showImportDialog && schoolId && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Bulk Import Staff</h3>
            <button
              onClick={() => setShowImportDialog(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          <StaffBulkImport
            schoolId={schoolId}
            onSuccess={async (count) => {
              await fetchStaff();
              setShowImportDialog(false);
            }}
            onClose={() => setShowImportDialog(false)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading staff...</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No staff members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Join Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const initials = `${member.firstName || ''} ${member.lastName || ''}`
                    .trim()
                    .split(' ')
                    .map((n) => n.charAt(0))
                    .join('')
                    .toUpperCase()
                    || '?';
                  
                  return (
                  <tr key={member.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{member.firstName} {member.lastName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      <a href={`mailto:${member.email}`} className="hover:text-primary flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {member.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {member.phone && (
                        <a href={`tel:${member.phone}`} className="hover:text-primary flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {member.phone}
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {member.dateOfJoining ? formatDate(member.dateOfJoining) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        member.status === 'active'
                          ? 'bg-green-500/20 text-green-600'
                          : 'bg-red-500/20 text-red-600'
                      }`}>
                        <UserCheck className="w-3 h-3 mr-1" />
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded hover:bg-muted transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs text-red-600 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} staff members
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
