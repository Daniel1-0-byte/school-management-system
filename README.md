# SchoolHub - School Management System

A comprehensive, modern school management platform built with Next.js, TypeScript, and Supabase. Designed to streamline attendance tracking, academic management, fee handling, and school communications.

## 🚀 Features

- **School Management**: Register schools, manage users, setup academic years and terms
- **Student & Teacher Management**: Add students and teachers, assign classes and subjects
- **Attendance Tracking**: Digital attendance marking with reporting
- **Academic System**: Grade entry, report card generation, performance tracking
- **Fee Management**: Invoice generation, payment tracking, financial reports
- **Communication Hub**: Send notices and announcements to stakeholders
- **User Authentication**: Secure email/password signup and login with Supabase Auth
- **Role-Based Access**: Different dashboards for Admins, Teachers, Accountants, and Parents
- **Super Admin Dashboard**: Platform-level administration with 2FA
- **Avatar System**: Deterministic initials-based avatars for all users (no photo uploads)
- **Audit Logging**: Comprehensive audit trail for security and compliance
- **reCAPTCHA Protection**: Form submission protection against bots

## 📋 Technology Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **Storage**: Supabase Storage (School logos, PDFs)
- **Validation**: Zod for schema validation
- **UI**: Tailwind CSS + shadcn/ui components
- **Icons**: Lucide React
- **Security**: Google reCAPTCHA v2/v3
- **2FA**: TOTP via otplib

## 📍 Access Summary

| User Type | Login URL | Initial Setup | Dashboard |
|-----------|-----------|---------------|-----------|
| **School Admin** | `/login` | `/signup` (self-register) | `/dashboard` |
| **Teacher/Staff** | `/login` | Invited by Admin via email | `/dashboard` |
| **Parent/Guardian** | `/login` | Self-register with code or invited | `/dashboard` |
| **Accountant** | `/login` | Invited by Admin via email | `/dashboard` |
| **Bus Coordinator** | `/login` | Invited by Admin via email | `/dashboard` |
| **Platform Admin** | `/platform-admin-login` | Invite-only (set via SQL) | `/platform-admin` |

## 🛠️ Setup & Deployment

### Prerequisites

- Node.js 18+
- pnpm, npm, or yarn
- Supabase account and project
- Google reCAPTCHA keys

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - Google reCAPTCHA site key
- `RECAPTCHA_SECRET_KEY` - Google reCAPTCHA secret key
- `NEXT_PUBLIC_APP_URL` - Your application URL

### Quick Start

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase and reCAPTCHA keys
   ```

3. **Run database migrations**
   - Execute SQL from `supabase/migrations/001_initial_schema.sql` in Supabase dashboard

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. **Access the application**
   - Landing page: http://localhost:3000
   - School signup: http://localhost:3000/signup
   - School login: http://localhost:3000/login
   - Platform admin login: http://localhost:3000/platform-admin-login

### Full Deployment Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions on setting up Supabase, configuring environment variables, and deploying to Vercel.
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - Google reCAPTCHA site key
- `RECAPTCHA_SECRET_KEY` - Google reCAPTCHA secret key
- `NEXT_PUBLIC_APP_URL` - Your app URL (http://localhost:3000 for dev)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000 in your browser
```

### Database Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the migrations from `supabase/migrations/001_initial_schema.sql`
3. Set up storage buckets:
   - `school-logos` (public)
   - `report-card-pdfs` (private)

### Deployment on Vercel

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Add environment variables in Vercel project settings
4. Deploy!

```bash
vercel deploy
```

## 📁 Project Structure

```
.
├── app/                           # Next.js app directory
│   ├── (platform-admin)/          # Super admin routes (route group)
│   │   └── login/                 # Platform admin login
│   ├── api/                       # API routes
│   │   ├── auth/                  # Authentication routes
│   │   │   ├── signup/            # School registration
│   │   │   ├── login/             # User login
│   │   │   ├── logout/            # Logout
│   │   │   └── session/           # Session check
│   │   ├── captcha/               # CAPTCHA verification
│   │   └── platform-admin/        # Platform admin APIs
│   │       ├── login/             # Super admin login
│   │       └── verify-2fa/        # 2FA verification
│   ├── dashboard/                 # Main school dashboard
│   ├── login/                     # School user login
│   ├── signup/                    # School registration
│   ├── terms/                     # Terms of Service
│   ├── privacy/                   # Privacy Policy
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   └── globals.css                # Global styles
├── components/
│   └── InitialsAvatar.tsx         # Reusable avatar component
├── lib/
│   ├── supabase.ts                # Supabase client setup
│   ├── database.types.ts          # Generated database types
│   ├── env.ts                     # Environment variable validation
│   ├── schemas.ts                 # Zod validation schemas
│   └── auth-utils.ts              # Authentication utilities
├── types/
│   └── index.ts                   # Central TypeScript interfaces
├── middleware.ts                  # Next.js middleware
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Database schema
├── public/
│   └── robots.txt                 # SEO: Disallow /platform-admin
├── tsconfig.json                  # TypeScript config (strict: true)
└── README.md                      # This file
```

