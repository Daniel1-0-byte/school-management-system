'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Search, Download, Upload, Loader2, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import { ClassTransformer, type Class } from '@/lib/transformers/class-transformer';
import { ClassBulkImport } from '@/components/class-bulk-import';

export default function ClassesPage() {
  const router = useRouter();
  const params = useParams<{ schoolId: string }>();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      const { classes: classesData, total: totalCount, error } = await SchoolService.getClasses(
        params.schoolId,
        { page, pageSize }
      );

      if (error) {
        setError(error);
      } else {
        // Apply search filter on client-side
        let filtered = classesData;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = classesData.filter(
            (c) =>
              c.className.toLowerCase().includes(query) ||
              c.gradeLevel.toLowerCase().includes(query) ||
              c.section.toLowerCase().includes(query)
          );
        }
        setClasses(filtered);
        setTotal(totalCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, [params.schoolId, page, pageSize, searchQuery]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleDelete = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      const { success, error } = await SchoolService.deleteClass(params.schoolId, classId);
      if (error) {
        setError(error);
      } else if (success) {
        await loadClasses();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    }
  };

  const handleExport = async () => {
    try {
      const { url, error } = await SchoolService.exportClasses(params.schoolId, 'csv');
      if (error || !url) {
        setError(error || 'Export failed');
      } else {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export classes');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Classes Management</h1>
            <p className="text-muted-foreground">Manage your school classes</p>
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
              onClick={() => router.push(`/school/${params.schoolId}/classes/new`)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Add Class</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by class name, grade, or section..."
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
              <h2 className="text-2xl font-bold mb-4">Bulk Import Classes</h2>
              <ClassBulkImport
                schoolId={params.schoolId}
                onSuccess={() => {
                  setShowImport(false);
                  loadClasses();
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

        {/* Classes Table */}
        {!loading && classes.length > 0 && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Class Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Grade</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Section</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Capacity</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground">{cls.className}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{cls.gradeLevel}</td>
                      <td className="py-3 px-4 text-sm">{cls.section}</td>
                      <td className="py-3 px-4 text-sm">{ClassTransformer.capacityInfo(cls)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            cls.status === 'active'
                              ? 'bg-green-500/10 text-green-600'
                              : cls.status === 'inactive'
                                ? 'bg-red-500/10 text-red-600'
                                : 'bg-yellow-500/10 text-yellow-600'
                          }`}
                        >
                          {cls.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/school/${params.schoolId}/classes/${cls.id}`)}
                            className="p-2 hover:bg-muted rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cls.id)}
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
        {!loading && classes.length === 0 && (
          <div className="bg-card rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground mb-4">No classes found</p>
            <button
              onClick={() => router.push(`/school/${params.schoolId}/classes/new`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Class</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
