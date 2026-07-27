# Grades Module - Final Architecture V3 (WITH SESSIONS & WORKFLOWS)

**Date:** July 26, 2026  
**Status:** Ready for Implementation Sign-Off  
**Revision:** Simplified 3-Score Model + Grade Entry Sessions + Teacher Workflows + Grades/Reports Separation

---

## EXECUTIVE SUMMARY

This is the **FINAL ARCHITECTURE** incorporating 4 critical improvements:

1. **Grade Entry Sessions** - Track teacher progress, allow stopping/continuing
2. **Redesigned Teacher Workflow** - Hierarchical selection → dashboard with subject status
3. **Improved Status Lifecycle** - Not Started → Draft → Submitted → Returned for Correction → Approved
4. **Clear Module Separation** - Grades Module (scores only) + Reports Module (everything else)

**Key Principle:** Build on the simplified 3-score model (Class Score + Exam Score + Total), adding workflow/session management without database complexity.

---

## PART 1: GRADE ENTRY SESSION CONCEPT

### What is a Grade Entry Session?

A Grade Entry Session represents one complete grading task:

```
Academic Year 2025/2026
    ↓
Term 1
    ↓
Class B1
    ↓
Mathematics Assessment: "Term 1 Exam"
    ↓
ONE SESSION
```

Each session tracks:
- `id` - Unique identifier
- `status` - Not Started | Draft | Submitted | Returned for Correction | Approved
- `progress` - Number of students with grades vs. total (e.g., 18/32)
- `completion_percentage` - (18/32) × 100 = 56%
- `last_modified` - Last timestamp grades were entered
- `submitted_by` - Teacher who submitted
- `submitted_at` - Submission timestamp
- `returned_at` - When Academic Head returned for corrections
- `approved_at` - When Academic Head approved
- `approval_notes` - Why returned (if applicable)

### Benefits of Sessions

✅ **Persistence** - Teacher can stop mid-way, return later with progress saved  
✅ **Progress Tracking** - Show "18 of 32 students completed" on dashboard  
✅ **Prevention of Duplicates** - Status prevents re-submission  
✅ **Approval Workflow** - Session status drives approval logic  
✅ **Auto-Save** - Every grade entry auto-saves to session  
✅ **Audit Trail** - Track who submitted when, approvals, revisions  
✅ **Bulk Corrections** - If "Returned for Correction", teacher can update all grades in one place

### Non-Breaking Implementation

This concept does NOT require new database tables initially:

```sql
-- Extend existing assessments table:
ALTER TABLE assessments ADD COLUMN status VARCHAR(50) 
  DEFAULT 'not_started';
  -- Values: not_started, draft, submitted, returned, approved

ALTER TABLE assessments ADD COLUMN progress_count INT DEFAULT 0;
ALTER TABLE assessments ADD COLUMN total_students INT;
ALTER TABLE assessments ADD COLUMN last_modified TIMESTAMP DEFAULT now();
ALTER TABLE assessments ADD COLUMN submitted_by UUID REFERENCES profiles(id);
ALTER TABLE assessments ADD COLUMN submitted_at TIMESTAMP;
ALTER TABLE assessments ADD COLUMN approved_by UUID REFERENCES profiles(id);
ALTER TABLE assessments ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE assessments ADD COLUMN returned_at TIMESTAMP;
ALTER TABLE assessments ADD COLUMN approval_notes TEXT;
```

**Why inline?** Assessments table already represents a single grading task. Adding session fields keeps it simple (1 table instead of 2).

---

## PART 2: REDESIGNED TEACHER WORKFLOW

### Before: Painful Flow

```
1. Go to Grades → Enter Grades
2. Select Academic Year: 2025/2026 ✓
3. Select Term: Term 1 ✓
4. Select Stream: B1 ✓
5. Select Subject: Mathematics ✓
6. Select Assessment: Term 1 Exam ✓
   [Next Button]
   
7. Enter grades for all 32 students
   Total Score auto-calculates
   
8. Click [Save]
   
9. SUCCESS: Grades saved
   Back to selector...
   
10. Teacher needs to do Biology next
    GO BACK TO STEP 2
    Select everything again
    REPEAT ENTIRE FLOW FOR BIOLOGY
```

