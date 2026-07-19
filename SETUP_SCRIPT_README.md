# Platform Admin Setup Script

## Overview

The `scripts/create-platform-admin.ts` script provides a one-time setup flow to create the initial platform admin user for SchoolHub.

## Quick Start

```bash
# Using pnpm (recommended)
pnpm create-admin

# Using npm
npm run create-admin

# Using npx directly
npx tsx scripts/create-platform-admin.ts
```

## Features

### Security
- Password hashing: PBKDF2 with 100,000 iterations
- Hidden password input during prompts
- Timing-safe password comparison
- No secrets logged or printed
- No password hashes displayed

### Validation
- First name and last name required
- Email format validation
- Duplicate email prevention
- Minimum password length (8 characters)
- Password confirmation matching

### User Interaction
- Interactive command-line prompts
- Email default value provided
- Clear error messages
- Success confirmation only

## Environment Requirements

Before running the script, ensure your `.env.local` or Vercel environment has:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Implementation Details

### File Location
- `scripts/create-platform-admin.ts` - TypeScript setup script

### Dependencies
- `@supabase/supabase-js` - Database access
- `prompt-sync` - Interactive CLI prompts
- `lib/platform-admin-auth.server` - Password hashing

### Database
- Table: `platform_admins`
- Status: `active`
- TOTP: `false` (can be enabled later)

## Usage Flow

1. User runs `pnpm create-admin`
2. Script validates environment variables
3. User enters first name (required)
4. User enters last name (required)
5. User enters email (or accepts default)
6. Script checks for existing admin with that email
7. User enters password (hidden, min 8 chars)
8. User confirms password
9. Script hashes password using PBKDF2
10. Script inserts admin into database
11. Success message displayed

## Error Handling

The script handles:
- Missing environment variables
- Invalid email format
- Weak passwords
- Mismatched passwords
- Duplicate email addresses
- Database connection errors

All errors are reported with clear messages.

## Package.json Integration

The script is registered in `package.json`:

```json
{
  "scripts": {
    "create-admin": "tsx scripts/create-platform-admin.ts"
  },
  "devDependencies": {
    "prompt-sync": "^4.2.0",
    "tsx": "^4.23.1"
  }
}
```

Works with:
- `pnpm create-admin`
- `npm run create-admin`
- `yarn create-admin`
- Direct: `npx tsx scripts/create-platform-admin.ts`

## Security Considerations

### What's NOT Logged
- User passwords
- Password hashes
- Sensitive user input
- API credentials

### What IS Logged
- Operation status messages
- Error messages (without sensitive data)
- Success confirmation

### Password Security
- Minimum 8 characters
- PBKDF2 with SHA-512
- 100,000 iterations
- Unique salt per password
- Timing-safe comparison

## Testing the Script

To verify the script works:

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your_url"
export SUPABASE_SERVICE_ROLE_KEY="your_key"

# Run the script (you'll be prompted for input)
pnpm create-admin
```

Follow the interactive prompts and the platform admin will be created.

## Post-Setup

After creating the admin account:

1. Navigate to `/platform-admin-login`
2. Enter your email and password
3. Complete any additional 2FA setup
4. Access the platform admin dashboard

## Troubleshooting

**Error: "Missing required environment variables"**
- Ensure `.env.local` has both Supabase variables

**Error: "Failed to check existing admin"**
- Verify database migrations have run
- Check Supabase connectivity

**Error: "Invalid email address"**
- Provide a valid email format (user@example.com)

**Message: "A platform admin with this email already exists"**
- This is expected if you run the script twice with the same email
- Use a different email to create another admin or use the existing one to login

## Code Structure

```typescript
// Environment validation
- Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

// Interactive prompts
- First name (required)
- Last name (required)  
- Email (default: danielantwi237@gmail.com)
- Password (hidden, min 8 chars)
- Confirm password (hidden)

// Duplicate check
- Query platform_admins table for existing email

// Password hashing
- Use hashPassword() from platform-admin-auth.server.ts

// Database insert
- Insert into platform_admins table
- Set status='active', totp_enabled=false

// Output
- Success message only (no secrets)
```

## Related Documentation

- [PLATFORM_ADMIN_SETUP.md](./PLATFORM_ADMIN_SETUP.md) - User-facing setup guide
- [PLATFORM_ADMIN_AUTH.md](./PLATFORM_ADMIN_AUTH.md) - Authentication system details
- [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) - Complete setup verification
