'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import { GradeForm } from '@/components/grade-form';
import { GradeTable } from '@/components/grade-table';
import type { Grade } from '@/lib/transformers/grade-transformer';

export default function GradesPage() {
  const params = useParams();
  const schoolId = params?.schoolId as string;

  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    if (!schoolId) return;

    const fetchGrades = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await SchoolService.getGrades(schoolId, {
          page,
          pageSize,
        });

        if (result.error) {
          setError(result.error);
        } else {
          setGrades(result.grades);
          setTotal(result.total);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch grades');
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [schoolId, page]);

  const handleDeleteGrade = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grade?')) return;

    try {
      const result = await SchoolService.deleteGrade(schoolId, id);
      if (result.error) {
        setError(result.error);
      } else {
        setGrades((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete grade');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Grades & Assessment</h1>
            <p className="text-muted-foreground mt-2">
              Manage student grades and academic performance
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            {showForm ? 'Close' : 'Enter Grades'}
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

        {/* Grade Entry Form */}
        {showForm && <GradeForm schoolId={schoolId} onSuccess={handleFormSuccess} />}

        {/* Grade Records */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Grade Records</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <GradeTable
                grades={grades}
                onDelete={handleDeleteGrade}
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
        {grades.length > 0 && (
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Class Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { grade: 'A', count: grades.filter((g) => g.grade === 'A').length, color: 'text-green-600' },
                { grade: 'B', count: grades.filter((g) => g.grade === 'B').length, color: 'text-blue-600' },
                { grade: 'C', count: grades.filter((g) => g.grade === 'C').length, color: 'text-yellow-600' },
                { grade: 'D', count: grades.filter((g) => g.grade === 'D').length, color: 'text-orange-600' },
                { grade: 'F', count: grades.filter((g) => g.grade === 'F').length, color: 'text-red-600' },
              ].map((stat) => (
                <div key={stat.grade} className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.grade}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.count} students</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
