'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  GraduationCap,
  Layers,
  AlertCircle,
  Loader2,
  CheckCircle,
  Eye,
  Settings,
} from 'lucide-react';

interface Curriculum {
  id: string;
  name: string;
  version: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CurriculumWithDetails extends Curriculum {
  classes?: Array<{
    id: string;
    code: string;
    name: string;
    displayOrder: number;
    subjects?: Array<{
      id: string;
      code: string;
      name: string;
      isCore: boolean;
    }>;
  }>;
}

export default function CurriculumManagementPage() {
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState<CurriculumWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // Fetch all curriculums
  const fetchCurriculums = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/curriculum/curriculums', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch curriculums');
      }

      const result = await response.json();
      setCurriculums(result.data);

      // Auto-select first or active curriculum
      const active = result.data.find((c: Curriculum) => c.isActive);
      if (active) {
        fetchCurriculumDetails(active.id);
      } else if (result.data.length > 0) {
        fetchCurriculumDetails(result.data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch curriculums');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurriculumDetails = async (curriculumId: string) => {
    try {
      const response = await fetch(`/api/curriculum/curriculums/${curriculumId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch curriculum details');
      }

      const result = await response.json();
      setSelectedCurriculum(result.data);
    } catch (err) {
      console.error('[v0] Error fetching curriculum details:', err);
    }
  };

  const handleActivateCurriculum = async (curriculumId: string) => {
    try {
      setActivatingId(curriculumId);
      setError(null);

      const response = await fetch('/api/platform-admin/curriculum/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ curriculumId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to activate curriculum');
      }

      // Refresh curriculums
      await fetchCurriculums();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate curriculum');
    } finally {
      setActivatingId(null);
    }
  };

  useEffect(() => {
    fetchCurriculums();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Curriculum Management</h1>
          </div>
          <p className="text-muted-foreground">
            Manage the centralized curriculum used by all schools on the platform
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Curriculums List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Available Curriculums</h2>
            <div className="space-y-2">
              {curriculums.map(curriculum => (
                <button
                  key={curriculum.id}
                  onClick={() => fetchCurriculumDetails(curriculum.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedCurriculum?.id === curriculum.id
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{curriculum.name}</p>
                      <p className="text-xs text-muted-foreground">v{curriculum.version}</p>
                    </div>
                    {curriculum.isActive && (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Curriculum Details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCurriculum ? (
              <>
                {/* Header */}
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{selectedCurriculum.name}</h2>
                      <p className="text-sm text-muted-foreground">Version {selectedCurriculum.version}</p>
                    </div>
                    {!selectedCurriculum.isActive && (
                      <button
                        onClick={() => handleActivateCurriculum(selectedCurriculum.id)}
                        disabled={activatingId === selectedCurriculum.id}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {activatingId === selectedCurriculum.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Activate
                      </button>
                    )}
                  </div>
                  {selectedCurriculum.description && (
                    <p className="text-foreground">{selectedCurriculum.description}</p>
                  )}
                  {selectedCurriculum.isActive && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      This curriculum is currently active for all schools
                    </div>
                  )}
                </div>

                {/* Classes and Subjects */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Classes & Subjects
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    {selectedCurriculum.classes && selectedCurriculum.classes.length > 0 ? (
                      selectedCurriculum.classes.map(cls => (
                        <div key={cls.id} className="bg-card border border-border rounded-lg overflow-hidden">
                          <div className="p-4 bg-muted border-b border-border">
                            <p className="font-semibold text-foreground">{cls.name}</p>
                            <p className="text-xs text-muted-foreground">Code: {cls.code}</p>
                          </div>
                          <div className="p-4 space-y-2">
                            {cls.subjects && cls.subjects.length > 0 ? (
                              cls.subjects.map(subject => (
                                <div
                                  key={subject.id}
                                  className="flex items-center justify-between text-sm p-2 bg-background rounded"
                                >
                                  <span className="text-foreground">{subject.name}</span>
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                                      {subject.code}
                                    </code>
                                    {subject.isCore && (
                                      <span className="text-xs font-medium text-primary">Core</span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground">No subjects assigned</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-foreground text-center py-8">No classes available</p>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Total Classes</p>
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-2">
                      {selectedCurriculum.classes?.length || 0}
                    </p>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Total Subjects</p>
                      <Layers className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-2">
                      {selectedCurriculum.classes?.reduce((sum, cls) => sum + (cls.subjects?.length || 0), 0) || 0}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground">No curriculum selected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
