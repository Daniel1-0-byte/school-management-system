# Grades Module V2 → V3 Transition Guide

**What Changed:** Grade Entry Sessions, Teacher Workflows, Status Lifecycle, Module Separation

---

## SUMMARY OF IMPROVEMENTS

### 1. Grade Entry Sessions (NEW CONCEPT)

**V2:** Didn't exist - teacher just entered grades per subject  
**V3:** Sessions track teacher progress, status, and submission workflow

**Benefit:**
- Teachers can stop/continue later with progress saved (18/32 students)
- Prevents duplicate submissions
- Enables approval workflow
- Auto-save friendly

**Implementation:**
```sql
-- V2: Just assessments table with basic fields
CREATE TABLE assessments (
  id, school_id, stream_id, subject_id, title, ...
)

-- V3: Add 7 workflow fields to same table (no breaking changes)
ALTER TABLE assessments ADD COLUMN status VARCHAR(50) DEFAULT 'not_started';
ALTER TABLE assessments ADD COLUMN progress_count INT DEFAULT 0;
ALTER TABLE assessments ADD COLUMN total_students INT;
ALTER TABLE assessments ADD COLUMN last_modified TIMESTAMP;
ALTER TABLE assessments ADD COLUMN submitted_by UUID;
ALTER TABLE assessments ADD COLUMN submitted_at TIMESTAMP;
ALTER TABLE assessments ADD COLUMN approved_by UUID;
ALTER TABLE assessments ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE assessments ADD COLUMN returned_at TIMESTAMP;
ALTER TABLE assessments ADD COLUMN approval_notes TEXT;
```

**Cost:** 7 new columns to assessments table (nullable, backward compat)

---

### 2. Redesigned Teacher Workflow (MAJOR UX IMPROVEMENT)

**V2 Workflow (Painful):**
```
1. Select Academic Year ✓
2. Select Term ✓
3. Select Stream ✓
4. Select Subject: Mathematics ✓
5. Enter grades
6. Click Save
7. Teacher needs Biology next
8. Go back to Step 1 (repeated selection)
```

**Problem:** Context re-selection for every subject = frustration

---

**V3 Workflow (Efficient):**
```
STEP 1: ONE-TIME CONTEXT
Select Academic Year/Term/Stream/Assessment

STEP 2: DASHBOARD WITH ALL SUBJECTS
┌─────────────────────────────────────┐
│ Progress: 3 of 6 subjects complete  │
├─────────────────────────────────────┤
│ ✓ English (Submitted)               │
│ ✓ Mathematics (Submitted)           │
│ ⊙ Science (Draft 18/32) [Continue] │
│ • ICT (Not Started) [Start]         │
│ • Creative Arts (Not Started)       │
│ ✓ RME (Submitted)                   │
└─────────────────────────────────────┘

STEP 3: ENTER GRADES (No context-switching)
Click [Continue] for Science → Grade form opens
Enter grades → Click [Save & Next Subject]
→ Dashboard returns, ICT highlighted
→ Click [Start] for ICT
→ New grade form, NO re-selection needed

STEP 4: BULK SUBMIT
All subjects done? Click [Submit All for Review]
```

**Benefit:** 
- Zero context re-selection pain
- Visual progress on dashboard
- Natural subject-by-subject entry
- Matches modern school systems (SmartSapp, etc.)

---

### 3. Improved Status Lifecycle (WORKFLOW STATES)

**V2:** Just submitted or not  
**V3:** Complete state machine

```
NOT STARTED
    ↓
DRAFT (can edit)
    ↓
SUBMITTED (locked)
    ├→ APPROVED (locked, final) ✓
    └→ RETURNED FOR CORRECTION (can edit again)
        ↓
        RESUBMIT
        ↓ (cycles back to SUBMITTED)
```

**V3 Statuses:**

| Status | What It Means | Teacher Can Edit | Academic Head Can Review |
|--------|---------------|------------------|--------------------------|
| not_started | No grades entered yet | ✓ | ✗ |
| draft | Teacher entering/editing | ✓ | ✗ |
| submitted | Teacher finished, awaiting review | ✗ | ✓ |
| returned | Academic head wants corrections | ✓ | ✗ |
| approved | Locked, visible to parents | ✗ | ✗ |

**Benefit:**
- Clear workflow visibility
- Prevents accidental edits after submission
- Enables "Request Changes" workflow
- Natural approval process

---

### 4. Grades Module vs Reports Module (CLEAR SEPARATION)

**V2:** Everything in one place (or unclear responsibility)  
**V3:** Explicit separation

