# Phase 2: School Management System - Core Modules Implementation

## Overview
Phase 2 focuses on building the core functional modules that teachers, administrators, and parents use daily. Builds on Phase 1's RLS/Authorization foundation. All modules follow the established architecture patterns from Phase 1.

## Completed Architecture (Phase 1)
- API Client Layer with retry/error handling
- SchoolService with 32+ CRUD methods
- Transformers for all 16 entities (snake_case ↔ camelCase)
- Validators using Zod for all forms
- Authorization helpers + RLS policies
- Audit logging system

## Phase 2 Tasks

### Task 1: Dashboard & Analytics Module
**Goal**: Create school admin dashboard with key metrics

**Deliverables**:
- Dashboard page at `/school/[schoolId]/dashboard`
- Statistics cards: Total Students, Total Staff, Active Classes, Attendance Rate
- Charts: Monthly enrollment trends, attendance by class, class distribution
- Quick actions: Quick enrollment, mark attendance, view alerts
- Real-time data fetching using SWR
- Responsive grid layout

**Implementation**:
- Create `components/dashboard-stats.tsx` - Statistics cards
- Create `components/dashboard-charts.tsx` - Recharts visualizations
- Create `app/school/[schoolId]/dashboard/page.tsx` - Main page
- Add `SchoolService.getDashboardStats()` method
- Add `SchoolService.getChartData()` method

**Dependencies**: Students, Classes, Attendance tables

---

### Task 2: Attendance Management Module
**Goal**: Implement daily attendance tracking system

**Deliverables**:
- Attendance list page: `/school/[schoolId]/attendance`
- Mark attendance: Date picker, class selector, bulk mark present/absent/leave
- View attendance: Class-wise attendance view, student attendance history
- Reports: Attendance summary by student/class
- Filters: Date range, class, status

**Implementation**:
- Create `components/attendance-form.tsx` - Mark attendance form
- Create `components/attendance-table.tsx` - Attendance records table
- Create `components/attendance-filters.tsx` - Filter controls
- Create `app/school/[schoolId]/attendance/page.tsx` - List page
- Create `app/school/[schoolId]/attendance/[date]/page.tsx` - Date specific view
- Add API endpoints: GET/POST attendance
- AttendanceTransformer already exists

**Dependencies**: Students, Classes, Attendance tables

---

### Task 3: Grades & Assessment Module
**Goal**: Manage student grades and exam marks

**Deliverables**:
- Grades page: `/school/[schoolId]/grades`
- Enter grades: Subject selector, class selector, grade entry form
- View grades: Student report card, transcript view
- Grade scale: Define grade mapping (A=90-100, B=80-89, etc.)
- Bulk upload: CSV import for grades

**Implementation**:
- Create `components/grade-form.tsx` - Enter grades
- Create `components/grade-table.tsx` - Grades display
- Create `components/grade-scale-config.tsx` - Grade mapping
- Create `app/school/[schoolId]/grades/page.tsx` - List page
- Create `app/school/[schoolId]/grades/new/page.tsx` - Create page
- Add API endpoints: GET/POST/PUT grades
- GradeTransformer already exists

**Dependencies**: Students, Subjects, Classes, Grades tables

---

### Task 4: Report Cards Module
**Goal**: Generate and distribute student report cards

**Deliverables**:
- Report cards page: `/school/[schoolId]/report-cards`
- Generate report card: Select term/academic year, select students
- View report card: PDF format, printable
- Report card template: Customizable layout
- Distribution: Mark as sent to parents

**Implementation**:
- Create `components/report-card-generator.tsx` - Generation form
- Create `components/report-card-template.tsx` - Report card layout
- Create `components/report-card-viewer.tsx` - PDF viewer
- Create `app/school/[schoolId]/report-cards/page.tsx` - List page
- Create `app/school/[schoolId]/report-cards/[id]/page.tsx` - View page
- Add API endpoints: Generate, view, send report cards
- Add PDF generation (using jsPDF/html2pdf)

