/**
 * This file contains the auto-generated Supabase database types.
 * Generated from your database schema via: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
 * 
 * For now, we provide a basic structure. Once Supabase is connected, regenerate this file.
 */

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          status: string;
          logo_url: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          principal_name: string | null;
          principal_email: string | null;
          student_capacity: number | null;
          founded_year: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['schools']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['schools']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          school_id: string;
          system_role: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          status: string;
          invite_token: string | null;
          invite_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      platform_admins: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          status: string;
          totp_secret: string | null;
          totp_enabled: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['platform_admins']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['platform_admins']['Insert']>;
      };
      students: {
        Row: {
          id: string;
          school_id: string;
          first_name: string;
          last_name: string;
          date_of_birth: string | null;
          admission_number: string | null;
          status: string;
          current_class_name: string | null;
          current_class_id: string | null;
          parental_status: string | null;
          medical_notes: string | null;
          allergies: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['students']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_type: string;
          target_id: string;
          target_name: string | null;
          school_id: string | null;
          changes: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
    CompositeTypes: Record<string, unknown>;
  };
}