## 🔐 Security Features

- **SQL Injection Prevention**: Parameterized queries via Supabase client
- **CSRF Protection**: Built-in Next.js protection
- **Rate Limiting**: IP-based rate limiting for signup/login
- **CAPTCHA**: Google reCAPTCHA v2/v3 for form submission
- **2FA**: TOTP-based two-factor authentication for super admins
- **Row Level Security**: Supabase RLS policies on sensitive tables
- **Password Security**: Supabase Auth handles bcrypt hashing
- **Session Management**: Secure, HTTP-only auth cookies

## 📊 Data Model

### Core Entities

- **School**: Organization information, logo, status
- **Profile**: Extended user info (role, school, phone)
- **Student**: Pupil information with no photo uploads
- **Teacher**: Staff with assignments to classes
- **Guardian**: Parent/guardian contact details
- **AcademicYear**: School year configuration
- **Term**: Term within academic year
- **Class**: Student grouping (e.g., Form 1A)
- **Subject**: Academic subject
- **GradeEntry**: Student score in a subject for a term
- **ReportCard**: Generated term report for a student
- **AttendanceRecord**: Daily attendance tracking
- **PlatformAdmin**: Super admin user for platform
- **AuditLog**: All sensitive actions logged

## 🎯 Access Summary

| Route | Access | Role | Purpose |
|-------|--------|------|---------|
| `/` | Public | Anonymous | Landing page |
| `/login` | Public | Anonymous | School user login |
| `/signup` | Public | Anonymous | School registration |
| `/dashboard/*` | Protected | All school roles | Main dashboard |
| `/platform-admin/login` | Public | Anonymous | Super admin login |
| `/platform-admin/*` | Protected | Platform Admin only | Super admin area |
| `/terms` | Public | Anonymous | Terms of Service |
| `/privacy` | Public | Anonymous | Privacy Policy |
| `robots.txt` | Public | Anonymous | SEO (disallows /platform-admin) |

## 🔑 Key API Routes

### Authentication
- `POST /api/auth/signup` - School registration
- `POST /api/auth/login` - School user login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Check current session
- `POST /api/captcha/verify` - Verify CAPTCHA token

### Platform Admin
- `POST /api/platform-admin/login` - Super admin login
- `POST /api/platform-admin/verify-2fa` - Verify 2FA code

## 🧪 Testing

```bash
# Type checking
pnpm tsc

# Linting
pnpm lint

# Build
pnpm build

# Start production server
pnpm start
```

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Dark Theme**: Modern dark color scheme
- **Initials Avatars**: Deterministic colored circles with user initials
- **Form Validation**: Client and server-side validation
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during async operations
- **Accessibility**: Semantic HTML, ARIA labels

## 📝 TypeScript Strictness

- `strict: true` enabled in `tsconfig.json`
- All entity types defined in `types/index.ts`
- No use of `any` type
- Proper type exports for all modules

## 🚀 Deployment Checklist

- [ ] All environment variables configured in Vercel
- [ ] Supabase database migrations applied
- [ ] Storage buckets created (school-logos, report-card-pdfs)
- [ ] RLS policies enabled on sensitive tables
- [ ] Google reCAPTCHA keys obtained
- [ ] robots.txt configured (disallowing /platform-admin)
- [ ] Build succeeds: `pnpm build`
- [ ] No TypeScript errors: `pnpm tsc`
- [ ] Test login flow with test account
- [ ] Test super admin login with 2FA

## 📞 Support & Troubleshooting

### Common Issues

**"Supabase configuration missing"**
- Check that all required env vars are set in `.env.local`
- Verify URLs have correct protocol (https://)

**"CAPTCHA verification failed"**
- Ensure reCAPTCHA site key matches in HTML
- Check secret key is correct on backend
- Verify domain is added to reCAPTCHA allowed list

**"Session not found"**
- Check that auth cookies are being set
- Verify SUPABASE_ANON_KEY is correct
- Clear browser cookies and try again

**"Super admin login not working"**
- Ensure platform_admins table has records
- Check TOTP secret is stored and matches
- Verify IP address is not rate limited

## 📖 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)

## 📄 License

This project is built for school management and is provided as-is. Customize and deploy according to your needs.

---

**Built with ❤️ for efficient school management**
