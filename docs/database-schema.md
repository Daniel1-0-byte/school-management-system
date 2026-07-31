# School Management System - Database Schema

**Last Updated:** July 31, 2026  
**Database:** Supabase PostgreSQL  
**Version:** 009 - Streaming Architecture

## Overview

This document describes the complete database schema for the School Management System. The database is organized into core school management tables, curriculum/streaming architecture tables, and platform administration tables.

---

## Core Tables

### 1. **academic_years**
Stores academic year information for schools.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| year | INTEGER | NO | Academic year (e.g., 2024) |
| start_date | DATE | NO | Year start date |
| end_date | DATE | NO | Year end date |
| is_active | BOOLEAN | YES | Current active year flag |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, is_active  
**Relationships:** academic_years → schools, terms, assessments

---

### 2. **terms**
Academic terms within an academic year (Semester 1, 2, 3).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| academic_year_id | UUID | NO | Foreign key to academic_years |
| type | VARCHAR | NO | Term type (term_1, term_2, term_3) |
| start_date | DATE | NO | Term start date |
| end_date | DATE | NO | Term end date |
| report_card_deadline | DATE | YES | Report card deadline |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, academic_year_id  
**Relationships:** terms → academic_years, assessments, grade_entries

---

### 3. **schools**
School organization information.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| name | VARCHAR | NO | School name |
| address | TEXT | YES | School address |
| phone | VARCHAR | YES | Contact phone |
| email | VARCHAR | YES | Contact email |
| principal_name | VARCHAR | YES | Principal's name |
| board_affiliation | VARCHAR | YES | Board affiliation (CBSE, ICSE, etc.) |
| subscription_id | UUID | YES | Foreign key to subscription_plans |
| status | VARCHAR | NO | Status (active, inactive, suspended) |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** status, subscription_id  
**Relationships:** schools → academic_years, students, teachers, staff, school_classes, school_class_streams, assessments

---

### 4. **profiles**
User profiles (students, teachers, staff, admins).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key (from Auth) |
| email | VARCHAR | NO | User email |
| first_name | VARCHAR | YES | First name |
| last_name | VARCHAR | YES | Last name |
| role | VARCHAR | NO | User role (student, teacher, admin, staff) |
| phone | VARCHAR | YES | Phone number |
| avatar_url | VARCHAR | YES | Profile photo URL |
| school_id | UUID | YES | Foreign key to schools |
| department | VARCHAR | YES | Department/Section |
| status | VARCHAR | NO | Status (active, inactive) |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** email, school_id, role, status  
**Relationships:** Linked to students, teacher_assignments, attendance_records

---

### 5. **students**
Student information with enrollment status.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| profile_id | UUID | NO | Foreign key to profiles |
| admission_number | VARCHAR | NO | Student ID/admission number |
| date_of_birth | DATE | YES | Birth date |
| gender | VARCHAR | YES | Gender |
| blood_group | VARCHAR | YES | Blood group |
| address | TEXT | YES | Residential address |
| emergency_contact | VARCHAR | YES | Emergency contact number |
| status | VARCHAR | NO | Status (active, inactive, graduated) |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, profile_id, admission_number, status  
**Relationships:** students → student_enrollments, student_guardians, grade_entries, attendance_records

---

### 6. **student_enrollments**
Student enrollment in classes/streams per academic year.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| student_id | UUID | NO | Foreign key to students |
| academic_year_id | UUID | NO | Foreign key to academic_years |
| class_id | UUID | YES | Foreign key to school_classes (deprecated, use stream_id) |
| stream_id | UUID | YES | Foreign key to school_class_streams |
| enrollment_date | DATE | NO | Enrollment date |
| status | VARCHAR | NO | Status (active, inactive, graduated) |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, student_id, academic_year_id, stream_id, class_id  
**Relationships:** student_enrollments → students, academic_years, school_class_streams, school_classes

---

### 7. **guardians**
Student guardian/parent information.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| first_name | VARCHAR | NO | Guardian first name |
| last_name | VARCHAR | NO | Guardian last name |
| relationship | VARCHAR | NO | Relationship (parent, guardian, etc.) |
| phone | VARCHAR | YES | Contact phone |
| email | VARCHAR | YES | Contact email |
| address | TEXT | YES | Address |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, email  
**Relationships:** guardians → student_guardians, pickup_persons

---

### 8. **student_guardians**
Mapping between students and their guardians.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| student_id | UUID | NO | Foreign key to students |
| guardian_id | UUID | NO | Foreign key to guardians |
| is_primary | BOOLEAN | YES | Primary contact flag |
| created_at | TIMESTAMP | YES | Creation timestamp |

**Indexes:** school_id, student_id, guardian_id  
**Relationships:** student_guardians → students, guardians

