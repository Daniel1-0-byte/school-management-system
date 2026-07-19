'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Save, AlertCircle, Loader2, Download, Check, X } from 'lucide-react';

interface StudentAttendance {
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'leave' | 'not-marked';
}

export default function AttendancePage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [classes, setClasses] = useState([
    { id: 'class-1', name: 'Class 1-A' },
    { id: 'class-2', name: 'Class 2-B' },
    { id: 'class-3', name: 'Class 3-A' },
  ]);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      fetchAttendance();
    }
  }, [selectedClass, selectedDate]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/school/attendance?classId=${selectedClass}&date=${selectedDate}`
      );
      if (!response.ok) throw new Error('Failed to fetch attendance');

      const data = await response.json();
      setStudents(data.students || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const updateAttendance = (studentId: string, status: string) => {
    setStudents(
      students.map((s) =>
        s.studentId === studentId
          ? { ...s, status: status as any }
          : s
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/school/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          date: selectedDate,
          attendance: students,
        }),
      });

      if (!response.ok) throw new Error('Failed to save attendance');
      setError(null); // Clear any errors
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    setStudents(students.map(s => ({ ...s, status: 'present' })));
  };

  const markAllAbsent = () => {
    setStudents(students.map(s => ({ ...s, status: 'absent' })));
  };

  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const leaveCount = students.filter(s => s.status === 'leave').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground mt-1">Mark and manage student attendance</p>
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

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Class Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="flex items-end gap-2">
            <div className="flex-1 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
              <p className="text-xs text-muted-foreground">Present</p>
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            </div>
            <div className="flex-1 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
              <p className="text-xs text-muted-foreground">Absent</p>
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            </div>
            <div className="flex-1 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <p className="text-xs text-muted-foreground">Leave</p>
              <p className="text-2xl font-bold text-yellow-600">{leaveCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {students.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={markAllPresent}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Mark All Present</span>
          </button>
          <button
            onClick={markAllAbsent}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Mark All Absent</span>
          </button>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading attendance...</p>
          </div>
        ) : !selectedClass ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Please select a class to mark attendance</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No students in this class</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Student Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.studentId} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{student.studentName}</td>
                    <td className="px-6 py-4">
                      <select
                        value={student.status}
                        onChange={(e) => updateAttendance(student.studentId, e.target.value)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium border ${
                          student.status === 'present'
                            ? 'bg-green-500/20 text-green-600 border-green-500/30'
                            : student.status === 'absent'
                              ? 'bg-red-500/20 text-red-600 border-red-500/30'
                              : student.status === 'leave'
                                ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
                                : 'bg-muted border-border'
                        }`}
                      >
                        <option value="not-marked">Not Marked</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="leave">Leave</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Button */}
      {students.length > 0 && (
        <div className="flex justify-between">
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Attendance</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
