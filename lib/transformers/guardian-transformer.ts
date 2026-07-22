import type { Guardian } from '@/types';

export type GuardianRecord = {
  id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  relationship: 'parent' | 'guardian' | 'relative';
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  occupation: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type { Guardian };

export class GuardianTransformer {
  static toUI(record: GuardianRecord): Guardian {
    return {
      id: record.id,
      firstName: record.first_name,
      lastName: record.last_name,
      email: record.email,
      phone: record.phone,
      relationship: record.relationship,
      address: record.address,
      city: record.city,
      state: record.state,
      postalCode: record.postal_code,
      occupation: record.occupation,
      status: record.status,
      schoolId: record.school_id,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  static toUIList(records: GuardianRecord[]): Guardian[] {
    return records.map(this.toUI);
  }

  static fromUI(data: Partial<Guardian>): Partial<GuardianRecord> {
    return {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      relationship: data.relationship,
      address: data.address,
      city: data.city,
      state: data.state,
      postal_code: data.postalCode,
      occupation: data.occupation,
      status: data.status,
    };
  }

  static displayName(guardian: Guardian): string {
    return `${guardian.firstName} ${guardian.lastName}`.trim() || 'N/A';
  }

  static initials(guardian: Guardian): string {
    const first = guardian.firstName?.[0] || '';
    const last = guardian.lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  }
}