**Problem:** Repeated subject selection, context-switching, frustration.

---

### After: Efficient Dashboard

```
STEP 1: INITIAL CONTEXT SELECTION (One-time setup)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Screen: "Select Assessment Period"

Academic Year: [2025/2026 ▼]
Term:          [Term 1 ▼]
Stream:        [B1 ▼]
Assessment:    [Term 1 Exam ▼]

[View Grade Dashboard]

RESULT:
  System loads ALL SUBJECTS assigned to B1 for this assessment


STEP 2: GRADES DASHBOARD (Main UI - stays here)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Progress: 3 of 6 subjects completed

┌─────────────────────────────────────────────────────┐
│ SUBJECTS FOR B1 - TERM 1 EXAM                       │
├─────────────────────────────────────────────────────┤
│ ENGLISH         ✓ Completed          [Review]       │
│ MATHEMATICS     ✓ Completed          [Review]       │
│ SCIENCE         ⊙ Draft (18/32)      [Continue] [✓] │
│ ICT             • Not Started         [Start]        │
│ CREATIVE ARTS   • Not Started         [Start]        │
│ RME             ✓ Completed          [Review]       │
└─────────────────────────────────────────────────────┘

STEP 3: ENTER GRADES FOR ONE SUBJECT (No context-switching)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Click [Continue] for Science:

Screen: "Enter Grades - Science"

Context (read-only):
  Academic Year: 2025/2026
  Term: Term 1
  Stream: B1
  Subject: Science
  Progress: 18 of 32 students

| Student Name        | Class Score | Exam Score | Total | Grade |
|────────────────────────────────────────────────────────────────|
| Kofi Mensah         | [   ]       | [   ]      |       |       |
| Ama Osei            | [ 78 ]      | [ 85 ]     | 82.9  | B     |
| Kwame Boateng       | [ 56 ]      | [ 62 ]     | 59.2  | E     |
| ... (18 more)

[Save Draft] [Submit] or [Save & Next Subject]

STEP 4: AFTER SAVING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If [Save & Next Subject]:
  → Dashboard returns
  → Shows "Science ✓ Completed"
  → ICT section highlighted (next subject)
  → Click [Start] for ICT
  → NEW GRADES FORM opens with NO context-switching
  
Teacher NEVER has to re-select Academic Year/Term/Stream again.

STEP 5: BULK SUBMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Once all subjects completed:

┌─────────────────────────────────────────────────────┐
│ SUBJECTS FOR B1 - TERM 1 EXAM                       │
│ Progress: 6 of 6 subjects completed                 │
├─────────────────────────────────────────────────────┤
│ ENGLISH         ✓ Completed                         │
│ MATHEMATICS     ✓ Completed                         │
│ SCIENCE         ✓ Completed                         │
│ ICT             ✓ Completed                         │
│ CREATIVE ARTS   ✓ Completed                         │
│ RME             ✓ Completed                         │
└─────────────────────────────────────────────────────┘

[Submit All Grades for Review]

Status changes: draft → submitted
All 6 assessment records marked as "Submitted"
```

### Key UI Elements

**Dashboard Status Indicators:**

```
✓ Completed     = Status "Approved" (locked, read-only)
✓ Completed     = Status "Submitted" (pending approval)
⊙ Draft         = Status "Draft" (in-progress, can edit)
• Not Started   = Status "Not Started" (can click to begin)
⚠ Returned      = Status "Returned for Correction" (marked, needs fix)
```

**Subject Card Actions:**

```
[Review]    - View grades (read-only if submitted/approved)
[Continue]  - Keep editing grades
[Start]     - Begin entering grades
[Resubmit]  - If returned for correction
```

---

## PART 3: IMPROVED WORKFLOW STATUS LIFECYCLE

### Status Transitions (Complete)

