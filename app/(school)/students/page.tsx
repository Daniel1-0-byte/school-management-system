'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertCircle, Loader2, Mail } from 'lucide-react';
import type { Student } from '@/types';
import { SchoolService } from '@/lib/services/school-service';
import { StudentTransformer } from '@/lib/transformers/student-transformer';
import { ImportExportToolbar } from '@/components/import-export-toolbar';
import { ImportWizard } from '@/components/import-wizard';
import { ExportDialog } from '@/components/export-dialog';
import { getModuleConfig } from '@/lib/import-export/column-definitions';
import { StreamService } from '@/lib/services/stream-service';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'graduated'>('active');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

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

  const fetchStudents = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      setError(null);

      const result = await SchoolService.getStudents(schoolId, {
        page,
        pageSize,
        search: search || undefined,
        status,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setStudents(result.students);
        setTotal(result.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [schoolId, page, pageSize, search, status]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const result = await SchoolService.deleteStudent(schoolId!, id);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        await fetchStudents();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete student');
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">Manage student records and enrollment</p>
        </div>
        <div className="flex gap-2">
          <ImportExportToolbar
            schoolId={schoolId || ''}
            moduleName="students"
            config={getModuleConfig('students') || undefined}
            selectedRows={Array.from(selectedStudents)}
            onImportSuccess={fetchStudents}
            onBulkActionComplete={fetchStudents}
            hasFilters={!!search || status !== 'active'}
          />
          <a
            href="/students/add"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            <span>Add Student</span>
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

      {/* Import Wizard */}
      {showImportWizard && schoolId && (
        <ImportWizard
          moduleName="students"
          schoolId={schoolId}
          onClose={() => setShowImportWizard(false)}
          onSuccess={async () => {
            await fetchStudents();
            setShowImportWizard(false);
          }}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && schoolId && (
        <ExportDialog
          moduleName="students"
          schoolId={schoolId}
          selectedCount={selectedStudents.size}
          totalCount={total}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
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
              setStatus(e.target.value as 'active' | 'inactive' | 'graduated');
              setPage(1);
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Admission #</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Stream</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date of Birth</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {StudentTransformer.initials(student)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{StudentTransformer.displayName(student)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{student.admissionNumber || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      <span className="inline-block px-2 py-1 bg-blue-500/10 text-blue-600 rounded text-xs font-medium">
                        {student.currentStreamName || student.currentClassName || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        student.status === 'active'
                          ? 'bg-green-500/20 text-green-600'
                          : student.status === 'graduated'
                            ? 'bg-blue-500/20 text-blue-600'
                            : 'bg-red-500/20 text-red-600'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <a
                        href={`/students/${student.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded hover:bg-muted transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs text-red-600 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
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
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} students
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
