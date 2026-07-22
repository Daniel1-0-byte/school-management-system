'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import type { Student } from '@/lib/transformers/student-transformer';
import type { Class } from '@/lib/transformers/class-transformer';

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'leave';
}

interface AttendanceFormProps {
  schoolId: string;
  onSuccess?: () => void;
}

export function AttendanceForm({ schoolId, onSuccess }: AttendanceFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const result = await SchoolService.getClasses(schoolId, { pageSize: 100 });
        if (result.error) {
          setError(result.error);
        } else {
          setClasses(result.classes);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch classes');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [schoolId]);

  // Fetch students when class changes
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setAttendance([]);
      return;
    }

    const fetchStudents = async () => {
      try {
        setLoading(true);
        const result = await SchoolService.getStudents(schoolId, { pageSize: 100 });
        if (result.error) {
          setError(result.error);
        } else {
          const classStudents = result.students.filter((s) => s.classId === classId);
          setStudents(classStudents);
          setAttendance(
            classStudents.map((s) => ({
              studentId: s.id,
              studentName: `${s.firstName} ${s.lastName}`,
              status: 'present' as const,
            }))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [classId, schoolId]);

  const updateAttendance = (studentId: string, status: 'present' | 'absent' | 'leave') => {
    setAttendance((prev) =>
      prev.map((record) =>
        record.studentId === studentId ? { ...record, status } : record
      )
    );
  };

  const markAll = (status: 'present' | 'absent') => {
    setAttendance((prev) =>
      prev.map((record) => ({ ...record, status }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || attendance.length === 0) {
      setError('Please select a class and ensure students are loaded');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      // Call API to submit attendance
      const response = await fetch(`/api/school/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          school_id: schoolId,
          date,
          class_id: classId,
          records: attendance,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit attendance');
      }

      setSuccess(true);
      setAttendance([]);
      setDate(new Date().toISOString().split('T')[0]);

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Mark Attendance</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4 flex gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-600">Attendance submitted successfully</p>
          </div>
        )}
      </div>

      {/* Date and Class Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Class</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={loading || submitting}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.className} - {cls.section}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Actions */}
      {attendance.length > 0 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => markAll('present')}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50 font-medium"
          >
            <CheckCircle2 className="w-4 h-4 inline mr-2" />
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => markAll('absent')}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 font-medium"
          >
            <XCircle className="w-4 h-4 inline mr-2" />
            Mark All Absent
          </button>
        </div>
      )}

      {/* Student Attendance List */}
      {attendance.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Students</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {attendance.map((record) => (
              <div
                key={record.studentId}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <span className="text-sm font-medium text-foreground">{record.studentName}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateAttendance(record.studentId, 'present')}
                    disabled={submitting}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                      record.status === 'present'
                        ? 'bg-green-500 text-white'
                        : 'bg-background border border-border hover:bg-muted'
                    }`}
                    title="Present"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAttendance(record.studentId, 'absent')}
                    disabled={submitting}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                      record.status === 'absent'
                        ? 'bg-red-500 text-white'
                        : 'bg-background border border-border hover:bg-muted'
                    }`}
                    title="Absent"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAttendance(record.studentId, 'leave')}
                    disabled={submitting}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                      record.status === 'leave'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-background border border-border hover:bg-muted'
                    }`}
                    title="Leave"
                  >
                    <AlertCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Submit Button */}
      {attendance.length > 0 && (
        <button
          type="submit"
          disabled={submitting || loading}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit Attendance
        </button>
      )}
    </form>
  );
}