```
                    ┌─────────────────────────────────────┐
                    │     NOT STARTED (Default)           │
                    │  No grades entered yet              │
                    │  Status: "not_started"              │
                    └────────────┬────────────────────────┘
                                 │
                                 │ Teacher clicks [Start] or [Continue]
                                 │ Enters grades
                                 ↓
                    ┌─────────────────────────────────────┐
                    │     DRAFT                           │
                    │  Teacher entering/editing grades    │
                    │  Grades partially/fully entered     │
                    │  Status: "draft"                    │
                    │  Progress: 18/32, 24/32, etc.      │
                    └────────────┬────────────────────────┘
                                 │
                    ┌────────────→│←────────────┐
                    │             │             │
         [Save Draft]   [Submit]     [Abandon]
            stays          ↓
            draft       SUBMITTED
                            │
                    ┌───────────────────────────┐
                    │     SUBMITTED             │
                    │  Teacher finished        │
                    │  Awaiting review         │
                    │  Status: "submitted"     │
                    │  submitted_by: teacher   │
                    │  submitted_at: timestamp │
                    └───────────┬──────────────┘
                                │
                        ACADEMIC HEAD REVIEWS
                                │
                    ┌───────────┴────────────┐
                    │                        │
              [Approve]              [Request Changes]
                    │                        │
                    ↓                        ↓
            ┌─────────────────┐    ┌─────────────────┐
            │   APPROVED      │    │  RETURNED FOR   │
            │                 │    │  CORRECTION     │
            │ Status:         │    │                 │
            │ "approved"      │    │ Status: "returned" │
            │                 │    │                 │
            │ Locked. Visible │    │ Teacher can     │
            │ to parents.     │    │ re-edit.        │
            │ Printable.      │    │ All grades      │
            │ Read-only.      │    │ preserved.      │
            │                 │    │                 │
            │ approved_by:    │    │ returned_at:    │
            │ approval_notes: │    │ approval_notes: │
            │ approved_at:    │    │ timestamp       │
            └─────────────────┘    └────────┬────────┘
                                           │
                        Teacher makes corrections
                                           │
                                    [Resubmit]
                                           │
                                           ↓
                                      SUBMITTED
                                      (review cycle continues)
```

### Status Fields in Assessments Table

```sql
-- New columns for status tracking:

status VARCHAR(50) DEFAULT 'not_started'
  -- Values: 'not_started', 'draft', 'submitted', 'returned', 'approved'

progress_count INT DEFAULT 0
  -- Number of students with grades entered

total_students INT
  -- Total students in class (for progress calculation)

last_modified TIMESTAMP DEFAULT now()
  -- Auto-updated whenever grades change

submitted_by UUID REFERENCES profiles(id)
  -- Teacher who submitted (NULL until submitted)

submitted_at TIMESTAMP
  -- When teacher clicked submit (NULL until submitted)

approved_by UUID REFERENCES profiles(id)
  -- Academic Head who approved (NULL until approved)

approved_at TIMESTAMP
  -- When Academic Head clicked approve (NULL until approved)

returned_at TIMESTAMP
  -- When Academic Head clicked "Request Changes" (NULL if never returned)

approval_notes TEXT
  -- Why returned, or approval comment

created_at TIMESTAMP DEFAULT now()
created_by UUID REFERENCES profiles(id)
```

---

## PART 4: MODULE SEPARATION (GRADES vs REPORTS)

### Grades Module (NEW) - Scope: Score Collection Only

**Responsibility:**
- Collect academic scores from teachers
- Calculate final grades based on school policy
- Manage grade entry sessions (progress, status)
- Provide data to Reports module

**What Grades Module OWNS:**

✅ Grade Entry Dashboard  
✅ Subject Progress Display  
✅ Bulk Score Entry (Class Score + Exam Score)  
✅ Auto Calculation (Total, Grade, Remark)  
✅ Save Draft Functionality  
✅ Submit for Review  
✅ Status Tracking (Not Started → Draft → Submitted → Returned → Approved)  
✅ Academic Head Review & Approval  

**What Grades Module DOES NOT OWN:**

