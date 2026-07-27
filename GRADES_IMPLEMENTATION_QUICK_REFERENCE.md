# Grades Module Implementation - Quick Reference

## TL;DR

**Current State:** Grades system is ~15% complete (basic entry exists, missing assessments, scales, rubrics, analytics)

**Vision Gap:** 85% of features missing but 60% of needed infrastructure (API patterns, components, auth) already exist

**Timeline:** 5-6 weeks for full implementation (1 developer)

**Risk Level:** Low-to-Medium (straightforward feature, follows existing patterns, backward-compatible)

---

## KEY REUSABLE COMPONENTS (Don't Reinvent)

✅ **Data Tables** → Grade listings  
✅ **Form Components** → Assessment/rubric creation  
✅ **Bulk Operations** → Batch grade operations  
✅ **Import/Export Framework** → Grade file handling  
✅ **API Route Patterns** → Assessment/scale endpoints  
✅ **Query Helpers** → Database access layer  
✅ **Auth & Multi-Tenancy** → Automatic via existing patterns  

---

## CRITICAL NEW DATABASE TABLES

```sql
-- REQUIRED (must create in Phase 1)
assessments (id, school_id, stream_id, subject_id, title, max_marks, grade_scale_id, rubric_id)
grade_scales (id, school_id, name, type, is_default)
grade_scale_points (id, grade_scale_id, min_score, max_score, letter_grade, point_value)
rubrics (id, school_id, name, is_default)
rubric_criteria (id, rubric_id, name, max_score, weight)

-- REQUIRED MODIFICATIONS
grade_entries: ADD (assessment_id, stream_id, max_marks, grade_scale_id, criteria_scores JSONB, recorded_by, deleted_at)
```

---

## PHASE BREAKDOWN

| Phase | Duration | Key Deliverables | Blocks |
|-------|----------|------------------|--------|
| **1: Foundation** | 1 week | DB schema + Core APIs | All subsequent phases |
| **2: Core UI** | 1 week | Assessment/Grade entry | Phase 3,4 |
| **3: Rubrics** | 1 week | Criterion-based scoring | Phase 4 analytics |
| **4: Analytics** | 1 week | Dashboard + reports | Phase 5 |
| **5: Audit** | 1 week | Grade history tracking | None (standalone) |
| **6: Polish** | 1 week | Performance + UX | None (final) |

---

## NEW API ENDPOINTS NEEDED

### Assessment Management
```
POST   /api/school/assessments
GET    /api/school/assessments
PUT    /api/school/assessments/:id
DELETE /api/school/assessments/:id
```

### Grade Scales
```
POST   /api/school/grade-scales
GET    /api/school/grade-scales
PUT    /api/school/grade-scales/:id
```

### Rubrics
```
POST   /api/school/rubrics
GET    /api/school/rubrics
PUT    /api/school/rubrics/:id
POST   /api/school/rubrics/:id/criteria
```

### Analytics
```
GET    /api/school/analytics/performance-by-student
GET    /api/school/analytics/performance-by-class
GET    /api/school/analytics/grade-distribution
```

### Enhanced Grades
```
POST   /api/school/grades/bulk-assign
POST   /api/school/grades/bulk-update
GET    /api/school/grades/history/:gradeId
```

---

## ARCHITECTURE DECISIONS (RESOLVED)

| Decision | Choice | Why |
|----------|--------|-----|
| Assessment Scope | School-local | Matches streaming architecture |
| Grade Storage | Store all formats | Prevents recalc mismatch on scale changes |
| Rubrics | Optional | Not all assessments are criterion-based |
| Audit Trail | Async logging | Performance-friendly |
| Student-Assessment | Stream-based | Follows enrollment model |

---

## NO BREAKING CHANGES STRATEGY

✅ All new columns on `grade_entries` are **nullable**  
✅ Existing grades API continues working unchanged  
✅ New `assessment_id` field optional (for legacy data)  
✅ Existing grade calculations stay same unless explicitly using new scale  

---

## CRITICAL SUCCESS FACTORS

1. **Database backward compatibility** - Use nullable columns, don't alter existing logic
2. **RLS policy consistency** - All new tables use school_id pattern
3. **Assessment-first workflow** - Don't allow grades without assessment context
4. **Performance at scale** - Index properly for 1000s of grades
5. **Audit trail completeness** - Log ALL modifications for compliance

---

## RISKS & MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| Large dataset slowness | Add proper indexes; use materialized views for analytics |
| RLS complexity | Test policies in isolation; follow school_id pattern |
| Breaking existing grades | Use nullable columns; backward compat tests |
| Grade calc inconsistencies | Store all formats + scale reference |
| Teachers skip new features | Make assessment creation mandatory for grades |

---

## TESTING CHECKLIST

### Phase 1
- [ ] New tables created and indexed
- [ ] RLS policies isolate school data
- [ ] Existing grades API still works
- [ ] Query helpers functional

### Phase 2
- [ ] Assessment CRUD works
- [ ] Grade scale conversion accurate
- [ ] Bulk import validation passes
- [ ] Grade entry preserves assessment context

### Phase 4
- [ ] Analytics queries return correct aggregates
- [ ] Performance < 1s for typical class (30-100 students)
- [ ] Report cards generate valid PDF

### Phase 5
- [ ] All grade modifications logged
- [ ] Grade history retrievable
- [ ] Audit exports complete

---

## EFFORT ESTIMATES

| Task | Hours |
|------|-------|
| Phase 1 (DB + APIs) | 24h |
| Phase 2 (UI + Entry) | 22h |
| Phase 3 (Rubrics) | 20h |
| Phase 4 (Analytics) | 22h |
| Phase 5 (Audit) | 16h |
| Phase 6 (Polish) | 14h |
| **TOTAL** | **~120h** |

**Timeline:** 1 developer = 5-6 weeks (full-time)

---

## DEPLOYMENT STRATEGY

1. **Phase 1:** Database migration (non-breaking) + API endpoints (new paths)
2. **Phases 2-3:** New UI components (no impact on existing pages)
3. **Phases 4-6:** Analytics and refinements (purely additive)

**Rollback:** Simple - disable new assessment creation; existing grades continue working

---

## POST-IMPLEMENTATION ROADMAP

### v1.1 (Future)
- Weighted grade calculations
- Multiple assessment types with different weights

### v1.2 (Future)
- Parent portal grade access
- Email notifications on grade changes

### v1.3 (Future)
- Predictive analytics (at-risk student identification)

---

## QUICK START CHECKLIST

**Before Phase 1:**
- [ ] Review full GRADES_MODULE_REVIEW.md
- [ ] Get database schema approved
- [ ] Plan API contract with frontend team
- [ ] Determine grade scale options from schools

**Phase 1 Sprint:**
- [ ] Create migration file
- [ ] Write Zod schemas
- [ ] Build assessment CRUD APIs
- [ ] Test backward compatibility

**Phase 2 Sprint:**
- [ ] Assessment creation UI
- [ ] Enhanced grade entry form
- [ ] Bulk import workflow

---

**Full Documentation:** See `/GRADES_MODULE_REVIEW.md` (1000+ lines)  
**Questions:** Refer to Part 7 (Conflicts) or Part 10 (Risks) sections