---

### 9. **pickup_persons**
Authorized persons for student pickup.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| guardian_id | UUID | NO | Foreign key to guardians |
| first_name | VARCHAR | NO | Person's first name |
| last_name | VARCHAR | NO | Person's last name |
| relationship | VARCHAR | YES | Relationship to guardian |
| phone | VARCHAR | YES | Contact phone |
| is_active | BOOLEAN | YES | Active status |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, guardian_id, is_active  
**Relationships:** pickup_persons → guardians

---

### 10. **subjects**
School-specific subject definitions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| name | VARCHAR | NO | Subject name |
| code | VARCHAR | NO | Subject code |
| description | TEXT | YES | Description |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, code  
**Relationships:** subjects → grade_entries, assessments

---

### 11. **teacher_assignments**
Teacher assignments to classes/streams and subjects.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| teacher_id | UUID | NO | Foreign key to profiles |
| class_id | UUID | YES | Foreign key to school_classes (deprecated) |
| stream_id | UUID | YES | Foreign key to school_class_streams |
| subject_id | UUID | YES | Foreign key to subjects |
| academic_year_id | UUID | NO | Foreign key to academic_years |
| is_class_teacher | BOOLEAN | YES | Class teacher flag |
| assignment_date | DATE | NO | Assignment date |
| status | VARCHAR | NO | Status (active, inactive) |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, teacher_id, stream_id, class_id, academic_year_id  
**Relationships:** teacher_assignments → profiles, school_class_streams, subjects, academic_years

---

### 12. **attendance_records**
Student attendance records.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| student_id | UUID | NO | Foreign key to students |
| class_id | UUID | NO | Foreign key to school_classes |
| stream_id | UUID | YES | Foreign key to school_class_streams |
| date | DATE | NO | Attendance date |
| status | TEXT | NO | Status (present, absent, leave, sick) |
| remarks | TEXT | YES | Remarks |
| recorded_by | UUID | NO | Foreign key to profiles (teacher) |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, student_id, class_id, stream_id, date, recorded_by  
**Relationships:** attendance_records → students, school_classes, school_class_streams, profiles

---

### 13. **assessments**
Assessment/examination definitions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| academic_year_id | UUID | NO | Foreign key to academic_years |
| term_id | UUID | YES | Foreign key to terms |
| stream_id | UUID | NO | Foreign key to school_class_streams |
| subject_id | UUID | NO | Foreign key to subjects |
| name | VARCHAR | NO | Assessment name |
| description | TEXT | YES | Description |
| assessment_type | VARCHAR | NO | Type (test, exam, assignment, project) |
| max_marks | NUMERIC | YES | Maximum marks |
| status | VARCHAR | NO | Status (draft, active, closed, archived) |
| progress_count | INTEGER | YES | Number of grades entered |
| total_students | INTEGER | YES | Total students in stream/subject |
| submitted_by | UUID | YES | Submitted by teacher |
| submitted_at | TIMESTAMP | YES | Submission timestamp |
| approved_by | UUID | YES | Approved by (admin) |
| approved_at | TIMESTAMP | YES | Approval timestamp |
| returned_at | TIMESTAMP | YES | Returned for revision |
| approval_notes | TEXT | YES | Approval notes |
| last_modified | TIMESTAMP | YES | Last modification timestamp |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, academic_year_id, stream_id, subject_id, status, term_id  
**Relationships:** assessments → academic_years, terms, school_class_streams, subjects, grade_entries

---

### 14. **grade_entries**
Student grades for assessments.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| student_id | UUID | NO | Foreign key to students |
| term_id | UUID | NO | Foreign key to terms |
| stream_id | UUID | YES | Foreign key to school_class_streams |
| subject_id | UUID | NO | Foreign key to subjects |
| assessment_id | UUID | YES | Foreign key to assessments |
| teacher_id | UUID | NO | Foreign key to profiles (teacher) |
| score | NUMERIC | NO | Numeric score |
| class_score | NUMERIC | YES | Class work score |
| exam_score | NUMERIC | YES | Exam score |
| total_score | NUMERIC | YES | Total score |
| grade_type | TEXT | NO | Type (formative, summative, continual) |
| letter_grade | VARCHAR | YES | Letter grade (A, B, C, etc.) |
| remarks | TEXT | YES | Remarks |
| submission_status | VARCHAR | YES | Status (draft, submitted, approved) |
| recorded_by | UUID | YES | Recorded by |
| recorded_at | TIMESTAMP | NO | Recording timestamp |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, student_id, term_id, subject_id, stream_id, assessment_id, submission_status  
**Relationships:** grade_entries → students, terms, subjects, school_class_streams, assessments, profiles

---