❌ Attendance (→ Reports Module)  
❌ Conduct (→ Reports Module)  
❌ Interest/Behavior (→ Reports Module)  
❌ Teacher Remarks (→ Reports Module)  
❌ Headteacher Remarks (→ Reports Module)  
❌ Promotion Decisions (→ Reports Module)  
❌ Report Card Generation (→ Reports Module)  
❌ PDF Printing (→ Reports Module)  
❌ Parent Portal Display (→ Reports Module)  
❌ Analytics/Dashboards (→ Reports Module)  

**Grade Module APIs:**

```
POST   /api/school/assessments
GET    /api/school/assessments?stream_id=X&year_id=Y&term=Z
PUT    /api/school/assessments/:id        [status, progress]
DELETE /api/school/assessments/:id

POST   /api/school/grades/bulk-entry       [class_score, exam_score]
GET    /api/school/grades?assessment_id=X
PUT    /api/school/grades/:id

POST   /api/school/assessments/:id/submit      [change status to submitted]
POST   /api/school/assessments/:id/approve     [change status to approved]
POST   /api/school/assessments/:id/return      [change status to returned]

GET    /api/school/settings/grading-policy
PUT    /api/school/settings/grading-policy
```

---

### Reports Module (EXISTING + ENHANCED) - Scope: Report Card Completion & Distribution

**Responsibility:**
- Use grades from Grades Module
- Add attendance, conduct, remarks
- Generate complete report cards
- Manage approval workflow for report cards
- Generate PDFs, manage parent portal

**What Reports Module OWNS:**

✅ Report Card Creation (pull grades from Grades Module)  
✅ Attendance Entry  
✅ Conduct Rating  
✅ Interest/Behavior Assessment  
✅ Teacher Comments/Remarks  
✅ Headteacher Review & Comments  
✅ Promotion Recommendation  
✅ Report Card Approval Workflow  
✅ PDF Generation  
✅ Parent Portal Publishing  
✅ Analytics & Performance Dashboard  

**What Reports Module DOES NOT OWN:**

❌ Grade Calculation (← Grades Module)  
❌ Score Entry (← Grades Module)  
❌ Grade Status Management (← Grades Module)  

**Report Module APIs:**

```
POST   /api/school/report-cards
GET    /api/school/report-cards?stream_id=X&year_id=Y&term=Z
PUT    /api/school/report-cards/:id

POST   /api/school/report-cards/:id/complete-attendance
POST   /api/school/report-cards/:id/approve
POST   /api/school/report-cards/:id/return
POST   /api/school/report-cards/:id/publish-to-parents

GET    /api/school/analytics/class-performance
GET    /api/school/analytics/student-progress

POST   /api/school/report-cards/:id/generate-pdf
```

### Data Flow Between Modules

```
GRADES MODULE                        REPORTS MODULE
════════════════                     ══════════════

1. Teacher enters
   Class Score & Exam Score
   ↓
2. System calculates
   Total, Grade, Remark
   ↓
3. Teacher submits
   Assessment
   ↓
4. Academic Head approves
   Status → "approved"
   ↓
5. Grades available via API
   /api/school/grades?assessment_id=X
   ↓
   ────────────────────────────────→ Reports pulls grades
                                    ↓
                                    6. Teacher creates
                                       Report Card
                                       (grades auto-loaded)
                                    ↓
                                    7. Teacher adds:
                                       Attendance
                                       Conduct
                                       Remarks
                                    ↓
                                    8. Teacher submits
                                       Report Card
                                    ↓
                                    9. Academic Head
                                       approves
                                    ↓
                                    10. Report published
                                        to parents
```

---

## PART 5: SIMPLIFIED DATABASE SCHEMA (UNCHANGED FROM V2)

### Three Tables Total (Phase 1)

#### 1. New: `assessments` (With Session Fields)

