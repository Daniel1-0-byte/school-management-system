# Platform Admin Dashboard Documentation

## Overview

The Platform Admin Dashboard provides a comprehensive interface for system administrators to manage the SchoolHub platform. It includes statistics overview, school management, user administration, audit logs, and system settings.

## Authentication & Access

### Login Flow
1. Navigate to `/platform-admin-login`
2. Enter platform admin credentials (email & password)
3. reCAPTCHA verification (if enabled)
4. If 2FA is enabled, enter 6-digit TOTP code
5. Successful login redirects to `/platform-admin`

### Session Management
- Sessions stored in `platform_admin_sessions` table
- Default expiration: 8 hours
- Token stored in secure `platform-admin-token` cookie
- Middleware validates all requests to `/platform-admin/*` routes
- Expired sessions automatically cleaned up

### Logout
- Click "Logout" button in sidebar
- Session invalidated in database
- Cookie cleared
- Redirects to `/platform-admin-login`

## Dashboard Pages

### 1. Main Dashboard (`/platform-admin`)

**Components:**
- Statistics Grid: Shows total schools, users, recent activities, and system health
- Recent Activity Feed: Displays last 10 audit log entries
- System Health: Shows status of database, API, and authentication services
- Quick Actions: Buttons to navigate to key management sections

**Data Sources:**
- `schools` table - counts active institutions
- `users` table - counts total user accounts
- `audit_logs` table - fetches recent activity (last 7 days)

**Features:**
- Real-time data loading via Server Components
- Responsive grid layout (1 col mobile, 2 col tablet, 4 col desktop)
- Color-coded statistics cards (default, success, warning, danger variants)
- Trend indicators (percentage change)

### 2. Schools Management (`/platform-admin/schools`)

**Features:**
- View all schools in system
- Search schools by name
- Display school details: name, address, phone number
- Quick action buttons (add, edit, delete)
- Responsive table with pagination (future)

**Columns:**
- School Name
- Address
- Phone Number
- Date Added
- Actions

**Data Source:** `schools` table

### 3. Users Management (`/platform-admin/users`)

**Features:**
- View all users in system
- Search by email or name
- Display user details with profile avatar
- Role-based badges (admin, teacher, parent, etc.)
- Sort by join date

**Columns:**
- Name (with avatar initials)
- Email
- Role (with color-coded badge)
- Join Date
- Actions

**Role Badge Colors:**
- Admin: Purple
- Teacher: Blue
- Parent: Green
- Other: Gray

**Data Source:** `users` table

### 4. Audit Logs (`/platform-admin/audit-logs`)

**Features:**
- Complete system activity log
- Search by actor ID or IP address
- Filter by action type (future)
- Export logs (future)
- Visual action indicators

**Columns:**
- Action (with icon)
- Target Type
- Actor ID (shortened)
- IP Address
- Timestamp

**Action Icons:**
- Login Success: Green checkmark
- Login Failed: Red alert
- Logout: Blue arrow
- 2FA: Purple shield
- Other: Gray clock

**Data Sources:**
- `audit_logs` table
- Displays last 100 entries
- Orders by most recent first

### 5. Settings (`/platform-admin/settings`)

**Sections:**

#### General Settings
- Platform Name (editable)
- Maintenance Mode (toggle)

#### Security Settings
- Require 2FA (toggle)
- Session Timeout (1-24 hours)

#### Notifications
- Email Notifications (toggle)

#### System Information
- Version
- API Version
- Environment (Production/Development)

**Note:** Settings page is currently UI-only. Backend persistence not implemented yet.

## Components

### StatCard
Reusable statistic display component

```tsx
<StatCard
  title="Total Schools"
  value={42}
  icon={<School className="w-6 h-6" />}
  description="Active institutions"
  trend={5}
  variant="default"
/>
```

**Props:**
- `title: string` - Card heading
- `value: string | number` - Main statistic
- `icon: React.ReactNode` - Icon to display
- `description: string` - Subtitle
- `trend?: number` - Percentage change (positive/negative)
- `variant?: 'default' | 'success' | 'warning' | 'danger'` - Color scheme

### RecentActivity
Displays audit log entries with formatting

```tsx
<RecentActivity logs={auditLogs} />
```

**Props:**
- `logs: AuditLog[]` - Array of audit log entries

