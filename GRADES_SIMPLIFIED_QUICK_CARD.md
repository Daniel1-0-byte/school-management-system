# Grades Module - Simplified Model Quick Reference

## Three-Score Model

```
Teacher enters TWO values:
  ├─ Class Score (0-100)     ← Aggregated homework, exercises, projects, classwork
  └─ Exam Score (0-100)      ← Formal exam/terminal exam

System calculates THREE:
  ├─ Total Score             ← (Class × class_weight) + (Exam × exam_weight)
  ├─ Grade Letter            ← A/B/C/D/E/F based on scale
  └─ Remark                  ← "Excellent", "Good", "Pass", etc.
```

## School Configuration (Admin Only)

```
Grade Settings (per school)

Class Score Weight:    [30]%
Exam Score Weight:     [70]%

Grade Scale (editable JSON):
  A: 90-100   (Excellent)
  B: 80-89    (Very Good)
  C: 70-79    (Good)
  D: 60-69    (Satisfactory)
  E: 50-59    (Pass)
  F: 0-49     (Fail)
```

## Database Schema

```sql
-- TOTAL: 3 tables (1 new, 1 extension, 1 config)

-- 1. NEW: assessments (for tracking what assessments exist)
CREATE TABLE assessments (
  id, school_id, stream_id, subject_id, 
  title, max_marks, academic_year_id, term,
  created_by, created_at, updated_at, deleted_at
)

-- 2. NEW: school_grading_policies (weights + grade scale)
CREATE TABLE school_grading_policies (
  id, school_id,
  class_score_weight, exam_score_weight,
  grade_scale JSONB,
  created_by, created_at, updated_at
)

-- 3. EXTEND: grade_entries (add 6 columns)
ALTER TABLE grade_entries ADD COLUMN assessment_id
ALTER TABLE grade_entries ADD COLUMN stream_id
ALTER TABLE grade_entries ADD COLUMN max_marks
ALTER TABLE grade_entries ADD COLUMN recorded_by
ALTER TABLE grade_entries ADD COLUMN class_score
ALTER TABLE grade_entries ADD COLUMN exam_score
-- total_score calculated from policy
-- grade, remark looked up from policy
```

## Teacher Workflow (Simple)

```
1. Select Assessment Details
   Academic Year: [2025/2026 ▼]
   Term:          [Term 1 ▼]
   Stream:        [B1 ▼]
   Subject:       [Math ▼]
   Assessment:    [Term 1 Exam ▼]

2. Enter Grades (3 columns per student)
   | Student Name | Class Score | Exam Score | Total | Grade |
   |──────────────────────────────────────────────────────────|
   | Kofi Mensah  | 45          | 62         | 56.9  | E     |
   | Ama Osei     | 78          | 85         | 82.9  | B     |

3. Save & Done
```

## Report Card Workflow (Separate)

```
1. Create Report Card
   (system loads all subjects' grades for the class)

2. Enter Attendance & Comments
   Days Present, Days Absent, Conduct, Interest, Remarks

3. Promotion Recommendation
   PROMOTE / DEFER / REPEAT / SPECIAL

4. Submit for Approval
   Status → "Pending Academic Approval"

5. Academic Head Reviews
   [Approve] → Status "Approved" (visible to parents)
   [Request Changes] → Status "Revision Needed" (back to teacher)
```

## API Endpoints (11 total)

### Assessment CRUD
```
POST   /api/school/assessments
GET    /api/school/assessments?stream_id=X&year_id=Y&term=Z
PUT    /api/school/assessments/:id
DELETE /api/school/assessments/:id
```

### Grade Entry (Bulk)
```
POST   /api/school/grades/bulk-entry
       { assessment_id, entries: [{student_id, class_score, exam_score}] }
       → Returns: calculated totals, grades, remarks

GET    /api/school/grades?assessment_id=X&stream_id=Y
PUT    /api/school/grades/:id
```

### School Settings
```
GET    /api/school/settings/grading-policy
PUT    /api/school/settings/grading-policy
```

### Report Cards
```
POST   /api/school/report-cards
PUT    /api/school/report-cards/:id
POST   /api/school/report-cards/:id/approve
POST   /api/school/report-cards/:id/request-revision
```

## Phase Timeline

| Phase | Weeks | What Works |
|-------|-------|-----------|
| 1 | 1 | Database + APIs only |
| 2 | 1 | **Teachers can enter grades** ✅ |
| 3 | 1 | Teachers can complete reports |
| 4 | 0.5 | Academic Head can approve |
| 5 | 0.5 | Analytics dashboards |
| 6 | 0.5 | Polish & optimization |
| **TOTAL** | **3-4 weeks** | **Working system after Phase 2** |

## Zero Breaking Changes

✅ Existing `grade_entries` unaffected (old `score` column still works)  
✅ Existing grades API continues (uses NULL for new columns)  
✅ New columns all nullable (backward compat)  
✅ Query: `COALESCE(total_score, score)` handles both old/new  

## What's Different from Complex Model

| Feature | Old Design | New Design |
|---------|-----------|-----------|
| Score fields | 8+ (homework, exercise, etc.) | 3 (Class, Exam, Total) |
| Teacher entry | Click 5+ fields per student | Click 2 fields per student |
| Database tables | 9 new | 1 new + 1 config |
| API endpoints | 20+ | 11 |
| Timeline | 5-6 weeks | 3-4 weeks |
| Teacher prep | Learn complex system | Enter 2 numbers |
| Data entry time | 30 min per class | 5 min per class |

## Key Principles

1. **Teacher enters aggregated scores** - They do the mental math for Class Score
2. **System calculates final grade** - One policy per school, applied automatically
3. **Fast data entry** - Minimal clicks, minimal complexity
4. **Future proof** - Can add homework tracking layer later without redesign
5. **Zero breaking changes** - Existing grades unaffected, new system is purely additive

## Implementation Start Checklist

- [ ] Get sign-off on simplified 3-score model
- [ ] Get sign-off on 3-table schema
- [ ] Confirm weight examples (30/70, 40/60, 50/50 for different schools?)
- [ ] Get grade scale examples from schools (letter grades, numeric, pass/fail?)
- [ ] Review GRADES_SIMPLIFIED_ARCHITECTURE.md (full document)
- [ ] Begin Phase 1: Database migrations

---

**Document:** `/GRADES_SIMPLIFIED_ARCHITECTURE.md` (full spec)  
**Status:** Ready for Phase 1 Implementation