```sql
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES school_class_streams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  
  -- Core fields
  title VARCHAR(255) NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL DEFAULT 100,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term INT NOT NULL,
  
  -- SESSION/WORKFLOW FIELDS (NEW)
  status VARCHAR(50) DEFAULT 'not_started',
  -- Values: 'not_started', 'draft', 'submitted', 'returned', 'approved'
  
  progress_count INT DEFAULT 0,        -- Students with grades
  total_students INT,                  -- Total students in stream
  last_modified TIMESTAMP DEFAULT now(),
  
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  returned_at TIMESTAMP,
  approval_notes TEXT,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_assessments_school ON assessments(school_id);
CREATE INDEX idx_assessments_stream ON assessments(stream_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_subject ON assessments(subject_id);
```

#### 2. New: `school_grading_policies` (UNCHANGED FROM V2)

```sql
CREATE TABLE school_grading_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  class_score_weight DECIMAL(3,2) NOT NULL DEFAULT 0.30,
  exam_score_weight DECIMAL(3,2) NOT NULL DEFAULT 0.70,
  
  grade_scale JSONB NOT NULL DEFAULT '[
    {"min": 90, "max": 100, "letter": "A", "remark": "Excellent"},
    {"min": 80, "max": 89, "letter": "B", "remark": "Very Good"},
    {"min": 70, "max": 79, "letter": "C", "remark": "Good"},
    {"min": 60, "max": 69, "letter": "D", "remark": "Satisfactory"},
    {"min": 50, "max": 59, "letter": "E", "remark": "Pass"},
    {"min": 0,  "max": 49, "letter": "F", "remark": "Fail"}
  ]',
  
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT weight_sum CHECK (
    ROUND((class_score_weight + exam_score_weight)::NUMERIC, 2) = 1.00
  ),
  CONSTRAINT one_per_school UNIQUE(school_id)
);
```

#### 3. Extend: `grade_entries` (UNCHANGED FROM V2)

```sql
ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS assessment_id UUID 
  REFERENCES assessments(id) ON DELETE RESTRICT;

ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS stream_id UUID 
  REFERENCES school_class_streams(id) ON DELETE CASCADE;

ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS max_marks DECIMAL(5,2);

ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS recorded_by UUID 
  REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS class_score DECIMAL(5,2);
ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS exam_score DECIMAL(5,2);
ALTER TABLE grade_entries ADD COLUMN IF NOT EXISTS total_score DECIMAL(5,2);

-- Backward compat: existing score, grade, remarks columns untouched
```

---

## PART 6: UPDATED TEACHER WORKFLOW (DETAILED UX)

### Screen 1: Assessment Period Selection

```
┌─────────────────────────────────────────────────────────┐
│ GRADE ENTRY                                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Select Assessment Period                                │
│                                                         │
│ Academic Year:                                          │
│ [2025/2026 ▼]                                           │
│                                                         │
│ Term:                                                   │
│ [Term 1 ▼]                                              │
│                                                         │
│ Class Stream:                                           │
│ [B1 ▼]                                                  │
│                                                         │
│ Assessment:                                             │
│ [Term 1 Exam ▼]                                         │
│ [+ Create New Assessment]                              │
│                                                         │
│                        [Cancel]  [View Dashboard]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Screen 2: Grade Entry Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│ GRADE ENTRY DASHBOARD                                        │
│ B1 Stream - Term 1 Exam (2025/2026)                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 📊 Progress: 3 of 6 subjects completed (50%)                 │
│                                                              │
│ Subjects:                                                    │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ✓ ENGLISH                                              │  │
│ │   Status: Submitted                   [Review]         │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ✓ MATHEMATICS                                           │  │
│ │   Status: Submitted                   [Review]         │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ⊙ SCIENCE                                              │  │
│ │   Status: Draft (18 of 32 students)   [Continue] [✓]  │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ • ICT                                                  │  │
│ │   Status: Not Started                 [Start]          │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ • CREATIVE ARTS                                        │  │
│ │   Status: Not Started                 [Start]          │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ✓ RME                                                  │  │
│ │   Status: Submitted                   [Review]         │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│                    [Submit All for Review]                   │
│                    (enabled when all completed)              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Screen 3: Grade Entry Form

```
┌────────────────────────────────────────────────────────────────┐
│ ENTER GRADES - SCIENCE                                         │
│ B1 | Term 1 Exam | 2025/2026                                   │
├────────────────────────────────────────────────────────────────┤
│ Progress: 18 of 32 students ▓▓▓▓▓▓░░░░░░                       │
│                                                                │
│ | No | Student Name      | Class Score | Exam Score | Total | Grade │ │
│ |─────────────────────────────────────────────────────────────────│ │
│ | 1  | Kofi Mensah       | [ 45 ]      | [ 62 ]     | 56.9  | E     | │
│ | 2  | Ama Osei          | [ 78 ]      | [ 85 ]     | 82.9  | B     | │
│ | 3  | Kwame Boateng     | [ 92 ]      | [ 88 ]     | 89.4  | B     | │
│ | 4  | Abena Mensah      | [ 35 ]      | [ 40 ]     | 38.5  | F     | │
│ | 5  | Yaw Osei          | [ 67 ]      | [ 72 ]     | 70.1  | C     | │
│ | ... (13 more students)                                        │
│ | 32 | [Empty for new student entry]                           │
│                                                                │
│ [Save Draft]  [Submit]  [Save & Next Subject]                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## PART 7: UPDATED WORKFLOW STATUS API

