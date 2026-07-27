# Grades Module - Simplified Architecture (FINAL)

**Date:** July 26, 2026  
**Status:** Approved for Phase 1 Implementation  
**Revision:** Simplified Assessment Model - 3 Score Fields Only

---

## EXECUTIVE SUMMARY

This document replaces all previous versions with a **pragmatic, minimal grading system** designed for immediate usability in schools.

**Design Principles:**
- ✅ Fast teacher data entry (3-5 clicks per assessment)
- ✅ Minimal database schema (2 tables + 1 settings table)
- ✅ Zero breaking changes to existing modules
- ✅ Extensible for future features without redesign
- ✅ Works with existing SchoolHub architecture

**Timeline: 3 weeks (not 5-6) with working system by end of Phase 2**

---

## PART 1: SIMPLIFIED DATA MODEL

### Core Principle
Every assessment contains **exactly 3 score fields**:
1. **Class Score** (0-100) - Teacher-weighted continuous assessment
2. **Exam Score** (0-100) - Formal exam/terminal exam
3. **Total Score** (auto-calculated) - Final grade based on school weighting

**Everything else (homework, exercises, projects, quizzes, classwork) is aggregated by the teacher into Class Score BEFORE entry.**

### What This Means
```
TEACHER'S WORK:
  Homework       = 5
  Exercise       = 10
  Project        = 15
  Classwork      = 10
  Classwork Quiz = 5
  ─────────────────
  Class Score    = 45  ← Teacher enters this ONE number

THEN:
  Exam Score     = 62  ← From exam admin/result sheet
  
SYSTEM CALCULATES (based on school policy):
  Total Score    = (45 × 0.30) + (62 × 0.70) = 13.5 + 43.4 = 56.9
  Grade          = D (if 50-59 = D)
  Remark         = "Satisfactory"
```

### Rationale
- **Teachers already do this manually** - We're just formalizing it
- **Reduces data entry burden by 80%** - One field instead of five
- **Matches school reality** - Most Ghanaian schools weight equally
- **Future-proof** - Easy to add homework/exercise tracking later if needed
- **Performance** - Fewer columns = faster queries

---

## PART 2: SCHOOL GRADING POLICY (NEW TABLE)

### New Table: `school_grading_policies`

```sql
CREATE TABLE school_grading_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Weighting configuration
  class_score_weight DECIMAL(3,2) NOT NULL DEFAULT 0.30,  -- e.g., 0.30 = 30%
  exam_score_weight DECIMAL(3,2) NOT NULL DEFAULT 0.70,   -- e.g., 0.70 = 70%
  
  -- Grade scale (simple version - no need for separate table)
  grade_scale JSONB NOT NULL DEFAULT '[
    {"min": 90, "max": 100, "letter": "A", "remark": "Excellent"},
    {"min": 80, "max": 89, "letter": "B", "remark": "Very Good"},
    {"min": 70, "max": 79, "letter": "C", "remark": "Good"},
    {"min": 60, "max": 69, "letter": "D", "remark": "Satisfactory"},
    {"min": 50, "max": 59, "letter": "E", "remark": "Pass"},
    {"min": 0,  "max": 49, "letter": "F", "remark": "Fail"}
  ]',
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT weight_sum CHECK (
    ROUND((class_score_weight + exam_score_weight)::NUMERIC, 2) = 1.00
  )
);

-- Every school gets ONE default policy
ALTER TABLE school_grading_policies ADD CONSTRAINT one_per_school 
  UNIQUE(school_id);
```

**Why JSONB for grade_scale?**
- Schools can customize: Some use A-F, others use 1-5, others use Pass/Fail
- No need for separate grade_scales table
- Easy for School Admin to edit: "Grade Settings" button → Edit JSON in UI
- Future: If custom scales become complex, can refactor to separate table without breaking existing data

**Configuration UI (School Admin):**
```
Grade Settings

Class Score Weight:     [ 30 ]%
Exam Score Weight:      [ 70 ]%
                        ─────────
                        100%

Grade Scale (editable):
A: 90-100  (Excellent)
B: 80-89   (Very Good)
C: 70-79   (Good)
D: 60-69   (Satisfactory)
E: 50-59   (Pass)
F: 0-49    (Fail)

[Save]
```

