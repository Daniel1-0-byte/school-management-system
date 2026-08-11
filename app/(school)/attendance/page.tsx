'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Check, Loader2, Save, Users, X } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import type { Class } from '@/lib/transformers/class-transformer';

type Status = 'present' | 'absent' | 'leave' | 'not-marked';
type Student = { studentId: string; studentName: string; status: Status; remarks: string };
type Year = { id: string; year: string | number; start_date: string; end_date: string; is_active: boolean };
type Term = { id: string; academic_year_id: string; type: string; start_date: string; end_date: string };
type SessionData = { session?: { schoolId?: string } };

const statusStyles: Record<Status, string> = {
  present: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  absent: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
  leave: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  'not-marked': 'bg-muted text-muted-foreground border-border',
};

export default function AttendancePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [years, setYears] = useState<Year[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [yearId, setYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTerm = terms.find((term) => term.id === termId);
  const counts = useMemo(() => ({
    present: students.filter((student) => student.status === 'present').length,
    absent: students.filter((student) => student.status === 'absent').length,
    leave: students.filter((student) => student.status === 'leave').length,
    unmarked: students.filter((student) => student.status === 'not-marked').length,
  }), [students]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        setLoading(true);
        const [yearsResponse, sessionResponse] = await Promise.all([
          fetch('/api/school/academic-years'),
          fetch('/api/auth/session'),
        ]);
        const yearsData = await yearsResponse.json();
        const sessionData = (await sessionResponse.json()) as SessionData;
        if (!yearsResponse.ok) throw new Error(yearsData.error || 'Failed to load academic years');
        if (!sessionResponse.ok || !sessionData.session?.schoolId) throw new Error('Unable to identify the current school');

        const classesResult = await SchoolService.getClasses(sessionData.session.schoolId, { pageSize: 100 });
        if (classesResult.error) throw new Error(classesResult.error);

        const nextYears = yearsData.data || [];
        setYears(nextYears);
        setClasses(classesResult.classes);
        const activeYear = nextYears.find((year: Year) => year.is_active) || nextYears[0];
        if (activeYear) setYearId(activeYear.id);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load attendance filters');
      } finally {
        setLoading(false);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    if (!yearId) return;
    const loadTerms = async () => {
      try {
        const response = await fetch(`/api/school/terms?academic_year_id=${yearId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load terms');
        const nextTerms = data.data || [];
        setTerms(nextTerms);
        const matchingTerm = nextTerms.find((term: Term) => today >= term.start_date && today <= term.end_date) || nextTerms[0];
        setTermId(matchingTerm?.id || '');
        if (matchingTerm && (date < matchingTerm.start_date || date > matchingTerm.end_date)) setDate(today >= matchingTerm.start_date && today <= matchingTerm.end_date ? today : matchingTerm.start_date);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load terms');
      }
    };
    loadTerms();
  }, [yearId]);

  const loadAttendance = useCallback(async () => {
    if (!classId || !termId || !date) {
      setStudents([]);
      return;
    }
    try {
      setLoadingRegister(true);
      setError(null);
      setMessage(null);
      const response = await fetch(`/api/school/attendance?class_id=${classId}&term_id=${termId}&date=${date}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load attendance');
      setStudents(data.students || []);
      setDirty(false);
    } catch (loadError) {
      setStudents([]);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load attendance');
    } finally {
      setLoadingRegister(false);
    }
  }, [classId, termId, date]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const updateStatus = (studentId: string, status: Status) => {
    setStudents((current) => current.map((student) => student.studentId === studentId ? { ...student, status } : student));
    setDirty(true);
    setMessage(null);
  };

  const markAll = (status: Status) => {
    setStudents((current) => current.map((student) => ({ ...student, status })));
    setDirty(true);
    setMessage(null);
  };

  const saveAttendance = async () => {
    if (!classId || !termId || !selectedTerm || students.length === 0) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const response = await fetch('/api/school/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, termId, date, records: students.filter((student) => student.status !== 'not-marked').map((student) => ({ studentId: student.studentId, status: student.status, remarks: student.remarks })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save attendance');
      setDirty(false);
      setMessage(`Attendance saved for ${data.count} students.`);
      await loadAttendance();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-primary">Daily register</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Attendance</h1>
        <p className="text-muted-foreground">Record attendance by term, class, and date.</p>
      </header>

      {(error || message) && <div className={`flex items-start gap-3 rounded-lg border p-4 ${error ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'}`} role="status">
        {error ? <AlertCircle className="mt-0.5 size-5 shrink-0" /> : <Check className="mt-0.5 size-5 shrink-0" />}
        <p className="text-sm font-medium">{error || message}</p>
      </div>}

      <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4 md:p-6" aria-label="Attendance filters">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">Academic year
            <select value={yearId} onChange={(event) => setYearId(event.target.value)} disabled={loading} className="h-11 rounded-lg border border-input bg-background px-3 text-foreground">
              <option value="">Select year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.year}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">Term
            <select value={termId} onChange={(event) => setTermId(event.target.value)} disabled={!terms.length} className="h-11 rounded-lg border border-input bg-background px-3 text-foreground">
              <option value="">Select term</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.type.replace('_', ' ')} · {term.start_date} to {term.end_date}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground"><span className="flex items-center gap-2"><CalendarDays className="size-4" />Date</span>
            <input type="date" value={date} min={selectedTerm?.start_date} max={selectedTerm?.end_date} onChange={(event) => setDate(event.target.value)} disabled={!selectedTerm} className="h-11 rounded-lg border border-input bg-background px-3 text-foreground" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">Class
            <select value={classId} onChange={(event) => setClassId(event.target.value)} disabled={!classes.length} className="h-11 rounded-lg border border-input bg-background px-3 text-foreground">
              <option value="">Select class</option>{classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.className}{schoolClass.section ? ` · ${schoolClass.section}` : ''}</option>)}
            </select>
          </label>
        </div>
        {selectedTerm && <p className="text-xs text-muted-foreground">Dates available for this register: {selectedTerm.start_date} through {selectedTerm.end_date}.</p>}
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Attendance summary">
        {[['Present', counts.present, 'text-emerald-700'], ['Absent', counts.absent, 'text-rose-700'], ['Leave', counts.leave, 'text-amber-700'], ['Not marked', counts.unmarked, 'text-muted-foreground']].map(([label, count, color]) => <div key={label} className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{count}</p></div>)}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between md:p-6">
          <div><h2 className="flex items-center gap-2 font-semibold text-foreground"><Users className="size-5 text-primary" />Student register</h2><p className="mt-1 text-sm text-muted-foreground">{students.length ? `${students.length} enrolled students` : 'Select a term, date, and class to begin.'}{dirty && <span className="ml-2 font-medium text-primary">Unsaved changes</span>}</p></div>
          {students.length > 0 && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => markAll('present')} className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700"><Check className="size-4" />All present</button><button type="button" onClick={() => markAll('absent')} className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700"><X className="size-4" />All absent</button></div>}
        </div>
        {loadingRegister ? <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground"><Loader2 className="size-5 animate-spin" />Loading register...</div> : students.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">{classId ? 'No active students found in this class.' : 'Choose a class to view its students.'}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[620px]"><thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th></tr></thead><tbody>{students.map((student) => <tr key={student.studentId} className="border-t border-border"><td className="px-4 py-4 font-medium text-foreground">{student.studentName}</td><td className="px-4 py-4"><select value={student.status} onChange={(event) => updateStatus(student.studentId, event.target.value as Status)} className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize ${statusStyles[student.status]}`}><option value="not-marked">Not marked</option><option value="present">Present</option><option value="absent">Absent</option><option value="leave">Leave</option></select></td></tr>)}</tbody></table></div>}
      </section>

      {students.length > 0 && <div className="flex justify-end"><button type="button" onClick={saveAttendance} disabled={saving || !termId || !classId || !dirty} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? 'Saving...' : dirty ? 'Save attendance' : 'Saved'}</button></div>}
    </main>
  );
}
