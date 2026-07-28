'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface AssessmentSelectorProps {
  selectedAcademicYear: string;
  setSelectedAcademicYear: (value: string) => void;
  selectedStream: string;
  setSelectedStream: (value: string) => void;
  selectedAssessment: string;
  setSelectedAssessment: (value: string) => void;
  onError: (error: string | null) => void;
}

interface AcademicYear {
  id: string;
  name: string;
  year: number;
}

interface Stream {
  id: string;
  name: string;
}

interface Assessment {
  id: string;
  name: string;
  assessment_type: string;
  status: string;
  progress_count: number;
  total_students: number;
}

export function AssessmentSelector({
  selectedAcademicYear,
  setSelectedAcademicYear,
  selectedStream,
  setSelectedStream,
  selectedAssessment,
  setSelectedAssessment,
  onError,
}: AssessmentSelectorProps) {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  // Fetch academic years on mount
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        setLoading(true);
        onError(null);
        const response = await fetch('/api/school/academic-years');
        if (!response.ok) throw new Error('Failed to fetch academic years');
        const data = await response.json();
        setAcademicYears(data.data || []);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Failed to fetch academic years');
      } finally {
        setLoading(false);
      }
    };
    fetchAcademicYears();
  }, [onError]);

  // Fetch streams when academic year is selected
  useEffect(() => {
    if (!selectedAcademicYear) {
      setStreams([]);
      setAssessments([]);
      return;
    }

    const fetchStreams = async () => {
      try {
        setStreamsLoading(true);
        onError(null);
        const response = await fetch(
          `/api/school/streams?academic_year_id=${selectedAcademicYear}`
        );
        if (!response.ok) throw new Error('Failed to fetch streams');
        const data = await response.json();
        setStreams(data.data || []);
        setSelectedStream('');
        setAssessments([]);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Failed to fetch streams');
      } finally {
        setStreamsLoading(false);
      }
    };
    fetchStreams();
  }, [selectedAcademicYear, onError, setSelectedStream]);

  // Fetch assessments when stream is selected
  useEffect(() => {
    if (!selectedAcademicYear || !selectedStream) {
      setAssessments([]);
      return;
    }

    const fetchAssessments = async () => {
      try {
        setAssessmentsLoading(true);
        onError(null);
        const response = await fetch(
          `/api/school/assessments?academic_year_id=${selectedAcademicYear}&stream_id=${selectedStream}`
        );
        if (!response.ok) throw new Error('Failed to fetch assessments');
        const data = await response.json();
        setAssessments(data.data || []);
        setSelectedAssessment('');
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Failed to fetch assessments');
      } finally {
        setAssessmentsLoading(false);
      }
    };
    fetchAssessments();
  }, [selectedAcademicYear, selectedStream, onError, setSelectedAssessment]);

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'not_started': 'bg-gray-100 text-gray-800',
      'draft': 'bg-blue-100 text-blue-800',
      'submitted': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'returned': 'bg-red-100 text-red-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Select Assessment</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Academic Year Selector */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Academic Year
          </label>
          <select
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">
              {loading ? 'Loading...' : 'Select Academic Year'}
            </option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stream Selector */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Stream
          </label>
          <select
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
            disabled={!selectedAcademicYear || streamsLoading}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">
              {streamsLoading ? 'Loading...' : 'Select Stream'}
            </option>
            {streams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name}
              </option>
            ))}
          </select>
        </div>

        {/* Assessment Selector */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Assessment
          </label>
          <select
            value={selectedAssessment}
            onChange={(e) => setSelectedAssessment(e.target.value)}
            disabled={!selectedStream || assessmentsLoading}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">
              {assessmentsLoading ? 'Loading...' : 'Select Assessment'}
            </option>
            {assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Assessment Details */}
      {selectedAssessment && assessments.length > 0 && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2">
          {(() => {
            const assessment = assessments.find((a) => a.id === selectedAssessment);
            if (!assessment) return null;
            return (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Assessment Type</p>
                    <p className="font-medium text-foreground capitalize">
                      {assessment.assessment_type.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="font-medium text-foreground">
                      {assessment.progress_count} / {assessment.total_students} students
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(assessment.status)}`}>
                      {assessment.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
