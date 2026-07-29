# Database Schema Audit Report

## Critical Findings

### MAJOR ISSUE: Assessments table missing `term_id` column

The `assessments` table in the actual Supabase database **DOES NOT** have a `term_id` column, but the code references it:

**Schema reality:**
- Assessments has: academic_year_id, stream_id, subject_id
- Grade_entries has: term_id, subject_id, student_id, assessment_id (optional)

**Code references (INCORRECT):**
- app/api/school/assessments/route.ts: `if (termId) query = query.eq('term_id', termId);`
- components/grades/subject-selector.tsx: Passes term_id to GradeDashboard
- components/grades/grade-dashboard.tsx: Filters assessments by term_id

### Missing Tables in Code

1. **school_class_stream_subjects** - Referenced in lib/supabase.ts and subjects API
   - Status: NOT in actual schema
   - Impact: Subjects API cannot query this table

2. **academic_year_terms** - NOT in actual schema
   - Status: Table `terms` exists instead
   - Impact: Terms are stored directly in `terms` table with school_id, academic_year_id

## Actual Database Schema (Grades-Related Tables)

### academic_years
- id, school_id, year, start_date, end_date, is_active, created_at, updated_at

### terms
- id, academic_year_id, type ('term_1', 'term_2', 'term_3'), start_date, end_date, report_card_deadline, created_at, updated_at
- **Does NOT have: term_number, name, is_active**

### assessments
- id, school_id, academic_year_id, stream_id, subject_id, name, description, assessment_type, max_marks, status
- progress_count, total_students, last_modified, submitted_by, submitted_at, approved_by, approved_at
- returned_at, approval_notes, created_at, updated_at
- **Does NOT have: term_id**

### grade_entries
- id, school_id, student_id, term_id, subject_id, teacher_id, score, grade_type, letter_grade, remarks
- recorded_at, created_at, updated_at, assessment_id (optional), class_score, exam_score, total_score
- recorded_by, submission_status

### Key Observation
**Grade entries are tied to TERMS, not assessments**. The term_id in grade_entries is the direct foreign key. Assessments do not track terms.

## Missing Table References

| Table Name | Referenced In | Status | Impact |
|------------|---------------|--------|--------|
| school_class_stream_subjects | lib/supabase.ts, app/api/school/subjects/route.ts | NOT in schema | Subjects API will fail |
| academic_year_terms | Terms API implementation | NOT in schema | Use `terms` table directly |

## Code References That Need Fixing

### 1. Assessments API (app/api/school/assessments/route.ts)
- **Line:** `if (termId) query = query.eq('term_id', termId);`
- **Issue:** assessments table has no term_id column
- **Fix:** Remove term_id filtering from assessments API, or store term in assessment name/metadata

### 2. GradeDashboard (components/grades/grade-dashboard.tsx)
- **Issue:** Passes termId to assessment lookup filter
- **Fix:** Assessment lookup should use academic_year_id, stream_id, subject_id only

### 3. SubjectSelector (components/grades/subject-selector.tsx)
- **Issue:** Passes term_id to GradeDashboard which filters assessments
- **Note:** Term_id should be stored separately or in grade_entries directly

### 4. Subjects API (app/api/school/subjects/route.ts)
- **Issue:** Queries non-existent school_class_stream_subjects table
- **Fix:** Needs to determine correct table for subject-stream assignments

## Workflow Mismatch

**Current Code Assumes:**
- Year → Term → Stream → Subject → Assessments (with term_id filter)

**Actual Schema Supports:**
- Year → Term (stored separately)
- Year → Stream → Subject → Assessments (no term in assessments)
- Grade entries link students + subjects + terms together

## Recommendations

### Option A: Store Term in Assessment Name
- Assessment name: "2024-Term1-BasicA-Math"
- Filter assessments by academic_year_id, stream_id, subject_id
- Term information in grade_entries only

### Option B: Create Missing Junction Table
- Create `assessment_terms` junction table
- Links assessments to specific terms
- Requires database migration

### Option C: Add term_id to Assessments
- Add term_id column to assessments table
- Requires database migration
- Aligns with current code design

## Next Steps

1. Decide on architecture (A, B, or C above)
2. Fix all API filtering logic
3. Update frontend components
4. Generate accurate database schema documentation
5. Create migration if needed

## Files to Review/Fix

- lib/supabase.ts - querySchoolClassStreamSubjects references
- app/api/school/subjects/route.ts - Queries school_class_stream_subjects
- app/api/school/assessments/route.ts - term_id filtering
- components/grades/grade-dashboard.tsx - term_id assessment filtering
- components/grades/subject-selector.tsx - term_id passing
