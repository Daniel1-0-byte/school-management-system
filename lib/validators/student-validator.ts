/**
 * Student Validator
 * Frontend validation for student forms
 */

import { z } from 'zod';

export const StudentCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().optional(),
  admissionNumber: z.string().optional(),
  currentClassId: z.string().uuid('Invalid class').optional(),
  parentalStatus: z.string().optional(),
  medicalNotes: z.string().optional(),
  allergies: z.string().optional(),
});

export const StudentUpdateSchema = StudentCreateSchema.partial().refine(
  (data) => Object.values(data).some((val) => val !== undefined),
  'At least one field must be provided'
);

export type StudentCreateInput = z.infer<typeof StudentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof StudentUpdateSchema>;

export class StudentValidator {
  /**
   * Validate student creation
   */
  static validateCreate(data: unknown) {
    return StudentCreateSchema.safeParse(data);
  }

  /**
   * Validate student update
   */
  static validateUpdate(data: unknown) {
    return StudentUpdateSchema.safeParse(data);
  }

  /**
   * Validate admission number format
   */
  static isValidAdmissionNumber(admissionNumber: string): boolean {
    // Allow alphanumeric, hyphens, and slashes
    return /^[A-Za-z0-9\-/]+$/.test(admissionNumber);
  }

  /**
   * Validate date of birth
   */
  static isValidDateOfBirth(dateString: string): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const age = now.getFullYear() - date.getFullYear();
    // Age should be between 3 and 25
    return age >= 3 && age <= 25;
  }

  /**
   * Get validation error message
   */
  static getErrorMessage(error: z.ZodError): string {
    const firstError = error.errors[0];
    return firstError?.message || 'Validation failed';
  }
}
