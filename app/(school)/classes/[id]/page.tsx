'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Trash2, Users } from 'lucide-react';

type Teacher = { id: string; first_name: string; last_name: string; email: string | null };
type Assignment = { id: string; teacher_id: string; subjects: string[]; is_primary_teacher: boolean; start_date: string | null; end_date: string | null };
type Payload = { stream: { name: string; academic_year_id: string }; assignments: Assignment[]; teachers: Teacher[] };

export default function ClassroomPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [teacherId, setTeacherId] = useState('');
  const [primary, setPrimary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const response = await fetch('/api/school/classrooms/' + window.location.pathname.split('/')[2] + '/teachers', { credentials: 'include' });
    const result = await response.json();
    if (!response.ok) setError(result.error || 'Failed to load teachers');
    else setData(result);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const streamId = typeof window === 'undefined' ? '' : window.location.pathname.split('/')[2];
  const addTeacher = async () => {
    if (!teacherId || !data) return;
    setSaving(true); setError('');
    const response = await fetch(`/api/school/classrooms/${streamId}/teachers/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teacher_id: teacherId, academic_year_id: data.stream.academic_year_id, subjects: [], is_primary_teacher: primary }) });
    const result = await response.json();
    if (!response.ok) setError(result.error || 'Failed to assign teacher');
    else { setTeacherId(''); setPrimary(false); await load(); }
    setSaving(false);
  };

  const removeTeacher = async (assignmentId: string) => {
    const response = await fetch(`/api/school/classrooms/${streamId}/teachers/${assignmentId}`, { method: 'DELETE' });
    if (!response.ok) { const result = await response.json(); setError(result.error || 'Failed to remove teacher'); return; }
    await load();
  };

  if (loading) return <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (!data) return <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">{error || 'Classroom unavailable'}</div>;

  return (
    <main className="space-y-6">
      <a href="/classes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Classes</a>
      <header><p className="text-sm font-medium uppercase tracking-wide text-primary">Manage Classroom</p><h1 className="mt-1 text-3xl font-bold text-foreground">{data.stream.name}</h1><p className="mt-1 text-muted-foreground">Teachers</p></header>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="mb-5 flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><h2 className="text-lg font-semibold text-foreground">Assigned teachers</h2><p className="text-sm text-muted-foreground">Assign or remove teachers for this classroom.</p></div></div>
        <div className="space-y-3">
          {data.assignments.length === 0 ? <p className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">No teachers assigned yet.</p> : data.assignments.map((assignment) => { const teacher = data.teachers.find((item) => item.id === assignment.teacher_id); return <div key={assignment.id} className="flex items-center justify-between rounded-md border border-border p-4"><div><p className="font-medium text-foreground">{teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown teacher'}</p>{teacher?.email && <p className="text-sm text-muted-foreground">{teacher.email}</p>}{assignment.is_primary_teacher && <span className="mt-2 inline-block rounded bg-primary/10 px-2 py-1 text-xs text-primary">Primary teacher</span>}</div><button type="button" onClick={() => removeTeacher(assignment.id)} className="rounded-md p-2 text-destructive hover:bg-destructive/10" aria-label="Remove teacher"><Trash2 className="h-4 w-4" /></button></div>; })}
        </div>
      </section>
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Assign a teacher</h2>
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <label className="flex-1 text-sm font-medium text-foreground">Teacher<select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 font-normal"><option value="">Select teacher</option>{data.teachers.filter((teacher) => !data.assignments.some((assignment) => assignment.teacher_id === teacher.id)).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.first_name} {teacher.last_name}</option>)}</select></label>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground"><input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} /> Primary teacher</label>
          <button type="button" onClick={addTeacher} disabled={!teacherId || saving} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? 'Assigning...' : 'Assign teacher'}</button>
        </div>
      </section>
    </main>
  );
}
