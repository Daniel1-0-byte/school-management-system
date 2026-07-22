/**
 * Class Validator
 * Frontend validation for class forms
 */

import { z } from 'zod';

export const ClassCreateSchema = z.object({
  className: z.string().min(1, 'Class name is required').max(100),
  gradeLevel: z.string().min(1, 'Grade level is required'),
  section: z.string().min(1, 'Section is required'),
  classTeacherId: z.string().optional(),
  capacity: z.number().min(1).max(500).optional(),
  academicYearId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const ClassUpdateSchema = ClassCreateSchema.partial().refine(
  (data) => Object.values(data).some((val) => val !== undefined),
  'At least one field must be provided'
);

export type ClassCreateInput = z.infer<typeof ClassCreateSchema>;
export type ClassUpdateInput = z.infer<typeof ClassUpdateSchema>;

export class ClassValidator {
  /**
   * Validate class creation
   */
  static validateCreate(data: unknown) {
    return ClassCreateSchema.safeParse(data);
  }

  /**
   * Validate class update
   */
  static validateUpdate(data: unknown) {
    return ClassUpdateSchema.safeParse(data);
  }

  /**
   * Validate capacity
   */
  static isValidCapacity(capacity: number): boolean {
    return capacity > 0 && capacity <= 500;
  }

  /**
   * Get validation error message
   */
  static getErrorMessage(error: z.ZodError): string {
    const firstError = error.errors[0];
    return firstError?.message || 'Validation failed';
  }
}