### 15. **report_cards**
Generated report cards for students.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| student_id | UUID | NO | Foreign key to students |
| academic_year_id | UUID | NO | Foreign key to academic_years |
| term_id | UUID | NO | Foreign key to terms |
| stream_id | UUID | YES | Foreign key to school_class_streams |
| status | VARCHAR | NO | Status (draft, generated, approved, published) |
| generated_by | UUID | YES | Generated by (admin) |
| approved_by | UUID | YES | Approved by |
| published_date | DATE | YES | Publication date |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, student_id, academic_year_id, term_id, status  
**Relationships:** report_cards → students, academic_years, terms, school_class_streams

---

### 16. **audit_logs**
System audit trail for compliance and debugging.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| actor_id | UUID | YES | User who performed action |
| action | VARCHAR | NO | Action type (CREATE, UPDATE, DELETE) |
| target_type | VARCHAR | NO | Entity type (student, grade, etc.) |
| target_id | VARCHAR | NO | Entity ID |
| target_name | VARCHAR | YES | Entity name |
| school_id | UUID | YES | Foreign key to schools |
| changes | JSONB | YES | JSON diff of changes |
| ip_address | INET | YES | IP address |
| user_agent | TEXT | YES | Browser user agent |
| created_at | TIMESTAMP | YES | Creation timestamp |

**Indexes:** actor_id, school_id, target_type, created_at  
**Relationships:** audit_logs → profiles, schools

---

### 17. **notifications**
User notifications system.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| user_id | UUID | NO | Foreign key to profiles |
| title | TEXT | NO | Notification title |
| message | TEXT | NO | Notification message |
| type | TEXT | NO | Type (alert, info, warning, success) |
| read | BOOLEAN | YES | Read status |
| created_at | TIMESTAMP | NO | Creation timestamp |
| updated_at | TIMESTAMP | NO | Last update timestamp |

**Indexes:** user_id, created_at, read  
**Relationships:** notifications → profiles

---

## Streaming Architecture Tables

### 18. **system_curriculums**
Platform-wide curriculum definitions (Ghana Curriculum Framework).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| name | VARCHAR | NO | Curriculum name |
| version | VARCHAR | NO | Version (e.g., "1.0", "2.0") |
| description | TEXT | YES | Description |
| is_active | BOOLEAN | NO | Active status |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** is_active, (name, version) unique  
**Relationships:** system_curriculums → system_classes

---

### 19. **system_classes**
Platform-wide class/grade definitions (JHS1, JHS2, JHS3, SHS1, etc.).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| curriculum_id | UUID | NO | Foreign key to system_curriculums |
| code | VARCHAR | NO | Class code (JHS1, SHS2, etc.) |
| name | VARCHAR | NO | Class name (Form 1, Year 7, etc.) |
| display_order | INTEGER | NO | Sort order |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** curriculum_id, code, (curriculum_id, code) unique  
**Relationships:** system_classes → system_curriculums, system_class_subjects, school_class_streams

---

### 20. **system_subjects**
Platform-wide subject definitions (English, Mathematics, Science, etc.).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| code | VARCHAR | NO | Subject code |
| name | VARCHAR | NO | Subject name |
| short_name | VARCHAR | YES | Abbreviated name |
| description | TEXT | YES | Description |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** code (unique)  
**Relationships:** system_subjects → system_class_subjects, school_class_stream_subjects

---

### 21. **system_class_subjects**
Mapping of subjects offered in each class (JHS1 offers English, Math, Science, etc.).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| class_id | UUID | NO | Foreign key to system_classes |
| subject_id | UUID | NO | Foreign key to system_subjects |
| subject_order | INTEGER | NO | Display order |
| is_core | BOOLEAN | NO | Core subject flag |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** class_id, subject_id, (class_id, subject_id) unique  
**Relationships:** system_class_subjects → system_classes, system_subjects

---

### 22. **school_class_streams**
School-specific streams (multiple JHS1 streams: JHS1-A, JHS1-B).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| academic_year_id | UUID | NO | Foreign key to academic_years |
| system_class_id | UUID | NO | Foreign key to system_classes |
| stream_name | VARCHAR | NO | Stream name (A, B, C, etc.) |
| capacity | INTEGER | YES | Maximum capacity |
| class_teacher_id | UUID | YES | Foreign key to profiles (class teacher) |
| status | VARCHAR | NO | Status (active, inactive) |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

**Indexes:** school_id, academic_year_id, system_class_id, status, (school_id, academic_year_id, system_class_id, stream_name) unique  
**Relationships:** school_class_streams → schools, academic_years, system_classes, profiles, student_enrollments, teacher_assignments, school_class_stream_subjects

---