**Features:**
- Auto-formats timestamps ("2 hours ago")
- Visual action icons
- Truncated actor IDs and IP addresses
- Hover effects

### SystemHealth
Shows status of critical system components

```tsx
<SystemHealth />
```

**Components:**
- Database connection status
- API Gateway status
- Authentication service status

## Layout Structure

### Sidebar Navigation
- Logo and branding
- Primary navigation items
- Logout button
- Fixed on desktop, hamburger menu on mobile

### Top Bar (Desktop Only)
- Page title and breadcrumbs
- Admin profile info
- Admin avatar

### Responsive Design
- **Mobile:** Full-height sidebar with overlay, hamburger menu
- **Tablet:** Sidebar with narrower padding
- **Desktop:** Standard two-column layout

## Data Fetching

### Server-Side Rendering
All data pages use Next.js Server Components:
- Async data fetching at build/request time
- Direct Supabase access with service role
- Error handling with console logging
- Empty states when no data found

### Authentication Context
- Admin ID and email passed via middleware headers
- Available in Server Components: `headers().get('x-admin-id')`
- Available in Client Components: Passed as props from server

## Security Considerations

### Authentication
- Session tokens stored in HTTP-only cookies
- Expired sessions automatically deleted
- Failed login attempts logged
- reCAPTCHA protection on login form

### Authorization
- All `/platform-admin/*` routes protected by middleware
- Invalid/expired tokens redirect to login
- Admin info validated on each request

### Audit Logging
- All authentication events logged
- IP addresses recorded
- Failed attempts tracked
- 2FA events recorded

### Data Access
- Supabase service role for admin operations
- No direct client-side database access
- All queries server-side only
- Row-level security on sensitive tables

## File Structure

```
app/(platform-admin)/
├── layout.tsx                 # Shared layout, sidebar, navigation
├── platform-admin/
│   ├── page.tsx               # Main dashboard
│   ├── schools/
│   │   └── page.tsx           # Schools management
│   ├── users/
│   │   └── page.tsx           # Users management
│   ├── audit-logs/
│   │   └── page.tsx           # Audit logs viewer
│   └── settings/
│       └── page.tsx           # Settings page

components/platform-admin/
├── stat-card.tsx              # Statistics card component
├── recent-activity.tsx        # Activity feed component
└── system-health.tsx          # System health indicator
```

## Future Enhancements

### Phase 2
- [ ] School creation/editing/deletion
- [ ] User role management
- [ ] Batch user actions
- [ ] Audit log filtering and export
- [ ] Settings persistence to database
- [ ] Two-factor setup management

### Phase 3
- [ ] Bulk import (schools, users)
- [ ] Email notification templates
- [ ] System backup management
- [ ] Performance analytics
- [ ] Custom reports builder
- [ ] Webhook configuration

### Phase 4
- [ ] Dark mode support
- [ ] Custom dashboard widgets
- [ ] API key management
- [ ] System health alerts
- [ ] Activity charts and trends
- [ ] Multi-language support

## Troubleshooting

### Login Issues
- Verify credentials against `platform_admins` table
- Check reCAPTCHA configuration
- Ensure 2FA token is valid (30-second window)
- Check session hasn't expired (8 hours)

### 404 on Dashboard
- Verify you've logged in successfully
- Check browser cookies for `platform-admin-token`
- Verify token is valid in `platform_admin_sessions` table
- Check middleware.ts is properly configured

### No Data Showing
- Verify Supabase connection
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Verify tables exist and have data
- Check database row-level security policies

### 2FA Not Working
- Verify `totp_secret` is set for the admin account
- Check clock sync between client and server
- Verify TOTP code within 30-second window
- Ensure otplib is properly installed

## API Routes

```
POST /api/platform-admin/login
  Request: { email, password, captchaToken? }
  Response: { success, requiresTwoFactor?, sessionId? }

POST /api/platform-admin/verify-2fa
  Request: { sessionId, code }
  Response: { success }

POST /api/platform-admin/logout
  Response: { success }
```

## Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret
RECAPTCHA_SCORE_THRESHOLD=0.5
```

## Version History

### v1.0.0 (Current)
- Initial dashboard implementation
- Authentication and 2FA
- Statistics overview
- School management UI
- User management UI
- Audit logs viewer
- Settings page