---

## PART 3: MINIMAL DATABASE SCHEMA

### Three Tables Total (Phase 1)

#### 1. New: `assessments`
```sql
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES school_class_streams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  
  -- Core fields only
  title VARCHAR(255) NOT NULL,                    -- "Mid-Term Exam", "Term 1 Assessment"
  max_marks DECIMAL(5,2) NOT NULL DEFAULT 100,   -- Reference max (for context)
  
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term INT NOT NULL,                              -- 1, 2, or 3
  
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_assessments_school ON assessments(school_id);
CREATE INDEX idx_assessments_stream ON assessments(stream_id);
CREATE INDEX idx_assessments_subject ON assessments(subject_id);
```

**Design Notes:**
- No `rubric_id`, `grade_scale_id`, `assessment_type` (defer to Phase 3+)
- `max_marks` is reference only (teachers enter 0-100 anyway)
- Linked to both `stream_id` (who did this assessment?) and `subject_id` (what subject?)
- Soft delete via `deleted_at` for audit trail

#### 2. Extend: `grade_entries` (add 4 columns)

```sql
ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS assessment_id UUID 
  REFERENCES assessments(id) ON DELETE RESTRICT;

ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS stream_id UUID 
  REFERENCES school_class_streams(id) ON DELETE CASCADE;

ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS max_marks DECIMAL(5,2);

ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS recorded_by UUID 
  REFERENCES profiles(id) ON DELETE SET NULL;

-- New columns for THREE-SCORE MODEL
ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS class_score DECIMAL(5,2);
ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS exam_score DECIMAL(5,2);
ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS total_score DECIMAL(5,2);  -- Calculated

-- Backward compat: Keep existing columns (score, grade, remarks)
-- score column used if assessment_id is NULL (legacy grades)
```

**Backward Compatibility:**
- Existing `score` column remains untouched
- New `class_score`, `exam_score`, `total_score` are NULL for legacy grades
- System checks: if `assessment_id` exists, use new columns; else use old `score`
- Query: `COALESCE(total_score, score) AS final_grade`

#### 3. New: `school_grading_policies`
See Part 2 above.

**Total schema addition:** 1 new table + 1 new policy table + 6 columns on grade_entries = **MINIMAL**

---

## PART 4: TEACHER WORKFLOW

### Flow Diagram

```
GRADE ENTRY WORKFLOW

1. Teacher goes to: Grades → Enter Grades
   Screen: "Select Details"
   
   Academic Year: [2025/2026 ▼]
   Term:          [Term 1 ▼]
   Stream:        [B1 ▼]
   Subject:       [Mathematics ▼]
   Assessment:    [Term 1 Exam ▼] or [+ Create New]
   
   [Next]
   
   ↓
   
2. System loads student list
   Screen: "Enter Grades"
   
   | Student Name      | Class Score | Exam Score | Total | Grade | Remark |
   |─────────────────────────────────────────────────────────────────────────|
   | Kofi Mensah       | [ 45 ]      | [ 62 ]     | 56.9  | D     | Satisfactory |
   | Ama Osei          | [ 78 ]      | [ 85 ]     | 82.9  | B     | Very Good    |
   | ...               |             |            |       |       |             |
   
   [Save] [Save & Next Subject]
   
   ↓
   
3. Repeat for next subject or proceed to Report Card
```

**Key Points:**
- Dropdown select, minimal clicks
- Only 2 input columns per student: Class Score, Exam Score
- Total, Grade, Remark calculated automatically
- Teachers never configure scales (admin does once)

### Report Card Workflow (Separate)

