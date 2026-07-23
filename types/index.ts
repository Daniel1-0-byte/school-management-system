/**
 * Central type definitions for the School Management System
 * All entity types are defined here to ensure consistency across the app
 */

// ============================================================================
// SYSTEM ROLES & ENUMS
// ============================================================================

export type SystemRole = 'Admin' | 'Teacher' | 'Accountant' | 'BusCoordinator' | 'Parent';

export enum SchoolStatus {
  PendingVerification = 'pending_verification',
  Active = 'active',
  Suspended = 'suspended',
  Inactive = 'inactive',
}

export enum TermType {
  Term1 = 'term_1',
  Term2 = 'term_2',
  Term3 = 'term_3',
}

export enum GradeType {
  Percentage = 'percentage',
  Letter = 'letter',
  Point = 'point',
}

// ============================================================================
// SCHOOL & ORGANIZATION
// ============================================================================

export interface School {
  id: string;
  name: string;
  slug?: string | null;
  status: SchoolStatus;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  principalName?: string | null;
  principalEmail?: string | null;
  studentCapacity?: number | null;
  foundedYear?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Term {
  id: string;
  schoolId: string;
  academicYearId: string;
  type: TermType;
  startDate: string;
  endDate: string;
  reportCardDeadline?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

export interface Profile {
  id: string; // Matches auth.users.id (Supabase convention)
  schoolId: string;
  systemRole: SystemRole;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: 'active' | 'invited' | 'inactive';
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherProfile extends Profile {
  systemRole: 'Teacher';
  employeeId?: string | null;
  department?: string | null;
  qualifications?: string | null;
}

export interface ParentProfile extends Profile {
  systemRole: 'Parent';
  relationship?: string | null; // 'mother', 'father', 'guardian', etc.
}

export interface User {
  id: string;
  email: string;
  profile: Profile;
}

// ============================================================================
// STUDENT & GUARDIAN
// ============================================================================

export interface Student {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  admissionNumber?: string | null;
  status: 'active' | 'inactive' | 'graduated';
  currentClassName?: string | null;
  currentClassId?: string | null;
  currentStreamId?: string | null; // Phase 3: Stream ID
  currentStreamName?: string | null; // Phase 3: Stream name
  parentalStatus?: string | null;
  medicalNotes?: string | null;
  allergies?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Guardian {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  relationship: string; // 'mother', 'father', 'guardian', 'uncle', etc.
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  studentIds: string[]; // Multiple students can have same guardian
  createdAt: string;
  updatedAt: string;
}

export interface PickupPerson {
  id: string;
  schoolId: string;
  guardianId: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ACADEMIC - CLASSES & ASSIGNMENTS
// ============================================================================

export interface SchoolClass {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string; // e.g., "Form 1A", "JSS 2B"
  level: string; // e.g., "form-1", "jss-2"
  capacity?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAssignment {
  id: string;
  schoolId: string;
  teacherId: string; // Profile.id
  classId: string;
  academicYearId: string;
  subjects: string[]; // e.g., ["Mathematics", "English"]
  isPrimaryTeacher: boolean;
  startDate: string;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentEnrollment {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  academicYearId: string;
  enrollmentDate: string;
  status: 'active' | 'transferred' | 'withdrawn';
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ACADEMICS - GRADES & ASSESSMENTS
// ============================================================================

export interface Subject {
  id: string;
  schoolId: string;
  name: string;
  code?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GradeEntry {
  id: string;
  schoolId: string;
  studentId: string;
  termId: string;
  subjectId: string;
  teacherId: string;
  score: number;
  gradeType: GradeType;
  letterGrade?: string | null; // e.g., "A", "B", "C"
  remarks?: string | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportCard {
  id: string;
  schoolId: string;
  studentId: string;
  termId: string;
  academicYearId: string;
  totalScore?: number | null;
  averageScore?: number | null;
  letterGrade?: string | null;
  ranking?: number | null;
  classSize?: number | null;
  teacherComment?: string | null;
  principalSignature?: boolean;
  generatedAt: string;
  pdfUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ATTENDANCE
// ============================================================================

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string | null;
  recordedBy: string; // Profile.id
  createdAt: string;
  updatedAt: string;
}

export interface ClassAttendanceSummary {
  studentId: string;
  studentName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercentage: number;
}

// ============================================================================
// FEES & INVOICING
// ============================================================================

export interface FeeStructure {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId?: string | null;
  name: string; // e.g., "Tuition Fee", "Development Fee"
  amount: number;
  dueDate: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFeeInvoice {
  id: string;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  termId?: string | null;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  dueDate: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export interface FeePayment {
  id: string;
  schoolId: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  paymentMethod: string; // 'cash', 'cheque', 'bank_transfer', 'mobile_money'
  referenceNumber?: string | null;
  paymentDate: string;
  recordedBy: string; // Profile.id
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// COMMUNICATION
// ============================================================================

export interface Notice {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  audience: SystemRole[]; // Which roles see this
  createdBy: string; // Profile.id
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PLATFORM ADMINISTRATION
// ============================================================================

export interface PlatformAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'inactive';
  totpSecret?: string | null; // Encrypted TOTP secret for 2FA
  totpEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string | null; // User or PlatformAdmin who performed action
  action: string; // 'created', 'updated', 'deleted', 'impersonation', etc.
  targetType: string; // 'school', 'user', 'student', etc.
  targetId: string;
  targetName?: string | null;
  schoolId?: string | null;
  changes?: Record<string, unknown> | null; // JSON diff of what changed
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

// ============================================================================
// API RESPONSES & REQUEST BODIES
// ============================================================================

export interface SignupRequest {
  schoolName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  tosAgreed: boolean;
  captchaToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface PlatformAdminLoginRequest {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface TwoFactorVerifyRequest {
  code: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
