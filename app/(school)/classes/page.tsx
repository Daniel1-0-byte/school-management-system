'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertCircle, Loader2, Users, Download, Upload } from 'lucide-react';
import type { Class } from '@/lib/transformers/class-transformer';
import { SchoolService } from '@/lib/services/school-service';
import { ClassBulkImport } from '@/components/class-bulk-import';

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
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

  const fetchClasses = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      setError(null);

      const result = await SchoolService.getClasses(schoolId, {
        page,
        pageSize,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setClasses(result.classes);
        setTotal(result.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [schoolId, page, pageSize, search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      const result = await SchoolService.deleteClass(schoolId!, id);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        await fetchClasses();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!schoolId) return;
    try {
      const result = await SchoolService.exportClasses(schoolId, format);
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
          <h1 className="text-3xl font-bold text-foreground">Classes</h1>
          <p className="text-muted-foreground mt-1">Manage school classes and sections</p>
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
            href="/classes/add"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            <span>Add Class</span>
          </a>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && schoolId && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Bulk Import Classes</h3>
            <button
              onClick={() => setShowImportDialog(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          <ClassBulkImport
            schoolId={schoolId}
            onSuccess={async (count) => {
              await fetchClasses();
              setShowImportDialog(false);
            }}
            onClose={() => setShowImportDialog(false)}
          />
        </div>
      )}

      {/* Search */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : classes.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No classes found</p>
          </div>
        ) : (
          classes.map((classItem) => (
            <div
              key={classItem.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{classItem.className}</h3>
                  <p className="text-sm text-muted-foreground">Grade {classItem.gradeLevel}, Section {classItem.section}</p>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={`/classes/${classItem.id}/edit`}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </a>
                  <button
                    onClick={() => handleDelete(classItem.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Grade Level</span>
                  <span className="font-medium text-foreground">{classItem.gradeLevel}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Capacity</span>
                  <span className="font-medium text-foreground">{classItem.capacity || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${classItem.status === 'active' ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'}`}>
                    {classItem.status}
                  </span>
                </div>
              </div>


            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} classes
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