### Grade Entry State Machine

When teacher enters grades:

```
1. POST /api/school/assessments
   → status = 'not_started'
   
2. Teacher clicks [Start]
   → PUT /api/school/assessments/:id
   → status = 'draft' (system infers first entry)
   
3. Teacher enters data
   → POST /api/school/grades/bulk-entry
   → Each save increments progress_count
   → last_modified updated
   → status = 'draft' (persists)
   
4. Teacher completes all students
   → progress_count == total_students
   → Teacher sees status = 'draft (COMPLETE)'
   
5. Teacher clicks [Submit All for Review]
   → PUT /api/school/assessments/:id
     { status: 'submitted', submitted_by, submitted_at }
   → Grades locked from further editing
   → Academic Head notified
   
6a. Academic Head clicks [Approve]
   → PUT /api/school/assessments/:id
     { status: 'approved', approved_by, approved_at }
   → Grades visible to parents
   → Cannot be edited
   
6b. Academic Head clicks [Request Changes]
   → PUT /api/school/assessments/:id
     { status: 'returned', returned_at, approval_notes }
   → Grades become editable again
   → Teacher can make changes
   → Teachers clicks [Resubmit]
   → Cycle repeats (6a or 6b)
```

---

## PART 8: MINIMAL API ENDPOINTS (UPDATED WITH WORKFLOW)

### Assessment Management

```
POST   /api/school/assessments
       Create new assessment for a stream/subject/term
       Returns: { id, status: 'not_started', progress_count: 0 }
       
GET    /api/school/assessments
       Query: ?stream_id=X&academic_year_id=Y&term=Z&status=draft
       Returns: List of assessments with status
       
PUT    /api/school/assessments/:id
       Update: title, status, approval_notes
       
DELETE /api/school/assessments/:id
       Soft delete (only if status 'not_started' or 'draft')
```

### Grade Entries

```
POST   /api/school/grades/bulk-entry
       Input: { assessment_id, entries: [{student_id, class_score, exam_score}] }
       Triggers: Auto-calculate total_score, grade, remark
       Updates: assessment.progress_count, last_modified
       Returns: All grades with calculated values
       
GET    /api/school/grades
       Query: ?assessment_id=X&stream_id=Y
       
PUT    /api/school/grades/:id
       Update: class_score, exam_score (triggers recalc)
```

### Workflow State Changes

```
PUT    /api/school/assessments/:id/submit
       Changes status: draft → submitted
       Sets: submitted_by, submitted_at
       
PUT    /api/school/assessments/:id/approve
       Changes status: submitted → approved (Academic Head only)
       Sets: approved_by, approved_at
       
PUT    /api/school/assessments/:id/return
       Changes status: submitted → returned (Academic Head only)
       Sets: returned_at, approval_notes (why returned)
       Allows teacher to edit grades again
```

### Settings

```
GET    /api/school/settings/grading-policy
PUT    /api/school/settings/grading-policy
       { class_score_weight, exam_score_weight, grade_scale }
```