```
REPORT CARD WORKFLOW (After all subjects entered)

Once Math, English, Science, etc. have grades:

1. Teacher goes to: Reports → My Report Cards
   Screen: "Classes"
   
   [B1 - Report Cards for Term 1]  [Create / Review]
   [B2 - Report Cards for Term 1]  [Create / Review]
   
   ↓
   
2. Click [Create]
   Screen: "Report Card Details"
   
   Class:        B1
   Term:         Term 1
   Academic Year: 2025/2026
   
   | Student Name      | Total Marks | Class Grade | Status       |
   |───────────────────────────────────────────────────────────────|
   | Kofi Mensah       | 56.9        | D           | Pending      |
   | Ama Osei          | 82.9        | B           | Pending      |
   
   ↓
   
3. Enter Attendance & Conduct
   Screen: "Report Card - Attendance & Comments"
   
   For each student:
   
   | Student Name  | Days Present | Days Absent | Conduct | Interest | Teacher Remarks           |
   |──────────────────────────────────────────────────────────────────────────────────────────────|
   | Kofi Mensah   | [ 180 ]      | [ 10 ]      | [Good ▼]| [Good ▼] | [Good student, can do... |
   | Ama Osei      | [ 190 ]      | [ 0 ]       | [Excellent] | [Excellent] | [Excellent... |
   
   [+ Add School-Specific Fields]
   
   ↓
   
4. Promotion Recommendation
   Screen: "Promotion"
   
   For each student:
   
   | Student Name  | Promotion Status | Notes                    |
   |───────────────────────────────────────────────────────────────|
   | Kofi Mensah   | [PROMOTE ▼]      | Grade D, improve studies |
   | Ama Osei      | [PROMOTE ▼]      | Excellent performance    |
   
   ↓
   
5. Submit for Review
   Screen: "Report Card Summary"
   
   [Submit for Academic Head Approval]
   
   Status changes to: "Pending Academic Approval"
   
   ↓
   
6. Academic Head Reviews
   Screen: "Review Reports" (Academic Head only)
   
   [B1 - Term 1]  [Status: Pending Approval]  [Approve] [Request Changes]
   [B2 - Term 1]  [Status: Pending Approval]  [Approve] [Request Changes]
   
   If [Approve]: Status → "Approved" (visible to parents, printable)
   If [Request Changes]: Status → "Revision Needed" (back to teacher)
```

---

## PART 5: CALCULATION LOGIC

### Grade Calculation (Pseudo-code)

```javascript
function calculateGrade(classScore, examScore, gradePolicy) {
  // Step 1: Get weights from policy
  const classWeight = gradePolicy.class_score_weight;
  const examWeight = gradePolicy.exam_score_weight;
  
  // Step 2: Calculate total
  const totalScore = (classScore * classWeight) + (examScore * examWeight);
  
  // Step 3: Get grade from scale
  const gradeScale = JSON.parse(gradePolicy.grade_scale);
  const gradeEntry = gradeScale.find(
    g => totalScore >= g.min && totalScore < g.max
  );
  
  return {
    total: totalScore,
    grade: gradeEntry.letter,
    remark: gradeEntry.remark
  };
}
```

**Example:**
```
Input:
  classScore = 45
  examScore = 62
  policy.class_weight = 0.30
  policy.exam_weight = 0.70

Calculation:
  total = (45 × 0.30) + (62 × 0.70)
       = 13.5 + 43.4
       = 56.9

Lookup grade_scale for 56.9:
  → Falls in [50, 59]
  → letter = "E"
  → remark = "Pass"

Output:
  total: 56.9
  grade: "E"
  remark: "Pass"
```

---

## PART 6: API ENDPOINTS (Minimal Set)

### Assessment Management
```
POST   /api/school/assessments
       Body: { stream_id, subject_id, title, academic_year_id, term }
       
GET    /api/school/assessments
       Query: ?stream_id=X&academic_year_id=Y&term=Z
       
PUT    /api/school/assessments/:id
       Body: { title }
       
DELETE /api/school/assessments/:id (soft delete)
```

### Grade Entries (New Endpoints)
```
POST   /api/school/grades/bulk-entry
       Body: { assessment_id, entries: [{student_id, class_score, exam_score}, ...] }
       Returns: [{student_id, class_score, exam_score, total_score, grade, remark}]
       
GET    /api/school/grades
       Query: ?assessment_id=X&stream_id=Y&subject_id=Z
       
PUT    /api/school/grades/:id
       Body: { class_score, exam_score }
       (auto-recalculates total, grade, remark)
```

