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

interface Term {
  id: string;
  academic_year_id: string;
  type: string; // 'term_1', 'term_2', 'term_3'
  start_date: string;
  end_date: string;
  report_card_deadline: string | null;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface SubjectSelectorPropsExtended extends SubjectSelectorProps {
  selectedTerm?: string;
  setSelectedTerm?: (value: string) => void;
}

export function SubjectSelector({
  selectedAcademicYear,
  setSelectedAcademicYear,
  selectedStream,
  setSelectedStream,
  selectedSubject,
  setSelectedSubject,
  onError,
  selectedTerm: propSelectedTerm = '',
  setSelectedTerm: propSetSelectedTerm,
}: SubjectSelectorPropsExtended) {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTerm, setSelectedTerm] = useState(propSelectedTerm);
  const [loading, setLoading] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);
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

  // Fetch terms when academic year changes
  useEffect(() => {
    if (!selectedAcademicYear) {
      setTerms([]);
      setSelectedTerm('');
      return;
    }

    const fetchTerms = async () => {
      try {
        setTermsLoading(true);
        const response = await fetch(
          `/api/school/terms?academic_year_id=${selectedAcademicYear}`
        );
        if (!response.ok) throw new Error('Failed to fetch terms');
        const data = await response.json();
        setTerms(data.data || []);
        setSelectedTerm('');
      } catch (error) {
        console.error('[v0] Failed to fetch terms:', error);
        onError('Failed to load terms');
      } finally {
        setTermsLoading(false);
      }
    };
    fetchTerms();
  }, [selectedAcademicYear, onError]);

  // Fetch streams when term changes
  useEffect(() => {
    if (!selectedTerm) {
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
  }, [selectedTerm, setSelectedStream, onError]);

  // Fetch subjects when academic year is selected (subjects are school-specific, not stream-specific)
  useEffect(() => {
    if (!selectedAcademicYear) {
      setSubjects([]);
      setSelectedSubject('');
      return;
    }

    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true);
        const response = await fetch('/api/school/subjects');
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
  }, [selectedAcademicYear, setSelectedSubject, onError]);

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Select Class and Subject</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              {loading ? 'Loading...' : 'Select Year'}
            </option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.year}
              </option>
            ))}
          </select>
        </div>

        {/* Term */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Term
          </label>
          <select
            value={selectedTerm}
            onChange={(e) => {
              setSelectedTerm(e.target.value);
              propSetSelectedTerm?.(e.target.value);
            }}
            disabled={!selectedAcademicYear || termsLoading}
            className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value="">
              {termsLoading ? 'Loading...' : 'Select Term'}
            </option>
            {terms.map((term) => {
              const termLabel = term.type === 'term_1' ? 'Term 1' : 
                                term.type === 'term_2' ? 'Term 2' : 
                                term.type === 'term_3' ? 'Term 3' : term.type;
              return (
                <option key={term.id} value={term.id}>
                  {termLabel} ({term.start_date} to {term.end_date})
                </option>
              );
            })}
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
            disabled={!selectedTerm || streamsLoading}
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
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
