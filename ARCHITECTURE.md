# SchoolHub Architecture

## Project Structure

```
.
├── app/                           # Next.js App Router directory
│   ├── layout.tsx                 # Root layout with global styles
│   ├── page.tsx                   # Landing page (public, no auth)
│   ├── api/                       # API routes and server actions
│   │   ├── auth/                  # Authentication routes
│   │   │   ├── login/route.ts     # School user login
│   │   │   ├── signup/route.ts    # School registration
│   │   │   ├── logout/route.ts    # Logout handler
│   │   │   └── session/route.ts   # Session check
│   │   ├── captcha/               # reCAPTCHA verification
│   │   │   └── verify/route.ts
│   │   └── platform-admin/        # Platform admin routes
│   │       ├── login/route.ts     # Platform admin login
│   │       └── verify-2fa/route.ts# 2FA verification
│   ├── login/                     # School user login page
│   │   ├── page.tsx               # Client component form
│   │   └── layout.tsx             # Server wrapper
│   ├── signup/                    # School registration
│   │   ├── page.tsx               # Client component form
│   │   └── layout.tsx             # Server wrapper
│   ├── dashboard/                 # Main school dashboard (auth required)
│   │   └── page.tsx               # Dashboard home
│   ├── platform-admin-login/      # Platform admin login
│   │   ├── page.tsx               # Client component form
│   │   └── layout.tsx             # Server wrapper
│   ├── terms/                     # Public terms of service
│   │   └── page.tsx
│   └── privacy/                   # Public privacy policy
│       └── page.tsx
├── components/
│   └── InitialsAvatar.tsx         # Reusable initials avatar component
├── lib/
│   ├── supabase.ts                # Supabase client instances
│   ├── database.types.ts          # Auto-generated DB types (placeholder)
│   ├── env.ts                     # Environment variable validation
│   ├── auth-utils.ts              # Authentication utilities
│   ├── schemas.ts                 # Zod validation schemas
│   └── globals.d.ts               # Global type definitions
├── types/
│   └── index.ts                   # Core TypeScript interfaces
├── middleware.ts                  # Next.js middleware (route protection)
├── public/
│   └── robots.txt                 # SEO: Disallow /platform-admin
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Database schema
├── .env.example                   # Environment variable template
├── README.md                       # Project overview
├── DEPLOYMENT.md                  # Step-by-step deployment guide
├── ARCHITECTURE.md                # This file
├── tsconfig.json                  # TypeScript configuration (strict mode)
└── package.json                   # Dependencies and scripts
```

## Core Concepts

### Authentication Flow

#### School Users (Admin, Teacher, Parent, etc.)
1. User visits `/login` or `/signup`
2. Form validates input with Zod schema
3. API route calls Supabase Auth (`signUp()` or `signInWithPassword()`)
4. On success, auth session is stored in cookie
5. User is redirected to `/dashboard`
6. On subsequent requests, middleware checks session cookie

#### Platform Admins
1. User visits `/platform-admin-login`
2. Form validates email + password
3. API route queries `platform_admins` table and validates credentials
4. If valid, generates temporary session token and redirects to 2FA page
5. User enters TOTP code (format: 6 digits)
6. API route verifies TOTP code
7. On success, sets `platform-admin-token` cookie
8. Middleware allows access to `/platform-admin/*` routes

### Database Architecture

#### Tables Overview

**schools**
- Core school information (name, status, logo URL)
- References: auth.users (admin), academic_years, terms

**profiles** (extends auth.users)
- Extended user information (firstName, lastName, phone)
- Tracks `systemRole` (Admin, Teacher, Accountant, BusCoordinator, Parent)
- Links users to their school

**students**
- Student records per school
- References: schools, classes, academic_years

**teachers**
- Teacher/staff records per school
- References: schools, subjects, classes

**platform_admins**
- Super admin accounts (completely separate from school users)
- TOTP 2FA secret storage
- Never linked to school data

**audit_log**
- Immutable log of sensitive actions
- Fields: actor_id, action, target_id, target_type, timestamp, ip_address, details

#### Important Design Decisions

1. **No Photo Upload for People**: Students, Teachers, and Parents have no photo fields. Only InitialsAvatar is used.
2. **School Logos Only**: Supabase Storage is used only for school logos (school-logos bucket) and PDFs.
3. **Separate Admin Tables**: Platform admins use completely separate `platform_admins` table, not `profiles`.
4. **TypeScript Throughout**: All code, including types from database schemas, is strongly typed.
5. **No Photo Migration Issues**: Since photos are never stored, deployment is simpler and RLS doesn't need to handle photo access.

