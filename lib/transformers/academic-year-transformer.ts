import type { AcademicYear } from '@/types';

export type AcademicYearRecord = {
  id: string;
  school_id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: 'active' | 'completed' | 'draft';
  created_at: string;
  updated_at: string;
};

export type { AcademicYear };

export class AcademicYearTransformer {
  static toUI(record: AcademicYearRecord): AcademicYear {
    return {
      id: record.id,
      yearName: record.year_name,
      startDate: record.start_date,
      endDate: record.end_date,
      isCurrent: record.is_current,
      status: record.status,
      schoolId: record.school_id,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  static toUIList(records: AcademicYearRecord[]): AcademicYear[] {
    return records.map(this.toUI);
  }

  static fromUI(data: Partial<AcademicYear>): Partial<AcademicYearRecord> {
    return {
      year_name: data.yearName,
      start_date: data.startDate,
      end_date: data.endDate,
      is_current: data.isCurrent,
      status: data.status,
    };
  }

  static displayName(year: AcademicYear): string {
    return year.yearName || 'N/A';
  }
}
