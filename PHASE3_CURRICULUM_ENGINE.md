# Phase 3: Curriculum Engine Implementation Guide

## Overview
Phase 3 completes the curriculum management system by integrating the centralized curriculum throughout the entire application. All modules now use the official curriculum instead of custom configurations.

## Core Principles
- Schools only manage streams (not classes/subjects)
- Students inherit subjects from their stream
- Teachers are assigned to system subjects
- All data uses the curriculum engine
- Legacy custom subject/class creation is removed

## Implementation Checklist

### 1. Student Module
- [ ] Update StudentTransformer to use `current_stream_id` instead of `current_class_id`
- [ ] Update student API to accept `stream_id` parameter
- [ ] Update student creation form to show stream selector instead of class
- [ ] Auto-populate student subjects from stream definition
- [ ] Update enrollment table to reference `school_class_streams`

### 2. Teacher Module
- [ ] Update TeacherAssignment to use `system_subject_id` instead of `subject_id`
- [ ] Update teacher assignment API to validate against system subjects
- [ ] Update teacher assignment form to show official subjects only
- [ ] Remove subject selection and use stream's official subjects
- [ ] Update teacher query to join with system curriculum

### 3. Student Admission Flow
- [ ] Step 1: Personal Info (existing)
- [ ] Step 2: Class Selection → Stream Selection
  - GET /api/curriculum/classes (official classes)
  - GET /api/curriculum/classes/[id]/streams (school streams for that class)
- [ ] Step 3: Auto-assign subjects from stream (no manual selection)
- [ ] Step 4: Guardian assignment (existing)
- [ ] Step 5: Review and submit

### 4. Report Cards
- [ ] Remove custom subject configuration in report card settings
- [ ] Auto-generate report card structure from stream subjects
- [ ] Use `school_class_stream_subjects` to determine:
  - Which subjects appear on card
  - Core vs elective designation
  - Subject order
- [ ] Update grade entry to only allow official subjects

### 5. Attendance
- [ ] Update attendance queries to use `school_class_streams`
- [ ] Update attendance form to show streams instead of classes
- [ ] Attendance can be filtered by:
  - Stream (all students in stream)
  - Subject (only students taking that subject)
- [ ] Update analytics to aggregate by stream

### 6. Grades
- [ ] Update grade entry to only allow official subjects
- [ ] Update query to validate subject belongs to student's stream
- [ ] Update report card generation to use official subjects
- [ ] Remove custom subject validation

### 7. Bulk Import/Export
- [ ] Validate class names against `system_classes.name`
- [ ] Validate subject names against `system_subjects.name`
- [ ] Validate stream names against school's created streams
- [ ] Reject rows with:
  - Unknown class names
  - Unknown subject names
  - Class/subject mismatches (not in curriculum)
- [ ] Use official curriculum names in exports

### 8. Analytics
- [ ] Update dashboards to aggregate by:
  - System class (e.g., "Basic 1" enrollment across all schools)
  - School stream (e.g., "Basic 1 Stream A" enrollment)
  - Subject (official subject enrollment)
- [ ] Update charts to show curriculum structure
- [ ] Attendance rate by stream
- [ ] Performance by subject (official)

### 9. Remove Legacy Features
- [ ] Delete "Create Subject" UI
- [ ] Delete "Delete Subject" UI  
- [ ] Delete "Create Class" UI
- [ ] Delete "Rename Class" UI
- [ ] Delete "Delete Class" UI
- [ ] Hide subject creation from settings
- [ ] Hide class management from settings
- [ ] Remove custom subject API endpoints
- [ ] Keep existing data for backward compatibility

### 10. Database Updates
- [ ] Add `current_stream_id` to `students` table (done in migration 007)
- [ ] Add `stream_id` to `student_enrollments` (done in migration 007)
- [ ] Add `system_subject_id` to `teacher_assignments`
- [ ] Update RLS policies for stream access
- [ ] Create index on frequently queried stream relationships

## Files to Update

### Transformers
- `lib/transformers/student-transformer.ts` - Add stream fields ✓
- `lib/transformers/teacher-assignment-transformer.ts` - Add subject fields
- `lib/transformers/grade-transformer.ts` - Add subject validation
- `lib/transformers/attendance-transformer.ts` - Update for streams