### Middleware & Route Protection

**middleware.ts**
- Checks if request is to `/platform-admin/*` routes
- Verifies `platform-admin-token` cookie exists
- Redirects to `/platform-admin-login` if missing
- Does NOT verify school user sessions (that's done in client components)

### Types System

**types/index.ts** contains all core entity types:
```typescript
interface School { id, name, email, phone, status, logoUrl, createdAt }
interface Profile { id, schoolId, systemRole, firstName, lastName, phone }
interface Student { id, schoolId, firstName, lastName, admissionNumber }
interface Teacher { id, schoolId, firstName, lastName, email, phone, subjects }
interface PlatformAdmin { id, userId, email, totpSecret, verified2fa }
// ... etc
```

These are imported wherever needed, preventing type duplication and ensuring consistency.

### API Route Pattern

Standard error handling and typing:

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Profile } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate with Zod
    const validated = exampleSchema.parse(body);
    
    // Initialize typed Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Type-safe query
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', validated.userId)
      .single();
    
    if (error) throw new Error(error.message);
    
    // Type inference: data is Profile | null
    const profile: Profile | null = data;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
```

### Schema Validation

All forms use Zod for both client and server validation:

```typescript
// lib/schemas.ts
export const signupSchema = z.object({
  schoolName: z.string().min(3),
  fullName: z.string().min(2),
  email: z.string().email(),
  // ... etc
});

export type SignupFormData = z.infer<typeof signupSchema>;
```

Client validates before submission, server re-validates for security.

### InitialsAvatar Component

Usage:
```tsx
<InitialsAvatar name="John Doe" size="large" />
// Renders: JD in a colored circle
```

Features:
- Deterministic color assignment based on name hash
- No randomization (same person always same color)
- Three sizes: small (24px), medium (40px), large (80px)
- Accessible with proper contrast

## Environment Variables

See `.env.example` for all required variables.

### Build-Time vs Runtime

- `NEXT_PUBLIC_*` variables are available at build time (embedded in bundle)
- Server-only variables (like `SUPABASE_SERVICE_ROLE_KEY`) are only available at runtime
- The app is designed to build successfully even without all env vars set

## Security Considerations

1. **Service Role Key**: Only used in API routes (server-side), never exposed to client
2. **Session Management**: Supabase Auth handles session tokens securely
3. **2FA for Platform Admins**: TOTP-based (time-based one-time password)
4. **reCAPTCHA**: Protects signup and login from bot abuse
5. **Audit Logging**: Every sensitive action is logged with actor, timestamp, and IP
6. **Middleware Protection**: `/platform-admin/*` routes are protected by Next.js middleware
7. **Type Safety**: Strong typing prevents injection attacks and logic errors

## Deployment to Vercel

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy (automatic on push)

The app:
- Uses only serverless functions (no cron jobs or background workers)
- Stores state in Supabase (stateless functions)
- Uses only APIs and server actions (no long-running processes)
- Is fully compatible with Vercel's free tier

## Performance Optimizations

1. **Static Pages**: Landing page, terms, and privacy are pre-rendered
2. **Dynamic Routes**: Dashboard and admin pages use on-demand rendering
3. **Database Queries**: Indexed queries on schoolId, userId, etc.
4. **Image Optimization**: InitialsAvatar renders SVG (no images to load)
5. **Code Splitting**: Client components are code-split automatically

## Testing Strategy

Test these flows manually:

1. **Landing Page**: Load, navigate to signup/login, check Terms/Privacy
2. **School Signup**: Register school, verify email, complete setup wizard
3. **School Login**: Login with registered credentials
4. **Dashboard**: Access dashboard, check role-based display
5. **Platform Admin**: Login with 2FA, access admin dashboard
6. **Logout**: Logout from both school and admin dashboards

## Future Enhancements

1. Email notifications (use Resend for custom emails beyond Supabase Auth)
2. Webhook handlers for event processing
3. Analytics dashboard with charts
4. Student portal features
5. Mobile app using same backend API
6. Advanced filtering and search
7. Bulk import/export functionality
8. SMS notifications for urgent alerts

## Contributing

When adding features:
1. Define types in `types/index.ts`
2. Create Zod schema in `lib/schemas.ts`
3. Add TypeScript to all files (no `any` types)
4. Use existing patterns from current code
5. Test in browser before committing
6. Update docs if adding new features
