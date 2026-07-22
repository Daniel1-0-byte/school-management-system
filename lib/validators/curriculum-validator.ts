import { z } from 'zod';

// ============================================================================
// CURRICULUM VALIDATION SCHEMAS
// ============================================================================

export const createCurriculumSchema = z.object({
  name: z.string().min(3, 'Curriculum name must be at least 3 characters').max(255),
  version: z.string().min(1, 'Version is required').max(50),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(false),
});

export const updateCurriculumSchema = createCurriculumSchema.partial();

export const systemClassSchema = z.object({
  curriculumId: z.string().uuid('Invalid curriculum ID'),
  code: z.string().min(1, 'Class code is required').max(50),
  name: z.string().min(1, 'Class name is required').max(100),
  displayOrder: z.number().int().nonnegative('Display order must be non-negative'),
});

export const systemSubjectSchema = z.object({
  code: z.string().min(1, 'Subject code is required').max(50).unique('subject_code_unique'),
  name: z.string().min(1, 'Subject name is required').max(150),
  shortName: z.string().max(50).optional().nullable(),
  description: z.string().optional().nullable(),
});

export const systemClassSubjectSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  subjectId: z.string().uuid('Invalid subject ID'),
  displayOrder: z.number().int().nonnegative('Display order must be non-negative'),
  isCore: z.boolean().default(true),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateCurriculumInput = z.infer<typeof createCurriculumSchema>;
export type UpdateCurriculumInput = z.infer<typeof updateCurriculumSchema>;
export type SystemClassInput = z.infer<typeof systemClassSchema>;
export type SystemSubjectInput = z.infer<typeof systemSubjectSchema>;
export type SystemClassSubjectInput = z.infer<typeof systemClassSubjectSchema>;