### API Endpoints
- `app/api/school/students/route.ts` - Update for streams
- `app/api/school/students/[id]/route.ts` - Update for streams
- `app/api/school/teacher-assignments/route.ts` - Update for subjects
- `app/api/school/grades/route.ts` - Update validation
- `app/api/school/attendance/route.ts` - Update for streams
- `app/api/school/report-cards/route.ts` - Auto-generate from streams

### Pages
- `app/(school)/students/page.tsx` - Show streams
- `app/school/[schoolId]/students/new/page.tsx` - Stream selector
- `app/(school)/staff/page.tsx` - System subjects only
- `app/school/[schoolId]/teacher-assignments/page.tsx` - System subjects
- `app/(school)/grades/page.tsx` - Official subjects
- `app/(school)/attendance/page.tsx` - Streams
- `app/(school)/reports/page.tsx` - Auto-generated from streams
- `app/(school)/dashboard/page.tsx` - Curriculum metrics

### Services
- `lib/services/school-service.ts` - Stream support
- `lib/services/stream-service.ts` - Already created
- `lib/services/school-curriculum-service.ts` - Already created

### Import/Export
- `lib/import-export/validators.ts` - Validate against curriculum
- `lib/import-export/column-definitions.ts` - Use official names
- Update template generation to show official curriculum

## Migration Path

### Safe Migration Strategy
1. Keep old `school_classes` and `school_subjects` tables (backward compat)
2. Add new `school_class_streams` tables (Phase 2) ✓
3. Add stream columns to existing tables (Phase 2) ✓
4. Update code to prefer streams over classes
5. Populate stream_id from class_id using migration mapping
6. Tests with parallel data structures (old + new)
7. Switch applications to streams-only after testing

### Data Migration
```sql
-- Schools without curriculum adoption
UPDATE students 
SET current_stream_id = (
  SELECT stream_id FROM school_class_streams 
  WHERE school_class_streams.class_id = students.current_class_id 
  LIMIT 1
)
WHERE current_stream_id IS NULL;
```

## Testing Checklist

### Unit Tests
- [ ] Stream creation auto-creates subjects
- [ ] Stream selection properly sets student subjects
- [ ] Teacher assignment validates system subjects
- [ ] Report card generation works with new structure
- [ ] Attendance queries work with streams
- [ ] Grade entry validates against stream subjects

### Integration Tests
- [ ] Student admission flow (class → stream selection)
- [ ] Teacher assignment with official subjects
- [ ] Report card generation from stream
- [ ] Attendance marking for stream
- [ ] Grade entry for stream students
- [ ] Bulk import with curriculum validation
- [ ] Analytics with curriculum data

### E2E Tests
- [ ] Complete student admission workflow
- [ ] Teacher creates grades for stream
- [ ] Report cards generate automatically
- [ ] Attendance marked by stream
- [ ] Exports use official names
- [ ] Dashboard shows curriculum metrics

## Success Criteria

- [✓] Student interface updated for streams
- [ ] TeacherAssignment uses system subjects
- [ ] Student admission uses stream selector
- [ ] Report cards auto-generate from streams
- [ ] Attendance uses streams
- [ ] Grades use official subjects
- [ ] Bulk import validates curriculum
- [ ] Analytics use curriculum data
- [ ] All legacy create/edit/delete features removed
- [ ] Production build passes
- [ ] No runtime errors
- [ ] Authentication unchanged
- [ ] RLS policies respected

## Quick Reference

### Curriculum Tables
- `system_curriculums` - Platform curriculum versions
- `system_classes` - Standard classes (KG1-Basic9)
- `system_subjects` - 13 official subjects
- `system_class_subjects` - Subject-class mappings

### School Tables
- `school_class_streams` - School's stream instances
- `school_class_stream_subjects` - Stream's subject assignments
- `students` - Now has `current_stream_id`
- `student_enrollments` - Now has `stream_id`
- `teacher_assignments` - Should have `system_subject_id`
- `grade_entries` - Should validate against stream subjects

### Migration Map
- `class_migration_map` - Maps old class IDs to streams

