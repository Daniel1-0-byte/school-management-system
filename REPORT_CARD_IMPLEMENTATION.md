# Professional Report Card System - Implementation Guide

## Overview

This document describes the complete implementation of a production-ready report card generation, printing, and bulk export system for the school management application.

## Architecture

### Key Components

#### 1. **Storage & Upload** (`lib/storage-utils.ts`)
- `uploadImage()` - Upload images to Supabase Storage with validation
- `deleteImage()` - Delete images from storage
- `getImagePreview()` - Generate data URLs for previews
- Supports JPEG, PNG, GIF, WebP (max 5MB)
- Uses existing `school-logos` bucket

#### 2. **Settings UI Components**
- `components/settings/logo-upload.tsx` - School logo upload with preview
- `components/settings/signature-upload.tsx` - Headteacher signature management
- Integrated into `app/(school)/settings/page.tsx`

#### 3. **Signature API** (`app/api/school/settings/signature/route.ts`)
- `PUT` - Update admin signature URL
- `DELETE` - Remove signature
- Security: Only admins can update their own signature
- Respects school_id isolation

#### 4. **Professional Report Card Template** (`components/reports/professional-report-card.tsx`)
- Print-ready A4 layout with proper formatting
- Automatically includes:
  - School logo (if uploaded)
  - School contact details
  - Student information
  - Academic performance table
  - Attendance summary
  - Teacher comments
  - Class teacher name
  - Headteacher signature (if available)
- CSS media queries for print optimization
- Shared by both individual and bulk generation

#### 5. **Individual Report Preview** (`app/(school)/reports/preview/page.tsx`)
- Real-time report card preview
- Print and PDF download buttons
- Responsive design with print controls hidden
- Secure data fetching with school_id validation

#### 6. **Report Card Detail API** (`app/api/school/reports/report-cards/detail/route.ts`)
- Fetches complete report card data for rendering
- Queries:
  - Schools table for branding
  - Students for basic info
  - Enrollments for class assignment
  - Streams for class teacher
  - Grade entries for academic performance
  - Attendance for attendance summary
  - Profiles for headteacher signature
- Security: Validates school_id on every query
- Returns `ReportCardData` interface-compatible object

#### 7. **Bulk Validation API** (`app/api/school/reports/report-cards/bulk-validate/route.ts`)
- Validates all students in a class/stream have complete data
- Checks for:
  - Report card existence
  - Total score, average score, letter grade
  - Grade entries for all subjects
  - Attendance records
- Returns detailed missing requirements per student
- Prevents bulk generation of incomplete reports

#### 8. **Bulk Generation API** (`app/api/school/reports/report-cards/bulk-generate/route.ts`)
- Generates preview URLs for all students in a class/stream
- Returns array of student report URLs
- Each URL follows: `/reports/preview?student_id=X&term_id=Y&academic_year_id=Z`

#### 9. **Bulk Generation Dialog** (`components/reports/bulk-generate-dialog.tsx`)
- Multi-step modal for bulk report generation
- Step 1: Validate - Check all students
- Step 2: Review - Show summary and incomplete students
- Step 3: Generate - Create all report URLs
- Step 4: Complete - Display generated reports with print all option
- Prevents generation if students are incomplete

#### 10. **Report Cards Tab Integration** (`components/reports/report-cards-tab.tsx`)
- Added "Generate All Report Cards" button
- Integrated `BulkGenerateDialog` component
- Button appears when at least one report is completed
- Passes all required context (stream, term, academic year)

## Data Flow

### Individual Report Card
```
User → Report Card Preview Page
  ↓
Fetch Query Parameters (student_id, term_id, academic_year_id)
  ↓
Call /api/school/reports/report-cards/detail
  ↓
API queries all related tables with school_id validation
  ↓
Return ReportCardData object
  ↓
Render ProfessionalReportCard component
  ↓
User can: View → Print → Download PDF
```

### Bulk Report Card Generation
```
User → Report Cards Tab → "Generate All Report Cards" button
  ↓
BulkGenerateDialog opens
  ↓
Step 1: POST /api/school/reports/report-cards/bulk-validate
  ↓
API returns student completion status
  ↓
Step 2: User reviews completion summary
  ↓
Step 3: POST /api/school/reports/report-cards/bulk-generate
  ↓
API generates preview URLs for all students
  ↓
Step 4: Display generated reports
  ↓
User can: View Individual → Print All → Download Individual PDFs
```

## Security Implementation

### School-Level Isolation
- Every API endpoint validates `school_id` from authenticated session
- Never trust `school_id` from request parameters
- All queries filtered by `school_id` at database level
- RLS policies enforced by Supabase

### Role-Based Access
- **Admin Only**:
  - Upload/update school logo
  - Upload/update headteacher signature
  - Generate/access all report cards
- **Teachers**:
  - Access only their assigned classes
  - Can view but not modify report cards
  - Existing authorization system respected
- **No Cross-School Access**:
  - Users from School A cannot access School B's data
  - Storage paths include school context

### Signature Security
- Signatures stored in `profiles.signature_url`
- Only admin user can update own signature
- Signature automatically retrieved from admin profile when rendering
- Teachers cannot upload or modify signatures

### Storage Security
- Public bucket (`school-logos`) for logos and signatures
- File paths include school and timestamp for uniqueness
- Supabase Storage policies enforce access control
- Uploaded files validated for type and size

## Database Usage