```
GRADES MODULE (NEW RESPONSIBILITIES)
════════════════════════════════════

✅ Collect academic scores (Class Score + Exam Score)
✅ Auto-calculate grades (Total, Letter, Remark)
✅ Manage sessions (progress, status)
✅ Submit for approval
✅ Academic Head approves/returns
✅ Export grades data

❌ Does NOT handle:
  - Attendance
  - Conduct/Behavior
  - Teacher remarks
  - Report card generation
  - PDF printing
  - Parent portal


REPORTS MODULE (SEPARATE RESPONSIBILITIES)
═════════════════════════════════════════════

✅ Create report cards
✅ Add attendance, conduct, remarks
✅ Add headteacher comments
✅ Promotion recommendations
✅ Generate PDFs
✅ Manage parent portal
✅ Analytics/dashboards

❌ Does NOT handle:
  - Grade calculation (← Grades Module)
  - Grade entry (← Grades Module)
  - Grade approval (← Grades Module)
```

**Benefit:**
- Single responsibility principle
- Easier to maintain & test
- Clear API boundaries
- Can scale each module independently
- Easier to audit who changed what

---

## DATABASE SCHEMA CHANGES (V2 → V3)

**Additions to `assessments` table:**

```
COLUMN NAME            | TYPE       | PURPOSE
───────────────────────┼────────────┼─────────────────────────
status                 | VARCHAR    | Workflow state
progress_count         | INT        | Students with grades
total_students         | INT        | Total in class
last_modified          | TIMESTAMP  | Track last change
submitted_by           | UUID       | Who submitted
submitted_at           | TIMESTAMP  | When submitted
approved_by            | UUID       | Who approved
approved_at            | TIMESTAMP  | When approved
returned_at            | TIMESTAMP  | When returned
approval_notes         | TEXT       | Why returned/notes
```

**Additions to `school_grading_policies` table:**
None (same as V2)

**Additions to `grade_entries` table:**
None (same as V2)

**Total Changes:** +7 columns to assessments (all nullable, non-breaking)

---

## API ENDPOINTS (V2 → V3)

### Same Endpoints, Enhanced Purpose

**V2 Endpoints (Unchanged):**
```
POST   /api/school/assessments
GET    /api/school/assessments
PUT    /api/school/assessments/:id
DELETE /api/school/assessments/:id

POST   /api/school/grades/bulk-entry
GET    /api/school/grades
PUT    /api/school/grades/:id

GET    /api/school/settings/grading-policy
PUT    /api/school/settings/grading-policy
```

**V3 New Endpoints (Workflow):**
```
PUT    /api/school/assessments/:id/submit      [status: submitted]
PUT    /api/school/assessments/:id/approve     [status: approved]
PUT    /api/school/assessments/:id/return      [status: returned]
```

**Why separate?** Makes workflow state changes explicit in API (not generic PUT)

**Total:** Still 11 endpoints (same as V2)

---

## IMPLEMENTATION ROADMAP CHANGES

### Phase Timeline Unchanged

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1 | 1 week | Database + APIs |
| 2 | 1 week | **Teachers enter grades** ← Working system HERE |
| 3 | 1 week | Teachers complete reports |
| 4 | 5 days | Academic Head approves |
| 5 | 5 days | Analytics |
| 6 | 5 days | Polish |
| **Total** | **3-4 weeks** | |

### Effort Estimate Unchanged

Still ~100 hours for 1 developer (same as V2)

### What's Different

**Phase 2 Deliverables (V2 vs V3):**

V2:
```
- Grade entry table
- Auto-calculation
- Bulk save
```

V3 (Enhanced):
```
- Grade entry table (same)
- Auto-calculation (same)
- Bulk save (same)
- Dashboard showing all subjects ← NEW
- Progress display (18/32) ← NEW
- Status indicators (Draft/Submitted/Approved) ← NEW
- Session state management ← NEW
```

**Effort Impact:** +4-5 hours for dashboard UI (still fits in Phase 2)

---

## BACKWARD COMPATIBILITY CHECK

✅ **Existing grades:** Unaffected (old `score` column still works)  
✅ **Existing APIs:** Can still POST without new fields  
✅ **Nullable columns:** All new fields are nullable  
✅ **Legacy queries:** `COALESCE(total_score, score)` handles both  
✅ **Data migration:** Zero data loss  

---

## DEPLOYMENT ORDER (V3)

### Deploy 1: Schema Extension (Week 1, Phase 1)
```
- Add 7 new columns to assessments table (all DEFAULT NULL)
- Create migrations
- NO breaking changes
- Existing assessments continue working
```

### Deploy 2: Grade Dashboard UI (Week 2, Phase 2)
```
- Add dashboard component
- Show all subjects with status
- Replaces individual subject selection
- Teachers see new UI
- Old system still accessible (optional)
```

### Deploy 3: Workflow API (Phase 2/3)
```
- Add submit/approve/return endpoints
- Academic Head workflow
- Email notifications
```

