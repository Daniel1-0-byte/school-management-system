'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

interface SubjectSelectorProps {
  selectedAcademicYear: string;
  setSelectedAcademicYear: (value: string) => void;
  selectedStream: string;
  setSelectedStream: (value: string) => void;
  selectedSubject: string;
  setSelectedSubject: (value: string) => void;
  onError: (error: string | null) => void;
}

interface AcademicYear {
  id: string;
  year: number;
}

interface Stream {
  id: string;
  name: string;
  school_classes?: {
    level: string;
    name: string;
  } | null;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  student_count: number;
}

export function SubjectSelector({
  selectedAcademicYear,
  setSelectedAcademicYear,
  selectedStream,
  setSelectedStream,
  selectedSubject,
  setSelectedSubject,
  onError,
}: SubjectSelectorProps) {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Fetch academic years on mount
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/school/academic-years');
        if (!response.ok) throw new Error('Failed to fetch academic years');
        const data = await response.json();
        setAcademicYears(data.data || []);
      } catch (error) {
        console.error('[v0] Failed to fetch academic years:', error);
        onError('Failed to load academic years');
      } finally {
        setLoading(false);
      }
    };
    fetchAcademicYears();
  }, [onError]);

  // Fetch streams when academic year changes
  useEffect(() => {
    if (!selectedAcademicYear) {
      setStreams([]);
      setSelectedStream('');
      return;
    }

    const fetchStreams = async () => {
      try {
        setStreamsLoading(true);
        const response = await fetch(
          `/api/school/streams?academic_year_id=${selectedAcademicYear}`
        );
        if (!response.ok) throw new Error('Failed to fetch streams');
        const data = await response.json();
        setStreams(data.data || []);
        setSelectedStream('');
      } catch (error) {
        console.error('[v0] Failed to fetch streams:', error);
        onError('Failed to load class streams');
      } finally {
        setStreamsLoading(false);
      }
    };
    fetchStreams();
  }, [selectedAcademicYear, setSelectedStream, onError]);

  // Fetch subjects when stream changes
  useEffect(() => {
    if (!selectedStream) {
      setSubjects([]);
      setSelectedSubject('');
      return;
    }

    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true);
        const response = await fetch(`/api/school/subjects?stream_id=${selectedStream}`);
        if (!response.ok) throw new Error('Failed to fetch subjects');
        const data = await response.json();
        setSubjects(data.data || []);
        setSelectedSubject('');
      } catch (error) {
        console.error('[v0] Failed to fetch subjects:', error);
        onError('Failed to load subjects');
      } finally {
        setSubjectsLoading(false);
      }
    };
    fetchSubjects();
  }, [selectedStream, setSelectedSubject, onError]);

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Select Class and Subject</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Academic Year */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Academic Year
          </label>
          <select
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value="">
              {loading ? 'Loading...' : 'Select Academic Year'}
            </option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.year}
              </option>
            ))}
          </select>
        </div>

        {/* Stream/Class */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Class
          </label>
          <select
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
            disabled={!selectedAcademicYear || streamsLoading}
            className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value="">
              {streamsLoading ? 'Loading...' : 'Select Class'}
            </option>
            {streams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.school_classes?.level
                  ? `${stream.school_classes.level} - ${stream.name}`
                  : stream.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={!selectedStream || subjectsLoading}
            className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value="">
              {subjectsLoading ? 'Loading...' : 'Select Subject'}
            </option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.student_count} students)
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
