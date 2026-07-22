'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Search, Loader2, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import { StaffTransformer, type Staff } from '@/lib/transformers/staff-transformer';
import { ImportExportToolbar } from '@/components/import-export-toolbar';
import { ImportWizard } from '@/components/import-wizard';
import { ExportDialog } from '@/components/export-dialog';

export default function StaffPage() {
  const router = useRouter();
  const params = useParams<{ schoolId: string }>();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      const { staff: staffData, total: totalCount, error } = await SchoolService.getStaff(
        params.schoolId,
        { page, pageSize }
      );

      if (error) {
        setError(error);
      } else {
        // Apply search filter on client-side
        let filtered = staffData;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = staffData.filter(
            (s) =>
              s.firstName.toLowerCase().includes(query) ||
              s.lastName.toLowerCase().includes(query) ||
              s.email.toLowerCase().includes(query) ||
              (s.department || '').toLowerCase().includes(query)
          );
        }
        setStaff(filtered);
        setTotal(totalCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [params.schoolId, page, pageSize, searchQuery]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleDelete = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const { success, error } = await SchoolService.deleteStaff(params.schoolId, staffId);
      if (error) {
        setError(error);
      } else if (success) {
        await loadStaff();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff member');
    }
  };

  const handleExport = async () => {
    try {
      const { url, error } = await SchoolService.exportStaff(params.schoolId, 'csv');
      if (error || !url) {
        setError(error || 'Export failed');
      } else {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export staff');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
            <p className="text-muted-foreground">Manage your school staff members</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>
            <button
              onClick={() => router.push(`/school/${params.schoolId}/staff/new`)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Import Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg border border-border p-6 w-full max-w-2xl">
              <h2 className="text-2xl font-bold mb-4">Bulk Import Staff</h2>
              <StaffBulkImport
                schoolId={params.schoolId}
                onSuccess={() => {
                  setShowImport(false);
                  loadStaff();
                }}
                onClose={() => setShowImport(false)}
              />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Staff Table */}
        {!loading && staff.length > 0 && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Department</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground">{StaffTransformer.displayName(member)}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{member.email}</td>
                      <td className="py-3 px-4 text-sm">{StaffTransformer.roleLabel(member.role)}</td>
                      <td className="py-3 px-4 text-sm">{member.department || '-'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            member.status === 'active'
                              ? 'bg-green-500/10 text-green-600'
                              : member.status === 'inactive'
                                ? 'bg-red-500/10 text-red-600'
                                : 'bg-yellow-500/10 text-yellow-600'
                          }`}
                        >
                          {member.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/school/${params.schoolId}/staff/${member.id}`)}
                            className="p-2 hover:bg-muted rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="p-2 hover:bg-red-500/10 rounded transition-colors text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-2 border border-border rounded hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-border rounded hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && staff.length === 0 && (
          <div className="bg-card rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground mb-4">No staff members found</p>
            <button
              onClick={() => router.push(`/school/${params.schoolId}/staff/new`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Staff Member</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
