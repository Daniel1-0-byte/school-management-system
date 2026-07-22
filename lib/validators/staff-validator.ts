/**
 * Staff Validator
 * Frontend validation for staff forms
 */

import { z } from 'zod';

export const StaffCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['teacher', 'admin', 'staff'], { errorMap: () => ({ message: 'Invalid role' }) }),
  department: z.string().optional(),
  qualification: z.string().optional(),
  experienceYears: z.number().min(0).max(100).optional(),
  dateOfJoining: z.string().optional(),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
});

export const StaffUpdateSchema = StaffCreateSchema.partial().refine(
  (data) => Object.values(data).some((val) => val !== undefined),
  'At least one field must be provided'
);

export type StaffCreateInput = z.infer<typeof StaffCreateSchema>;
export type StaffUpdateInput = z.infer<typeof StaffUpdateSchema>;

export class StaffValidator {
  /**
   * Validate staff creation
   */
  static validateCreate(data: unknown) {
    return StaffCreateSchema.safeParse(data);
  }

  /**
   * Validate staff update
   */
  static validateUpdate(data: unknown) {
    return StaffUpdateSchema.safeParse(data);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Get validation error message
   */
  static getErrorMessage(error: z.ZodError): string {
    const firstError = error.errors[0];
    return firstError?.message || 'Validation failed';
  }
}