### Deploy 4: Reports Module Enhancement (Phase 3)
```
- Report cards consume grades from new API
- Separate concerns clearly
```

---

## TEAM COMMUNICATION

### What to Tell Teachers

"Your grading experience is changing for the better:

✅ Instead of selecting Subject repeatedly, you'll see all your subjects in one dashboard
✅ See your progress (18 of 32 students) so you know where you left off
✅ Stop/continue anytime - your progress is saved automatically
✅ Submit when ready - Academic Head approves or asks for corrections
✅ Faster data entry overall (5 min per subject instead of 10 min)"

### What to Tell Academic Head

"New approval workflow:

✅ See all submitted assessments to approve
✅ Can ask teachers to fix/resubmit (Return for Correction)
✅ Teachers can see exactly what needs fixing and make corrections
✅ Clear status visibility (Submitted → Approved/Returned)
✅ Audit trail shows who changed what and when"

### What to Tell IT/Developers

"Architecture improvements:

✅ Grade Entry Sessions track workflow progress
✅ Teacher workflow redesigned for UX (dashboard-based)
✅ Status lifecycle properly modeled (5 states)
✅ Grades Module ↔ Reports Module clearly separated
✅ Zero breaking changes - all additions, no subtractions
✅ Same API endpoint count (11)
✅ +7 nullable columns to assessments table
✅ Still ~100 hours effort
✅ Still 3-4 weeks timeline"

---

## ROLLBACK PLAN (If Issues)

If critical issue in Phase 2:
1. Disable Grade Dashboard UI
2. Teachers continue on old system (single subject selection)
3. Revert UI PR
4. Grades Module APIs remain (non-breaking)
5. No data loss

If critical issue in Phase 3:
1. Disable approval workflow endpoints
2. Revert to existing approval system
3. Database additions remain (now unused)
4. Grades still work

---

## TESTING CHECKLIST (V3 Specific)

### New Tests Required

- [ ] Status transitions work (not_started → draft → submitted → approved)
- [ ] Progress counter increments on grade entry
- [ ] Submitted assessments become read-only
- [ ] Returned assessments become editable again
- [ ] Dashboard displays correct status colors/icons
- [ ] [Submit All] button disabled until all subjects complete
- [ ] Dashboard loads all subjects for a stream
- [ ] [Continue] button resumes grade entry mid-way
- [ ] [Save & Next Subject] loads correct next subject
- [ ] Approval flow: Academic Head can approve/return
- [ ] Email sent when status changes
- [ ] Returned notes display to teacher

### Existing Tests (Still Pass)

- [ ] Grade calculation still works (COALESCE logic)
- [ ] Backward compat queries return legacy grades
- [ ] RLS policies unchanged
- [ ] Existing APIs still accept old requests

---

## SUCCESS METRICS (V3)

| Metric | V2 Target | V3 Target | How to Measure |
|--------|-----------|-----------|----------------|
| Teacher entry time per subject | 10 min | 5 min | Ask teachers |
| Context-switches per class | 6+ | 0 | Dashboard shows all subjects |
| Progress visibility | No | Yes | Dashboard progress bar |
| Workflow status visibility | Partial | 100% | Status indicators on cards |
| Approval clarity | Unclear | Clear | 5-state flow with notes |

---

## COMPARISON TABLE: V2 vs V3

| Aspect | V2 | V3 | Change |
|--------|----|----|--------|
| **Database Complexity** | Simple | Simple | No change |
| **Teacher Workflow** | Subject-by-subject | Dashboard-based | Major UX improvement |
| **Progress Tracking** | No | Yes (progress_count) | New |
| **Status Lifecycle** | Submitted/Not | 5 states | Enhanced |
| **Module Separation** | Implicit | Explicit | Clarified |
| **Implementation Effort** | ~100 hrs | ~105 hrs | +5 hrs |
| **Timeline** | 3-4 weeks | 3-4 weeks | No change |
| **Breaking Changes** | 0 | 0 | No change |
| **API Endpoints** | 11 | 11 | No change (3 new workflow endpoints) |

---

## FINAL CHECKLIST BEFORE PHASE 1

- [ ] Architecture V3 document reviewed and approved
- [ ] Teacher workflow diagrams validated with teaching staff
- [ ] Status lifecycle confirmed with Academic leadership
- [ ] Grades/Reports separation scope confirmed
- [ ] Database changes reviewed for security
- [ ] API contracts finalized
- [ ] Zod schemas prepared
- [ ] RLS policy patterns documented
- [ ] Phase 1 dev assigned
- [ ] Phase 2 UI designer assigned

---

**Document Status:** Transition Guide Ready  
**From Version:** V2 (Simplified 3-Score Model)  
**To Version:** V3 (Sessions + Workflows + Separation)  
**Breaking Changes:** ZERO  
**Backward Compatibility:** 100%
