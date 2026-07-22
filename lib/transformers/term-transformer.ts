import type { Term } from '@/types';

export type TermRecord = {
  id: string;
  school_id: string;
  academic_year_id: string;
  term_name: string;
  start_date: string;
  end_date: string;
  term_number: number;
  status: 'active' | 'completed' | 'draft';
  created_at: string;
  updated_at: string;
};

export type { Term };

export class TermTransformer {
  static toUI(record: TermRecord): Term {
    return {
      id: record.id,
      academicYearId: record.academic_year_id,
      termName: record.term_name,
      startDate: record.start_date,
      endDate: record.end_date,
      termNumber: record.term_number,
      status: record.status,
      schoolId: record.school_id,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  static toUIList(records: TermRecord[]): Term[] {
    return records.map(this.toUI);
  }

  static fromUI(data: Partial<Term>): Partial<TermRecord> {
    return {
      academic_year_id: data.academicYearId,
      term_name: data.termName,
      start_date: data.startDate,
      end_date: data.endDate,
      term_number: data.termNumber,
      status: data.status,
    };
  }

  static displayName(term: Term): string {
    return term.termName || 'N/A';
  }
}