### Grading Policy
```
GET    /api/school/settings/grading-policy
       (fetch school's weight config)
       
PUT    /api/school/settings/grading-policy
       Body: { class_score_weight, exam_score_weight, grade_scale }
```

### Report Cards
```
POST   /api/school/report-cards
       Body: { stream_id, academic_year_id, term }
       
PUT    /api/school/report-cards/:id
       Body: { attendance, conduct, remarks, promotion_status }
       
POST   /api/school/report-cards/:id/approve
       (Academic Head only - changes status to "Approved")
       
POST   /api/school/report-cards/:id/request-revision
       (Academic Head - changes status to "Revision Needed")
```

**Total: 11 endpoints** (down from 20+)

---

## PART 7: IMPLEMENTATION PHASES

### Phase 1: Foundation (1 week)
**Deliverables:**
- Create `assessments` table
- Create `school_grading_policies` table
- Extend `grade_entries` with 6 columns
- Build all 11 API endpoints
- Write Zod schemas
- Add RLS policies

**No UI needed** - API-only iteration

**Effort:** 24 hours

---

### Phase 2: Grade Entry UI (1 week)
**Deliverables:**
- Assessment dropdown selector component
- Grade entry data table component
- Bulk save functionality
- Auto-calculation display
- Toast notifications

**Result:** Teachers have a WORKING grades entry system

**Effort:** 20 hours

---

### Phase 3: Report Card UI (1 week)
**Deliverables:**
- Report card creation form
- Attendance/conduct entry
- Teacher remarks
- Promotion recommendation UI
- Status tracking

**Result:** Teachers can complete report cards

**Effort:** 18 hours

---

### Phase 4: Academic Head Review (5 days)
**Deliverables:**
- Approval/rejection workflow
- Report card preview
- Change history
- Email notifications

**Effort:** 12 hours

---

### Phase 5: Analytics & Reports (5 days)
**Deliverables:**
- Class performance dashboard
- Grade distribution charts
- Individual student progress
- PDF report generation

**Effort:** 16 hours

---

### Phase 6: Polish & Optimization (5 days)
**Deliverables:**
- Performance optimization
- Error handling refinement
- User feedback implementation
- Documentation

**Effort:** 10 hours

---

## PART 8: NO BREAKING CHANGES

✅ **Existing grades unaffected** - Old `score` column remains, used if `assessment_id` is NULL

✅ **Existing API continues** - Can still POST to `/grades` with just `student_id`, `score`, `grade`, `remarks`

✅ **Nullable columns** - All new fields optional (NULL for legacy grades)

✅ **Gradual migration** - Teachers can use old or new system; system handles both

**Example: Backward Compat Query**
```sql
SELECT 
  student_id,
  COALESCE(total_score, score) as final_score,
  COALESCE(grade, 'N/A') as grade
FROM grade_entries
WHERE student_id = $1;
```

---

## PART 9: RISKS & MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| Weight validation error | CHECK constraint ensures weights sum to 1.00 |
| Orphaned grades (assessment deleted) | ON DELETE RESTRICT prevents deletion if grades exist |
| Performance on bulk entry (100s students) | Batch insert + proper indexes |
| RLS policy misconfiguration | Copy pattern from existing modules (streams, students) |
| Teachers skip assessment creation | Make assessment dropdown mandatory + UI prompts |
| Grade calculation inconsistency | Server-side calculation only (no client math) |
| School policy misconfiguration | Admin UI with validation + defaults |

---

## PART 10: TESTING CHECKLIST

### Phase 1 - Database & API
- [ ] `assessments` table created + RLS policies secure school data
- [ ] `school_grading_policies` table created + one per school enforced
- [ ] `grade_entries` columns added + backward compat queries work
- [ ] POST assessment returns correct structure
- [ ] GET grades with filters works
- [ ] Grade calculation API returns total/grade/remark correct
- [ ] Weight validation prevents invalid configs
- [ ] Soft delete works (deleted_at populated, not returned in queries)

### Phase 2 - Grade Entry UI
- [ ] Assessment selector loads correctly
- [ ] Grade entry table displays all students
- [ ] Class Score + Exam Score inputs functional
- [ ] Total/Grade/Remark auto-update on input
- [ ] Bulk save persists all grades
- [ ] Error messages appear on invalid input
- [ ] Success toast shown after save