**Total: 11 endpoints** (same as V2, workflows added)

---

## PART 9: PHASED IMPLEMENTATION (FINAL)

### Phase 1: Foundation (1 week, 24 hours)

**Deliverables:**
- Create `assessments` table with session/status fields
- Create `school_grading_policies` table
- Extend `grade_entries` with 6 columns
- Build 11 API endpoints
- Add RLS policies
- Write Zod schemas

**No UI needed** - Pure API work

**Effort:** 24 hours

---

### Phase 2: Grade Entry Dashboard UI (1 week, 20 hours)

**Deliverables:**
- Assessment selector component
- Grade entry dashboard (shows all subjects with status)
- Grade entry table (Class Score + Exam Score)
- Auto-calculation display
- Bulk save with progress tracking
- Toast notifications for status changes

**Result:** Teachers can enter grades with session management

**Effort:** 20 hours

---

### Phase 3: Reports Card UI (1 week, 18 hours)

**Deliverables:**
- Report card creation form (pulls grades from Grades Module)
- Attendance/conduct/remarks entry
- Promotion recommendation dropdown
- Status tracking UI
- Teacher submission workflow

**Result:** Teachers can complete report cards (separate from grades)

**Effort:** 18 hours

---

### Phase 4: Academic Head Review (5 days, 12 hours)

**Deliverables:**
- Approval/rejection UI
- Comment/notes entry
- Email notifications
- Change history display
- Batch approval options

**Result:** Academic Head can approve/return assessments and reports

**Effort:** 12 hours

---

### Phase 5: Analytics & Reports (5 days, 16 hours)

**Deliverables:**
- Class performance dashboard
- Grade distribution charts
- Student progress tracking
- PDF generation
- Parent portal view

**Effort:** 16 hours

---

### Phase 6: Polish (5 days, 10 hours)

**Deliverables:**
- Performance optimization
- Error handling refinement
- User feedback implementation
- Documentation

**Effort:** 10 hours

---

## PART 10: BACKWARD COMPATIBILITY

✅ **Existing grades unaffected** - Old `score` column remains  
✅ **Existing API continues** - Can still POST to `/grades` without assessment_id  
✅ **Nullable columns** - All new fields optional (NULL for legacy grades)  
✅ **Query logic** - `COALESCE(total_score, score)` handles both old/new  

```sql
-- Backward compat query (works for both old and new grades)
SELECT 
  student_id,
  COALESCE(total_score, score) as final_score,
  COALESCE(grade, 'N/A') as grade,
  assessment_id,
  status
FROM grade_entries
WHERE student_id = $1;
```

---

## PART 11: ENTITY RELATIONSHIP DIAGRAM

```
GRADES MODULE
═════════════════════════════════════════════════════════════

academic_years ─┐
                ├─→ assessments ←─ subjects
                │       ↑
school_classes ─→ school_class_streams ↓
                                   grade_entries ←─ students
                                   ↓ (links to)
                               school_grading_policies ←─ schools


KEY RELATIONSHIPS:

academic_years.id → assessments.academic_year_id
  (Why: assessments are per academic year)

school_class_streams.id → assessments.stream_id
  (Why: assessments are per class stream)

subjects.id → assessments.subject_id
  (Why: assessments are per subject)

students.id → grade_entries.student_id
  (Why: grades recorded for each student)

assessments.id → grade_entries.assessment_id
  (Why: grades belong to an assessment/session)

schools.id → school_grading_policies.school_id
  (Why: each school has one grading policy)

grade_entries.assessment_id → assessments.status
  (Why: workflow state determines what teacher can do)
```

---

## PART 12: STATUS VISIBILITY & PERMISSIONS

### Teacher Permissions by Status

| Status | Can Edit | Can Submit | Can Delete | View |
|--------|----------|-----------|-----------|------|
| not_started | ✓ | ✗ | ✓ | ✓ |
| draft | ✓ | ✓ | ✓ | ✓ |
| submitted | ✗ | ✗ | ✗ | ✓ |
| returned | ✓ | ✓ | ✗ | ✓ |
| approved | ✗ | ✗ | ✗ | ✓ |