### Existing Tables Utilized
- **schools**: name, logo_url, address, phone, email, website, principal_name
- **profiles**: first_name, last_name, signature_url (for admin/headteacher)
- **school_class_streams**: class_teacher_id, school_class_id
- **report_cards**: total_score, average_score, letter_grade, ranking, class_size, teacher_comment, generated_at
- **grade_entries**: score, grade (linked to subjects)
- **students**: first_name, last_name, admission_number
- **student_enrollments**: class_id, academic_year_id, status
- **attendance_records**: status (present/absent/leave)
- **terms**: type
- **academic_years**: name

### No New Tables Created
- Reused existing `profiles.signature_url` field
- Reused existing `schools.logo_url` field
- No duplicate fields added
- Architecture fully compatible with existing schema

## Configuration

### Environment Variables (Already Set)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role for server-side operations

### Storage Buckets (Existing)
- `school-logos` - Public bucket for logos and signatures
- `report-card-pdfs` - Private bucket for generated PDFs (future)

## Usage Workflow

### For School Admin

#### Upload School Logo
1. Navigate to **Settings**
2. Scroll to **School Logo** section
3. Click upload area or drag-drop logo
4. Preview appears before save
5. Logo automatically updated in all future reports

#### Upload Headteacher Signature
1. Navigate to **Settings**
2. Scroll to **Headteacher Signature** section
3. Upload clear signature image
4. Preview signature before save
5. Signature automatically appears on all report cards

#### View Individual Report Card
1. Navigate to **Reports** → **Report Cards**
2. Click "Create" or "Edit" for a student
3. Verify/create report card data
4. Click "Preview" to see professional layout
5. Use "Print" button or "Download PDF" button

#### Generate All Report Cards for a Class
1. Navigate to **Reports** → **Report Cards**
2. Ensure target students have completed reports
3. Click **"Generate All Report Cards"** button
4. System validates all students
5. Review completion summary
6. Click "Generate" to create all reports
7. System shows all report URLs
8. Click "Print All" to open all reports, then use browser print dialog
9. Or view individual reports by clicking "View" link

## Acceptance Criteria - Verification Checklist

- [x] Admin can upload school logo from Settings
- [x] Uploaded logo saved using schools.logo_url
- [x] Logo appears in report card preview
- [x] Admin can upload headteacher signature
- [x] Signature stored using profiles.signature_url
- [x] Admin can replace/remove signature
- [x] Headteacher signature auto-appears on report cards
- [x] Teacher signatures do NOT appear
- [x] Class teacher name auto-appears on reports
- [x] Class teacher resolved through school_class_streams.class_teacher_id
- [x] School name/contact details auto-appear
- [x] Report card has professional A4 layout
- [x] Report card is print-ready
- [x] Individual PDF generation works (via print-to-PDF)
- [x] Individual printing works
- [x] Bulk report generation works
- [x] Bulk reports start one per page
- [x] Bulk generation verifies completion before generating
- [x] Incomplete students clearly identified
- [x] Existing grade completion logic continues to work
- [x] Existing attendance logic continues to work
- [x] Existing authentication continues to work
- [x] RLS/security remains intact
- [x] No cross-school data leakage possible
- [x] No duplicate schema fields introduced
- [x] Existing working features remain functional
- [x] Build successful with 0 TypeScript errors
- [x] All new routes properly typed

## Technical Details

### Print CSS
- Uses `@media print` queries for print optimization
- Hides UI controls when printing
- Maintains margins for A4 paper
- Ensures logo and signature print clearly
- Prevents awkward page breaks

### Performance Considerations
- Report card data fetched server-side with service role
- All queries include school_id filters for security
- Bulk generation validates before generating (prevents wasted requests)
- Storage uploads validated client-side before sending
- No N+1 queries in detail API (single queries with joins)

## API Endpoints Summary

| Method | Path | Purpose |
|--------|------|---------|
| PUT | `/api/school/settings/signature` | Update headteacher signature |
| DELETE | `/api/school/settings/signature` | Remove headteacher signature |
| GET | `/api/school/reports/report-cards/detail` | Fetch complete report card data |
| POST | `/api/school/reports/report-cards/bulk-validate` | Validate class completion |
| POST | `/api/school/reports/report-cards/bulk-generate` | Generate bulk report URLs |

## Future Enhancements

1. **PDF Generation Service** - Replace print-to-PDF with server-side PDF generation (use library like html2pdf or puppeteer)
2. **Email Distribution** - Send report cards to parents via email
3. **Report Card Archives** - Save generated PDFs to report-card-pdfs bucket
4. **Digital Signatures** - Add digital signature with timestamp verification
5. **Customizable Templates** - Allow schools to customize report card layout
6. **Multi-Language Support** - Support report cards in multiple languages
7. **Batch Processing** - Queue bulk generation for large schools
8. **Audit Trail** - Log all report card accesses and modifications

## Troubleshooting

### Logo not appearing
- Check schools.logo_url is populated
- Verify Supabase storage URL is accessible
- Check CORS settings if using external CDN

### Signature not appearing
- Verify admin profile has signature_url set
- Check signature file exists in storage
- Ensure admin user is the headteacher

### Report card data missing
- Verify student has active enrollment
- Check grades exist for all subjects
- Verify attendance records exist
- Check report_card record is created

### Bulk generation not showing button
- Ensure at least one student has completed report card
- Check user has admin role
- Refresh page if state is stale

## Support

For issues or questions:
1. Check browser console for detailed errors
2. Check server logs for API errors
3. Verify school_id is correct in session
4. Ensure all required fields are populated in database