### Phase 3 - Report Cards
- [ ] Report card creation form loads
- [ ] Attendance entry works
- [ ] Conduct/Interest dropdowns functional
- [ ] Teacher remarks text entry works
- [ ] Promotion recommendation save works
- [ ] Status changes to "Pending Approval" after submit

### Phase 4 - Academic Head Review
- [ ] Approval changes status to "Approved"
- [ ] Request Revision changes status to "Revision Needed"
- [ ] Approved reports visible to parents (future)
- [ ] Email sent on status change

### Phase 5 - Analytics
- [ ] Dashboard loads without errors
- [ ] Class average calculates correctly
- [ ] Grade distribution chart displays
- [ ] PDF export generates valid file

---

## PART 11: SUCCESS CRITERIA

**Phase 1 Complete:** Database migrated, APIs tested, zero breaking changes verified

**Phase 2 Complete:** Teachers can enter grades for one subject without errors

**Phase 3 Complete:** Teachers can complete a full report card end-to-end

**Phase 4 Complete:** Academic Head can review and approve reports

**Phase 5 Complete:** Dashboards show accurate analytics

**Overall Success:**
- ✅ Zero breaking changes to existing modules
- ✅ All 11 APIs functional with proper error handling
- ✅ Teachers report <2 seconds per grade entry
- ✅ Report card completion time <15 min per class
- ✅ 100% grade accuracy (calculation verified)
- ✅ 99% uptime (proper indexes + error handling)

---

## PART 12: EFFORT ESTIMATE

| Phase | Task | Hours |
|-------|------|-------|
| 1 | DB schema + migrations | 8 |
| 1 | Zod schemas | 4 |
| 1 | 11 API endpoints | 12 |
| 2 | Assessment selector component | 6 |
| 2 | Grade entry table + auto-calc | 10 |
| 2 | Bulk save + error handling | 4 |
| 3 | Report card form | 8 |
| 3 | Attendance/conduct entry | 6 |
| 3 | Teacher remarks + promotion UI | 4 |
| 4 | Academic Head review workflow | 10 |
| 4 | Notifications | 2 |
| 5 | Analytics dashboard | 12 |
| 5 | PDF export | 4 |
| 6 | Performance optimization | 8 |
| 6 | Bug fixes + documentation | 7 |
| | **TOTAL** | **~100 hours** |

**Timeline:** 1 developer = **3-4 weeks** (full-time)

---

## PART 13: DEPLOYMENT STRATEGY

**Week 1 - Phase 1 Deployment:**
```
Merge PR with:
  - new assessments table
  - new school_grading_policies table
  - 6 new columns on grade_entries (all nullable)
  - 11 new API endpoints
  
No impact on existing system
Existing grades API unchanged
```

**Week 2 - Phase 2 Deployment:**
```
Merge PR with:
  - Assessment selector component
  - Grade entry UI
  - Students can see new "Enter Grades" page
  
Old grading page still exists (no breaking changes)
Users choose to adopt new system
```

**Weeks 3-4 - Phases 3-5:**
```
Gradual rollout of report cards, analytics
Each phase independently deployable
Zero rollback risk (all additions, no subtractions)
```

**Rollback Plan:**
- If critical issue: Disable assessment creation UI
- Existing grades continue working
- Revert specific PR, re-deploy Phase 1
- No data loss

---

## PART 14: NEXT STEPS

1. **Architecture Approval:** Review this document, get sign-off from team
2. **Database Review:** Have DBA review migration strategy
3. **API Contract:** Finalize endpoint specs with frontend team
4. **Zod Schemas:** Write validation schemas before coding
5. **Begin Phase 1:** Start database + API work
6. **Test Migration:** Run against production-like data
7. **Deploy Phase 1:** Non-breaking migration
8. **Begin Phase 2:** Start UI work once APIs stable

---

**Document Status:** Ready for Phase 1 Implementation  
**Approved By:** [Sign-off here]  
**Date Approved:** [Date here]

