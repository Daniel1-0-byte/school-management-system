'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, Loader2, Calendar } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import { AttendanceForm } from '@/components/attendance-form';
import { AttendanceTable } from '@/components/attendance-table';
import type { Attendance } from '@/lib/transformers/attendance-transformer';

export default function AttendancePage() {
  const params = useParams();
  const schoolId = params?.schoolId as string;

  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dateFilter, setDateFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    if (!schoolId) return;

    const fetchAttendance = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await SchoolService.getAttendance(schoolId, {
          page,
          pageSize,
        });

        if (result.error) {
          setError(result.error);
        } else {
          setRecords(result.attendance);
          setTotal(result.total);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch attendance records');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [schoolId, page]);

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;

    try {
      const result = await SchoolService.deleteAttendance(schoolId, id);
      if (result.error) {
        setError(result.error);
      } else {
        setRecords((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setPage(1); // Reset to first page to see new records
    // Optionally refetch here
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Attendance Management</h1>
            <p className="text-muted-foreground mt-2">
              Track student attendance and view attendance history
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            {showForm ? 'Close' : 'Mark Attendance'}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-600">Error</h3>
              <p className="text-sm text-red-600/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Mark Attendance Form */}
        {showForm && <AttendanceForm schoolId={schoolId} onSuccess={handleFormSuccess} />}

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Filter by Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            {dateFilter && (
              <button
                onClick={() => {
                  setDateFilter('');
                  setPage(1);
                }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Attendance Records */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Attendance Records</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <AttendanceTable
                records={records}
                onDelete={handleDeleteRecord}
              />

              {/* Pagination */}
              {total > pageSize && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, total)} of {total} records
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 border border-border rounded-lg bg-muted">
                      Page {page}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page * pageSize >= total}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Statistics */}
        {records.length > 0 && (
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold text-foreground mt-1">{total}</p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Present</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {records.filter((r) => r.status === 'present').length}
                </p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Absent</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {records.filter((r) => r.status === 'absent').length}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
