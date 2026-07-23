'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import type { StreamWithSubjects } from '@/lib/services/stream-service';

export default function ClassesPage() {
  const [streams, setStreams] = useState<StreamWithSubjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<{
    status: 'all' | 'active' | 'inactive';
  }>({
    status: 'active',
  });

  // Get school and academic year from session
  useEffect(() => {
    const getSchoolContext = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setSchoolId(data.session?.schoolId || null);
          setAcademicYearId(data.session?.academicYearId || null);
        }
      } catch (err) {
        console.error('[v0] Failed to get school context:', err);
      }
    };
    getSchoolContext();
  }, []);

  // Fetch streams
  const fetchStreams = async () => {
    if (!schoolId) return;

    try {
      setLoading(true);
      setError(null);

      // Use API endpoint instead of calling service directly (avoid server env var access from client)
      const url = new URL('/api/school/streams', window.location.origin);
      if (academicYearId) {
        url.searchParams.append('academicYearId', academicYearId);
      }
      if (activeFilters.status !== 'all') {
        url.searchParams.append('status', activeFilters.status);
      }

      const response = await fetch(url.toString(), { 
        credentials: 'include',
        headers: {
          'X-School-Id': schoolId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch streams');
        setStreams([]);
        return;
      }

      const data = await response.json();
      setStreams(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch streams');
      setStreams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, [schoolId, academicYearId, activeFilters]);

  const handleDeleteStream = async (streamId: string) => {
    if (!confirm('Are you sure you want to deactivate this stream? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/school/streams/${streamId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-School-Id': schoolId || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to deactivate stream');
        return;
      }

      await fetchStreams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate stream');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Class Streams</h1>
          <p className="text-muted-foreground mt-1">
            Manage streams for the {activeFilters.status === 'active' ? 'current' : ''} academic year
          </p>
        </div>
        <a
          href="/classes/add"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          <span>Add Stream</span>
        </a>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveFilters({ ...activeFilters, status: 'active' })}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilters.status === 'active'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Active Streams
          </button>
          <button
            onClick={() => setActiveFilters({ ...activeFilters, status: 'inactive' })}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilters.status === 'inactive'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Inactive Streams
          </button>
          <button
            onClick={() => setActiveFilters({ ...activeFilters, status: 'all' })}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilters.status === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All Streams
          </button>
        </div>
      </div>

      {/* Streams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : streams.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No streams found</p>
            <p className="text-sm text-muted-foreground mt-2">Create your first stream to get started</p>
          </div>
        ) : (
          streams.map((stream) => (
            <div
              key={stream.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{stream.streamName}</h3>
                  <p className="text-sm text-muted-foreground">{stream.systemClass?.name}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/classes/${stream.id}/edit`}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </a>
                  <button
                    onClick={() => handleDeleteStream(stream.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Class Level</span>
                  <span className="font-medium text-foreground">{stream.systemClass?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Capacity</span>
                  <span className="font-medium text-foreground">{stream.capacity || 'Unlimited'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Subjects</span>
                  <span className="font-medium text-foreground">{stream.subjects?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      stream.status === 'active'
                        ? 'bg-green-500/20 text-green-600'
                        : 'bg-gray-500/20 text-gray-600'
                    }`}
                  >
                    {stream.status}
                  </span>
                </div>
              </div>

              {/* Subjects Preview */}
              {stream.subjects && stream.subjects.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Core Subjects:</p>
                  <div className="flex flex-wrap gap-1">
                    {stream.subjects
                      .filter((s) => s.isCore)
                      .slice(0, 3)
                      .map((subject) => (
                        <span key={subject.id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {subject.subject?.code || 'N/A'}
                        </span>
                      ))}
                    {stream.subjects.filter((s) => s.isCore).length > 3 && (
                      <span className="text-xs text-muted-foreground px-2 py-1">+{stream.subjects.filter((s) => s.isCore).length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
