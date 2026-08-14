'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, CalendarDays, GraduationCap, Search, ShieldCheck } from 'lucide-react';

type Year = { id: string; name: string; start_date?: string };
type Student = { id: string; first_name: string; last_name: string; admission_number?: string; current_class_name?: string; status?: string; gender?: string; date_of_birth?: string; medical_notes?: string; allergies?: string; parental_status?: string };
type RecordData = { student: Student; enrollment: any; terms: any[]; selected_term: any; attendance: any[]; grades: any[]; report_cards: any[]; enrollment_history: any[] };

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

export default function StudentRecordsPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [yearId, setYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [data, setData] = useState<RecordData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      (async () => {
        const yearResponse = await fetch('/api/school/academic-years');
        const yearResult = await yearResponse.json();
        console.log('[v0] Academic years fetch RAW:', JSON.stringify(yearResult, null, 2));
        if (!yearResponse.ok) throw new Error(yearResult.error || 'Academic years request failed');
        if (yearResult.error) console.error('[v0] Academic years API error:', yearResult.error);
        return yearResult;
      })(),
      fetch('/api/school/students?limit=500').then((r) => r.json()),
      fetch('/api/auth/session').then(async (response) => {
        const raw = await response.json();
        console.log('[v0] Student records session response RAW:', JSON.stringify({
          status: response.status,
          ok: response.ok,
          academicYearId: raw?.session?.academicYearId || null,
          raw,
        }, null, 2));
        if (!response.ok) throw new Error(raw.error || 'Session request failed');
        return raw;
      }),
    ]).then(([yearResult, studentResult, session]) => {
      console.log('[v0] Student records filter results RAW:', JSON.stringify({ yearResult, studentResult, session }, null, 2));
      const loadedYears = yearResult.data || [];
      setYears(loadedYears);
      setYearId(session.session?.academicYearId || loadedYears[0]?.id || '');
      setStudents(studentResult.data || []);
    }).catch(() => setError('Unable to load student records filters'));
  }, []);

  const terms = data?.terms || [];
  useEffect(() => {
    if (data?.terms?.length && !data.terms.some((term: any) => term.id === termId)) setTermId(data.terms[0].id);
  }, [data?.terms, termId]);

  useEffect(() => {
    if (!studentId || !yearId) { setData(null); return; }
    setLoading(true); setError('');
    const params = new URLSearchParams({ student_id: studentId, academic_year_id: yearId });
    if (termId) params.set('term_id', termId);
    fetch(`/api/school/student-records?${params}`).then(async (r) => { const result = await r.json(); if (!r.ok) throw new Error(result.error); return result; }).then(setData).catch((e) => { setData(null); setError(e.message || 'Unable to load records'); }).finally(() => setLoading(false));
  }, [studentId, yearId, termId]);

  const attendanceSummary = useMemo(() => data?.attendance.reduce((summary: Record<string, number>, row: any) => { summary[row.status] = (summary[row.status] || 0) + 1; return summary; }, {}) || {}, [data?.attendance]);
  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return students.slice(0, 25);
    return students.filter((student) => [student.first_name, student.last_name, student.admission_number].filter(Boolean).some((value) => value!.toLowerCase().includes(query))).slice(0, 25);
  }, [studentQuery, students]);
  const selectedStudent = students.find((student) => student.id === studentId);

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">Records archive</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Student records</h1><p className="mt-2 max-w-2xl text-slate-600">Review a student&apos;s complete history by academic year and term.</p></div><div className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4" /> Admin read-only view</div></header>
    <section className={`${card} grid gap-4 md:grid-cols-[1.5fr_1fr_1fr]`}><div className="space-y-2 text-sm font-medium"><label htmlFor="student-search">Student</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" /><input id="student-search" value={studentQuery} onChange={(e) => { setStudentQuery(e.target.value); setStudentId(''); setData(null); }} placeholder="Search name or admission number" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" aria-describedby="student-search-help" />{studentQuery && !studentId && <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg" role="listbox" aria-label="Matching students">{filteredStudents.length ? filteredStudents.map((student) => <button type="button" key={student.id} role="option" aria-selected={student.id === studentId} onClick={() => { setStudentId(student.id); setStudentQuery(`${student.first_name} ${student.last_name}${student.admission_number ? ` · ${student.admission_number}` : ''}`); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-indigo-50"><span className="font-medium">{student.first_name} {student.last_name}</span><span className="text-xs text-slate-500">{student.admission_number || 'No admission number'}</span></button>) : <p className="px-3 py-3 text-sm text-slate-500">No matching students found.</p>}</div>}</div><p id="student-search-help" className="text-xs font-normal text-slate-500">Search by name or admission number.</p></div><label className="space-y-2 text-sm font-medium">Academic year<select value={yearId} onChange={(e) => { setYearId(e.target.value); setTermId(''); }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3"><option value="">Select year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label><label className="space-y-2 text-sm font-medium">Term<select value={termId} onChange={(e) => setTermId(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3"><option value="">All terms</option>{terms.map((term: any) => <option key={term.id} value={term.id}>{term.name}</option>)}</select></label></section>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!studentId && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Search className="mx-auto h-8 w-8 text-indigo-500" /><h2 className="mt-4 text-xl font-semibold">Choose a student to begin</h2><p className="mt-2 text-slate-500">Every section below will stay scoped to the selected academic year.</p></div>}
    {loading && <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Loading records…</div>}
    {data && selectedStudent && !loading && <>
      <section className="rounded-2xl bg-indigo-700 p-6 text-white shadow-sm"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><p className="text-indigo-200">{selectedStudent.admission_number || 'No admission number'}</p><h2 className="mt-1 text-2xl font-semibold">{selectedStudent.first_name} {selectedStudent.last_name}</h2><p className="mt-2 text-indigo-100">{data.enrollment?.school_classes?.name || 'No enrollment found for this academic year'}{data.enrollment?.school_class_streams?.name ? ` · Stream ${data.enrollment.school_class_streams.name}` : ''}</p></div><div className="rounded-xl bg-white/10 px-4 py-3"><p className="text-xs uppercase tracking-wider text-indigo-200">Enrollment status</p><p className="mt-1 font-semibold">{data.enrollment?.status || 'Not enrolled'}</p></div></div></section>
      <section className="grid gap-4 md:grid-cols-4"><div className={card}><p className="text-sm text-slate-500">Attendance records</p><p className="mt-2 text-3xl font-semibold">{data.attendance.length}</p></div><div className={card}><p className="text-sm text-slate-500">Present</p><p className="mt-2 text-3xl font-semibold text-emerald-600">{attendanceSummary.present || 0}</p></div><div className={card}><p className="text-sm text-slate-500">Grade entries</p><p className="mt-2 text-3xl font-semibold">{data.grades.length}</p></div><div className={card}><p className="text-sm text-slate-500">Report cards</p><p className="mt-2 text-3xl font-semibold">{data.report_cards.length}</p></div></section>
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"><div className={`${card} overflow-x-auto`}><div className="mb-4 flex items-center gap-2"><GraduationCap className="h-5 w-5 text-indigo-600" /><h3 className="font-semibold">Term grades</h3></div>{data.grades.length ? <table className="w-full text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="py-2">Subject</th><th>Score</th><th>Grade</th><th>Remarks</th></tr></thead><tbody>{data.grades.map((grade: any) => <tr key={grade.id} className="border-b last:border-0"><td className="py-3">{grade.subjects?.name || 'Subject'}</td><td>{grade.total_score ?? '—'}</td><td>{grade.letter_grade || grade.grade_type || '—'}</td><td>{grade.remarks || '—'}</td></tr>)}</tbody></table> : <p className="text-sm text-slate-500">No grades recorded for this term.</p>}</div><div className={`${card} space-y-4`}><h3 className="font-semibold">Student details</h3><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-slate-500">Date of birth</dt><dd className="mt-1">{selectedStudent.date_of_birth || '—'}</dd></div><div><dt className="text-slate-500">Gender</dt><dd className="mt-1">{selectedStudent.gender || '—'}</dd></div><div className="col-span-2"><dt className="text-slate-500">Medical notes</dt><dd className="mt-1">{selectedStudent.medical_notes || 'None recorded'}</dd></div><div className="col-span-2"><dt className="text-slate-500">Allergies</dt><dd className="mt-1">{selectedStudent.allergies || 'None recorded'}</dd></div></dl></div></section>
      <section className={`${card} overflow-x-auto`}><div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-indigo-600" /><h3 className="font-semibold">Enrollment history</h3></div><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="py-2">Academic year</th><th>Class</th><th>Stream</th><th>Status</th><th>Date</th></tr></thead><tbody>{data.enrollment_history.map((row: any) => <tr key={row.id} className="border-b last:border-0"><td className="py-3">{row.academic_year_id}</td><td>{row.school_classes?.name || '—'}</td><td>{row.school_class_streams?.name || '—'}</td><td>{row.status}</td><td>{row.enrollment_date || '—'}</td></tr>)}</tbody></table></section>
    </>}
  </div></main>;
}
