import { z } from 'zod';
import type { SignupRequest, LoginRequest, PlatformAdminLoginRequest, TwoFactorVerifyRequest } from '@/types';

// ============================================================================
// SCHOOL SIGNUP SCHEMA
// ============================================================================

export const signupSchema = z.object({
  schoolName: z.string().min(3, 'School name must be at least 3 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  tosAgreed: z.boolean().refine(val => val === true, 'You must agree to the Terms of Service'),
  captchaToken: z.string().min(1, 'CAPTCHA verification failed'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type SignupFormData = z.infer<typeof signupSchema>;

// ============================================================================
// LOGIN SCHEMA
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  captchaToken: z.string().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ============================================================================
// PLATFORM ADMIN LOGIN SCHEMA
// ============================================================================

export const platformAdminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  captchaToken: z.string().optional(),
});

export type PlatformAdminLoginFormData = z.infer<typeof platformAdminLoginSchema>;

// ============================================================================
// TWO FACTOR VERIFICATION SCHEMA
// ============================================================================

export const twoFactorSchema = z.object({
  code: z.string()
    .length(6, 'Code must be 6 digits')
    .regex(/^[0-9]{6}$/, 'Code must contain only digits'),
});

export type TwoFactorFormData = z.infer<typeof twoFactorSchema>;

// ============================================================================
// STUDENT FORM SCHEMA
// ============================================================================

export const studentFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().optional(),
  admissionNumber: z.string().optional(),
  parentalStatus: z.string().optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().optional(),
});

export type StudentFormData = z.infer<typeof studentFormSchema>;

// ============================================================================
// TEACHER FORM SCHEMA
// ============================================================================

export const teacherFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  qualifications: z.string().optional(),
});

export type TeacherFormData = z.infer<typeof teacherFormSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates signup data server-side
 */
export function validateSignup(data: unknown): SignupRequest | null {
  try {
    return signupSchema.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Validates login data server-side
 */
export function validateLogin(data: unknown): LoginRequest | null {
  try {
    return loginSchema.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Validates platform admin login data server-side
 */
export function validatePlatformAdminLogin(data: unknown): PlatformAdminLoginRequest | null {
  try {
    return platformAdminLoginSchema.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Validates 2FA code server-side
 */
export function validateTwoFactorCode(data: unknown): TwoFactorVerifyRequest | null {
  try {
    const parsed = twoFactorSchema.parse(data);
    return { code: parsed.code };
  } catch (error) {
    return null;
  }
}

// ============================================================================
// GRADES MODULE SCHEMAS (Phase 1)
// ============================================================================

/**
 * Assessment creation/update schema
 * Used for creating or updating a grading task (e.g., "Term 1 Exam for B1 Mathematics")
 */
export const assessmentSchema = z.object({
  name: z.string().min(3, 'Assessment name must be at least 3 characters').max(255),
  description: z.string().optional(),
  assessment_type: z.enum(['term_exam', 'class_test', 'assignment', 'project', 'midterm', 'final']),
  stream_id: z.string().uuid('Invalid stream ID'),
  subject_id: z.string().uuid('Invalid subject ID'),
  academic_year_id: z.string().uuid('Invalid academic year ID'),
  max_marks: z.number().positive().optional().default(100),
});

export type AssessmentFormData = z.infer<typeof assessmentSchema>;

/**
 * Grade entry schema (3-score model)
 * Teachers enter class_score and exam_score; total_score auto-calculates
 */
export const gradeEntrySchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  assessment_id: z.string().uuid('Invalid assessment ID'),
  class_score: z.number().min(0).max(100).nullable().optional(),
  exam_score: z.number().min(0).max(100).nullable().optional(),
  recorded_by: z.string().uuid('Invalid teacher ID').optional(),
}).refine(data => {
  // At least one score must be provided
  return data.class_score !== null || data.exam_score !== null;
}, {
  message: 'At least one of class_score or exam_score must be provided',
});

export type GradeEntryFormData = z.infer<typeof gradeEntrySchema>;

/**
 * Bulk grade entry schema (for saving multiple grades at once)
 */
export const bulkGradeEntrySchema = z.object({
  entries: z.array(gradeEntrySchema).min(1, 'At least one grade entry is required'),
  assessment_id: z.string().uuid('Invalid assessment ID'),
});

export type BulkGradeEntryFormData = z.infer<typeof bulkGradeEntrySchema>;

/**
 * Assessment status update schema
 * Used for submission, approval, or returning assessments
 */
export const assessmentStatusUpdateSchema = z.object({
  status: z.enum(['draft', 'submitted', 'returned', 'approved']),
  approval_notes: z.string().optional(),
});

export type AssessmentStatusUpdateData = z.infer<typeof assessmentStatusUpdateSchema>;

/**
 * Grading policy schema (per-school configuration)
 */
export const gradingPolicySchema = z.object({
  class_score_weight: z.number().min(0).max(100).default(30),
  exam_score_weight: z.number().min(0).max(100).default(70),
  grade_scale: z.record(z.string(), z.number()).optional(),
  remarks_scale: z.record(z.string(), z.string()).optional(),
});

export type GradingPolicyFormData = z.infer<typeof gradingPolicySchema>;

/**
 * Validates assessment data server-side
 */
export function validateAssessment(data: unknown): AssessmentFormData | null {
  try {
    return assessmentSchema.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Validates grade entry data server-side
 */
export function validateGradeEntry(data: unknown): GradeEntryFormData | null {
  try {
    return gradeEntrySchema.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Validates bulk grade entry data server-side
 */
export function validateBulkGradeEntry(data: unknown): BulkGradeEntryFormData | null {
  try {
    return bulkGradeEntrySchema.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Validates assessment status update server-side
 */
export function validateAssessmentStatusUpdate(data: unknown): AssessmentStatusUpdateData | null {
  try {
    return assessmentStatusUpdateSchema.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Validates grading policy data server-side
 */
export function validateGradingPolicy(data: unknown): GradingPolicyFormData | null {
  try {
    return gradingPolicySchema.parse(data);
  } catch (error) {
    return null;
  }
}
