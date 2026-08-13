'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, GraduationCap, Loader2 } from 'lucide-react';

type Year = { id: string; year: string };
type ClassItem = { id: string; name: string; display_order: number | null };
type Student = {
  enrollment_id: string;
  student_id: string;
  name: string;
  source_stream_name: string | null;
  target_stream: { id: string; name: string } | null;
  default_outcome: 'promote' | 'graduate';
};
type Preview = {
  source: { name: string; display_order?: number; is_final_class?: boolean };
  target: { id?: string; name: string; streams: { id: string; name: string }[] } | null;
  informational_messages?: string[];
  warnings: string[];
  students: Student[];
};
type Outcome = 'PROMOTE' | 'HOLD_BACK' | 'GRADUATE';

export default function PromotionPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sourceYear, setSourceYear] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [classId, setClassId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Record<string, number> | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/school/academic-years').then((response) => response.json()),
      fetch('/api/school/streams?activeOnly=true').then((response) => response.json()),
    ]).then(([yearResult, streamResult]) => {
      const loadedYears: Year[] = yearResult.data || [];
      setYears(loadedYears);
      setSourceYear(loadedYears[0]?.id || '');
      setTargetYear(loadedYears[1]?.id || '');
      const loadedClasses = (streamResult.data || [])
        .map((stream: any) => stream.school_classes)
        .filter(Boolean)
        .reduce((items: ClassItem[], item: ClassItem) => items.some((existing) => existing.id === item.id) ? items : [...items, item], []);
      setClasses(loadedClasses.sort((a: ClassItem, b: ClassItem) => (a.display_order ?? 999) - (b.display_order ?? 999)));
    }).catch(() => setError('Unable to load academic years and classes'));
  }, []);

  const canPreview = Boolean(sourceYear && targetYear && classId && sourceYear !== targetYear);
  const blocked = !preview?.target || Boolean(preview?.warnings.length);
  const counts = useMemo(() => Object.values(outcomes).reduce((result, outcome) => {
    if (outcome === 'PROMOTE') result.promote += 1;
    if (outcome === 'HOLD_BACK') result.holdBack += 1;
    if (outcome === 'GRADUATE') result.graduate += 1;
    return result;
  }, { promote: 0, holdBack: 0, graduate: 0 }), [outcomes]);

  const loadPreview = async () => {
    if (!canPreview) return;
    setLoading(true); setError(null); setSuccess(null); setConfirmed(false);
    try {
      const response = await fetch(`/api/school/promotion/preview?source_year_id=${sourceYear}&target_year_id=${targetYear}&class_id=${classId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to build preview');
      setPreview(result);
      setOutcomes(Object.fromEntries(result.students.map((student: Student) => [student.enrollment_id, student.default_outcome === 'graduate' ? 'GRADUATE' : 'PROMOTE'])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to build preview');
    } finally { setLoading(false); }
  };

  const execute = async () => {
    if (!preview || blocked || !confirmed) return;
    setExecuting(true); setError(null);
    try {
      const response = await fetch('/api/school/promotion/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_year_id: sourceYear,
          target_year_id: targetYear,
          outcomes: preview.students.map((student) => ({
            enrollment_id: student.enrollment_id,
            outcome: outcomes[student.enrollment_id],
            target_class_id: preview.target?.id,
            target_stream_id: student.target_stream?.id,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Promotion transaction failed. Nothing was changed.');
      setSuccess(result.summary || {});
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Promotion transaction failed.'} Nothing was changed; the transaction rolled back.`);
    } finally { setExecuting(false); }
  };

  return <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
    <header className="flex flex-col gap-2"><div className="flex items-center gap-3"><GraduationCap className="size-7 text-primary" /><h1 className="text-3xl font-semibold tracking-tight">Student Promotion</h1></div><p className="text-muted-foreground">Review student outcomes before moving records into the next academic year.</p></header>
    <section className="rounded-lg border bg-card p-6"><h2 className="text-xl font-semibold">Promotion setup</h2><div className="mt-5 grid gap-4 md:grid-cols-3"><select aria-label="Source academic year" className="h-10 rounded-md border bg-background px-3 text-sm" value={sourceYear} onChange={(event) => setSourceYear(event.target.value)}><option value="">Source academic year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.year}</option>)}</select><select aria-label="Target academic year" className="h-10 rounded-md border bg-background px-3 text-sm" value={targetYear} onChange={(event) => setTargetYear(event.target.value)}><option value="">Target academic year</option>{years.filter((year) => year.id !== sourceYear).map((year) => <option key={year.id} value={year.id}>{year.year}</option>)}</select><select aria-label="Class to promote" className="h-10 rounded-md border bg-background px-3 text-sm" value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Class to promote</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><button className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" onClick={loadPreview} disabled={!canPreview || loading}>{loading && <Loader2 className="size-4 animate-spin" />} Build preview</button></section>
    {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
    {preview && <section className="flex flex-col gap-5 rounded-lg border bg-card p-6"><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-semibold">{preview.source.name}</h2><ArrowRight className="size-4" /><span className="font-medium">{preview.target?.name || 'No next class'}</span></div>{preview.informational_messages?.map((message) => <p key={message} className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">{message}</p>)}{preview.warnings.map((warning) => <p key={warning} className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{warning}</p>)}<div className="grid gap-3 md:grid-cols-3"><div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Promoting</p><p className="text-2xl font-semibold">{counts.promote}</p></div><div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Holding back</p><p className="text-2xl font-semibold">{counts.holdBack}</p></div><div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Graduating</p><p className="text-2xl font-semibold">{counts.graduate}</p></div></div><div className="overflow-x-auto rounded-md border"><table className="w-full text-left text-sm"><thead className="bg-muted/50"><tr><th className="p-3">Student</th><th className="p-3">Current stream</th><th className="p-3">Outcome</th></tr></thead><tbody>{preview.students.map((student) => <tr key={student.enrollment_id} className="border-t"><td className="p-3 font-medium">{student.name}</td><td className="p-3 text-muted-foreground">{student.source_stream_name || 'Unassigned'}</td><td className="p-3"><select aria-label={`Outcome for ${student.name}`} className="h-9 rounded-md border bg-background px-2" value={outcomes[student.enrollment_id]} onChange={(event) => setOutcomes((current) => ({ ...current, [student.enrollment_id]: event.target.value as Outcome }))}><option value="PROMOTE">Promote</option><option value="HOLD_BACK">Hold back</option><option value="GRADUATE">Graduate</option></select></td></tr>)}</tbody></table></div>{!blocked && !success && <div className="flex flex-col gap-3 rounded-md border p-4"><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> <span>I reviewed these outcomes and confirm that the entire transaction should be executed.</span></label><button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" onClick={execute} disabled={!confirmed || executing}>{executing && <Loader2 className="size-4 animate-spin" />} Confirm &amp; Execute</button></div>}{success && <div role="status" className="flex flex-col gap-2 rounded-md border border-primary/30 bg-primary/10 p-4 text-sm"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-4" />Promotion completed</div><p>{success.promoted_count || 0} promoting, {success.held_back_count || 0} holding back, {success.graduated_count || 0} graduating.</p></div>}</section>}
  </main>;
}
