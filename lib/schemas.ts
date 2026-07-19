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