### Academic Head Permissions by Status

| Status | Approve | Return | Edit | Delete |
|--------|---------|--------|------|--------|
| submitted | ✓ | ✓ | ✗ | ✗ |
| returned | ✓ | ✗ | ✗ | ✗ |
| approved | ✗ | ✗ | ✗ | ✗ |

---

## PART 13: SUCCESS CRITERIA (FINAL)

**Phase 1 Complete:**
- ✅ Database migrated with zero breaking changes
- ✅ All 11 APIs functional and tested
- ✅ RLS policies secure school data
- ✅ Status field tracks workflow properly

**Phase 2 Complete:**
- ✅ Teachers can see dashboard showing all subjects with status
- ✅ Teachers can enter grades for one subject without re-selecting context
- ✅ Teachers can stop/continue with progress saved
- ✅ Total/grade auto-calculated correctly
- ✅ Session progress visible (18/32 students)

**Phase 3 Complete:**
- ✅ Teachers can create report cards (separate from grades)
- ✅ Report cards pull grades automatically from Grades Module
- ✅ Teachers can add attendance/conduct/remarks
- ✅ Workflow status drives UI behavior

**Phase 4 Complete:**
- ✅ Academic Head can approve/return assessments
- ✅ Email notifications sent on status change
- ✅ Teachers can resubmit after "Returned for Correction"

**Phase 5 Complete:**
- ✅ Analytics dashboard shows grade distribution
- ✅ PDF generation works
- ✅ Parent portal visible (future)

**Overall Success:**
- ✅ Zero breaking changes confirmed
- ✅ All workflows functional without errors
- ✅ Teachers report <2 min per subject grade entry
- ✅ System handles status lifecycle correctly
- ✅ Grades Module and Reports Module clearly separated
- ✅ 99% uptime with proper error handling

---

## PART 14: EFFORT ESTIMATE (FINAL)

| Phase | Task | Hours |
|-------|------|-------|
| 1 | DB migrations + migrations scripts | 10 |
| 1 | Zod schemas + validation | 4 |
| 1 | 11 API endpoints | 10 |
| 2 | Assessment selector UI | 6 |
| 2 | Grade dashboard with status | 8 |
| 2 | Grade entry form + auto-calc | 6 |
| 3 | Report card form | 8 |
| 3 | Attendance/conduct UI | 5 |
| 3 | Teacher remarks + promotion | 5 |
| 4 | Academic Head workflow + approval | 10 |
| 4 | Notifications + history | 2 |
| 5 | Analytics dashboard | 12 |
| 5 | PDF export | 4 |
| 6 | Optimization + bug fixes | 10 |
| | **TOTAL** | **~100 hours** |

**Timeline:** 1 developer = 3-4 weeks (full-time)

**With Grades/Reports separation enforced = Better maintainability long-term**

---

## PART 15: CRITICAL DECISIONS FINALIZED

✅ **Grade Entry Sessions** - Implemented inline in assessments table (not new table)  
✅ **Teacher Workflow** - Dashboard-based (hierarchical selection → subject cards → progress)  
✅ **Status Lifecycle** - 5 states (Not Started → Draft → Submitted → Returned → Approved)  
✅ **Module Separation** - Grades collects scores, Reports uses them for report cards  
✅ **3-Score Model** - Preserved from V2 (Class + Exam + Total)  
✅ **Backward Compatibility** - 100% maintained (all additions, no changes to existing)

---

## NEXT STEPS

1. **Get Sign-Off** - Review this document with architect, product, academic staff
2. **Validate Workflows** - Confirm status transitions match school processes
3. **Confirm Module Scope** - Ensure Grades/Reports separation aligns with org
4. **Begin Phase 1** - Database migrations + API development
5. **Test with Teachers** - Phase 2 UI for feedback before scaling

---

**Document Status:** FINAL - Ready for Phase 1 Implementation  
**Approved By:** [Stakeholder Sign-Off Here]  
**Date Approved:** [Date Here]  
**Version:** V3 (Grade Entry Sessions + Workflows + Module Separation)
