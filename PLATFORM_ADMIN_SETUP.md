# Platform Admin Setup Guide

## Creating the Initial Platform Admin

To create your first platform admin account, use the provided setup script.

### Prerequisites

1. **Supabase project** is set up and connected
2. **Database migrations executed** in Supabase (run SQL from `supabase/migrations/001_initial_schema.sql`)
3. **`.env.local` file created** with Supabase credentials ⚠️ REQUIRED

   See **[ENV_SETUP.md](./ENV_SETUP.md)** for detailed instructions on setting up `.env.local`
   
   The script reads from `.env.local`, not from `lib/env.ts`. You must have:
   - `NEXT_PUBLIC_SUPABASE_URL=your_supabase_url`
   - `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`

### Running the Setup Script

#### Using pnpm (recommended)

```bash
pnpm create-admin
```

#### Using npm

```bash
npm run create-admin
```

#### Using npx with tsx

```bash
npx tsx scripts/create-platform-admin.ts
```

### Interactive Prompts

The script will prompt you for:

1. **First name** - Your first name (required)
2. **Last name** - Your last name (required)
3. **Email** - Your email address (default: `danielantwi237@gmail.com`, press Enter to accept or type a different email)
4. **Password** - Your password (hidden input, minimum 8 characters)
5. **Confirm password** - Repeat your password for confirmation

### What the Script Does

1. **Validates environment variables** - Checks that Supabase credentials are available
2. **Checks for duplicates** - Verifies no admin with the same email already exists
3. **Hashes the password** - Uses PBKDF2 with 100,000 iterations for security
4. **Creates the admin** - Inserts the admin into the `platform_admins` table with:
   - `status = 'active'`
   - `totp_enabled = false` (can be enabled later in admin settings)

### Example Session

```
=== Create Platform Admin ===

First name: Daniel
Last name: Antwi
Email (default: danielantwi237@gmail.com): 
Password: ••••••••
Confirm password: ••••••••
Platform admin created successfully.
```

### Error Handling

- **Missing email** → Error: "Invalid email address."
- **Weak password** → Error: "Password must be at least 8 characters long."
- **Mismatched passwords** → Error: "Passwords do not match."
- **Duplicate email** → Message: "A platform admin with this email already exists."
- **Missing environment variables** → Error message with required variables

### Security Notes

- Passwords are never logged or printed
- Password hashes are never displayed
- The script uses Node.js crypto for secure hashing
- All sensitive data is handled securely
- Duplicate emails are prevented in the database

### After Setup

Once the platform admin is created:

1. Go to `/platform-admin-login`
2. Enter your email and password
3. Complete 2FA setup if required
4. Access the platform admin dashboard

### Troubleshooting

**"Error: Missing required environment variables"**
- Create `.env.local` in the project root directory
- Add both required variables (see [ENV_SETUP.md](./ENV_SETUP.md))
- Verify file is saved and not empty
- Restart terminal after creating `.env.local`

**"Failed to check existing admin"**
- Verify database migrations have been run in Supabase
- Check Supabase project is accessible with the Service Role key
- Ensure `platform_admins` table exists

**"Failed to create platform admin"**
- Check internet connection to Supabase
- Verify `platform_admins` table exists with correct columns
- Check that the email hasn't been used before
- Ensure `SUPABASE_SERVICE_ROLE_KEY` has write permissions