### 23. **school_class_stream_subjects** ⭐ Key for Grades Module
Subjects offered in a specific school stream (JHS1-A in School X offers English, Math, Science).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| stream_id | UUID | NO | Foreign key to school_class_streams |
| system_subject_id | UUID | NO | Foreign key to system_subjects |
| is_core | BOOLEAN | NO | Core subject flag |
| created_at | TIMESTAMP | YES | Creation timestamp |

**Indexes:** stream_id, system_subject_id, (stream_id, system_subject_id) unique  
**Relationships:** school_class_stream_subjects → school_class_streams, system_subjects  
**Note:** This is the table used by the grades module to load subjects for a stream. It references `system_subjects` not a school-specific subjects table.

---

## Platform Administration Tables

### 24. **platform_admins**
Platform super-admin users.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key (from Auth) |
| email | VARCHAR | NO | Admin email |
| role | VARCHAR | NO | Admin role (super_admin, moderator) |
| is_active | BOOLEAN | YES | Active status |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

---

### 25. **platform_admin_roles**
Platform admin role definitions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| name | VARCHAR | NO | Role name |
| description | TEXT | YES | Role description |
| permissions | JSONB | NO | Permissions array |
| created_at | TIMESTAMP | YES | Creation timestamp |

---

### 26. **permission_groups**
Permission group definitions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| name | VARCHAR | NO | Group name |
| permissions | JSONB | NO | Permissions array |
| created_at | TIMESTAMP | YES | Creation timestamp |

---

### 27. **school_requests**
School registration/onboarding requests.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_name | VARCHAR | NO | Requested school name |
| admin_email | VARCHAR | NO | Admin email |
| phone | VARCHAR | YES | Contact phone |
| address | TEXT | YES | School address |
| status | VARCHAR | NO | Status (pending, approved, rejected) |
| rejection_reason | TEXT | YES | Rejection reason if rejected |
| created_at | TIMESTAMP | YES | Creation timestamp |
| updated_at | TIMESTAMP | YES | Last update timestamp |

---

### 28. **school_subscriptions**
School subscription status.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| school_id | UUID | NO | Foreign key to schools |
| subscription_plan_id | UUID | NO | Foreign key to subscription_plans |
| start_date | DATE | NO | Subscription start date |
| end_date | DATE | NO | Subscription end date |
| status | VARCHAR | NO | Status (active, expired, cancelled) |
| created_at | TIMESTAMP | YES | Creation timestamp |

---

### 29. **subscription_plans**
Platform subscription plan definitions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| name | VARCHAR | NO | Plan name (Basic, Professional, Enterprise) |
| description | TEXT | YES | Description |
| price | NUMERIC | NO | Monthly price |
| max_students | INTEGER | NO | Maximum students allowed |
| max_staff | INTEGER | NO | Maximum staff allowed |
| features | JSONB | NO | Features array |
| created_at | TIMESTAMP | YES | Creation timestamp |

---

## Query Patterns

### Getting Subjects for a Stream (Grades Module)
```sql
SELECT ss.id, ss.code, ss.name, ss.short_name, ss.description
FROM school_class_stream_subjects scss
JOIN system_subjects ss ON scss.system_subject_id = ss.id
WHERE scss.stream_id = $1
ORDER BY ss.name;
```

### Getting Student Enrollment in Stream
```sql
SELECT se.* FROM student_enrollments se
WHERE se.student_id = $1 AND se.academic_year_id = $2
  AND se.stream_id IS NOT NULL;
```

### Getting Grades for a Student in a Term
```sql
SELECT ge.* FROM grade_entries ge
WHERE ge.student_id = $1 AND ge.term_id = $2
  AND ge.school_id = $3
ORDER BY ge.subject_id;
```

### Getting Assessments for a Stream and Subject
```sql
SELECT a.* FROM assessments a
WHERE a.stream_id = $1 AND a.subject_id = $2
  AND a.academic_year_id = $3
ORDER BY a.created_at DESC;
```

---

## Key Relationships Diagram

```
schools
  ├── academic_years
  │   ├── terms
  │   │   └── assessments
  │   │   └── grade_entries
  │   └── school_class_streams
  │       ├── student_enrollments
  │       ├── teacher_assignments
  │       └── school_class_stream_subjects
  │           └── system_subjects (⭐ Grades Module)
  ├── students
  │   ├── student_enrollments
  │   ├── student_guardians
  │   ├── attendance_records
  │   └── grade_entries
  └── guardians
      └── student_guardians
      └── pickup_persons
```

---

## Security

All tables have Row Level Security (RLS) enabled where appropriate. Schools can only access their own data. Users can only access data relevant to their role and school.

### RLS Policies Applied To:
- students
- student_enrollments
- academic_years
- school_class_streams
- teacher_assignments
- attendance_records
- assessments
- grade_entries
- report_cards
- guardian
- notifications
- audit_logs