**Dependencies**: Students, Grades, Terms, AcademicYears tables

---

### Task 5: Teacher Assignments Module
**Goal**: Assign teachers to classes and subjects

**Deliverables**:
- Teacher assignments page: `/school/[schoolId]/assignments`
- Create assignment: Select teacher, class, subject, academic year
- View assignments: Class-wise teacher list, teacher workload
- Edit/delete assignments with cascade checks

**Implementation**:
- Create `components/assignment-form.tsx` - Assignment form
- Create `components/assignment-table.tsx` - Assignments list
- Create `app/school/[schoolId]/assignments/page.tsx` - List page
- Create `app/school/[schoolId]/assignments/new/page.tsx` - Create page
- Add API endpoints: GET/POST/PUT/DELETE assignments
- TeacherAssignmentTransformer already exists

**Dependencies**: Staff, Classes, Subjects, TeacherAssignments tables

---

### Task 6: Notification System Module
**Goal**: System for alerts and parent communications

**Deliverables**:
- Notifications page: `/school/[schoolId]/notifications`
- Create notification: Select recipients (class/staff/parents), message
- View notifications: Notification history, delivery status
- Scheduled notifications: Set delivery time
- Email integration: Send via email

**Implementation**:
- Create `components/notification-form.tsx` - Create notification
- Create `components/notification-table.tsx` - Notifications list
- Create `app/school/[schoolId]/notifications/page.tsx` - List page
- Create `app/school/[schoolId]/notifications/new/page.tsx` - Create page
- Add API endpoints: GET/POST notifications
- Add email service integration
- NotificationTransformer already exists

**Dependencies**: Staff, Students, Guardians, Notifications tables

---

## Implementation Order

### Phase 2.1 - Core Tracking (Weeks 1-2)
1. Dashboard & Analytics (foundational for school admins)
2. Attendance Management (foundational for daily operations)

### Phase 2.2 - Assessment (Weeks 3-4)
3. Grades & Assessment
4. Report Cards (depends on grades)

### Phase 2.3 - Management (Weeks 5-6)
5. Teacher Assignments
6. Notification System

## Estimated Timeline
- Total: 6 weeks
- Per module: 5-7 days
- Testing & refinement: 1 week

## Success Criteria
- All 6 modules fully functional
- 100% test coverage for critical paths
- Role-based access working (teachers see only their classes, parents see only their children)
- Performance: Page load < 2s, API response < 500ms
- Production build passes
- Zero TypeScript errors
- Comprehensive documentation

## Architecture Patterns (Reused from Phase 1)

### Transformers
All 16 entity transformers already created:
- StudentTransformer, StaffTransformer, ClassTransformer
- AcademicYearTransformer, TermTransformer, SubjectTransformer, GuardianTransformer
- EnrollmentTransformer, AttendanceTransformer, GradeTransformer
- TeacherAssignmentTransformer, NotificationTransformer
- Plus 4 more for completeness

### Service Methods Pattern
Each module adds 4-6 methods to SchoolService:
```typescript
static async get[Entity](schoolId: string, params): Promise<...>
static async create[Entity](schoolId: string, data): Promise<...>
static async update[Entity](schoolId: string, id: string, data): Promise<...>
static async delete[Entity](schoolId: string, id: string): Promise<...>
static async bulk[Entity](schoolId: string, data): Promise<...>
```

### Authorization Pattern
All endpoints use:
1. `getSchoolIdFromRequest()` - Extract school from JWT
2. `validateUserSchoolAccess()` - Verify access to this school
3. RLS policies - Final database security layer

### Error Handling
- Consistent error responses via `formatSupabaseError()`
- 403 Unauthorized on access denial
- 404 Not Found on missing records
- 400 Bad Request on validation failure

## Next Steps After Phase 2
- Phase 3: Mobile app (React Native/Expo)
- Phase 4: Advanced features (AI-powered insights, parent portal, mobile notifications)
- Phase 5: Deployment & scaling (multi-tenancy optimization, performance tuning)
