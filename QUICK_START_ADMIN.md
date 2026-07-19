# Quick Start: Create Platform Admin

## 1. Create `.env.local`

In your project root directory:

```bash
cat > .env.local << 'ENVFILE'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ENVFILE
```

Replace the values with your actual Supabase credentials from your Supabase project → Settings → API.

## 2. Run the Setup Script

```bash
pnpm create-admin
```

## 3. Follow the Prompts

- **First name**: Your first name
- **Last name**: Your last name  
- **Email**: (default: danielantwi237@gmail.com, press Enter to use default)
- **Password**: At least 8 characters (hidden input)
- **Confirm password**: Type it again

## 4. Success!

You'll see: `Platform admin created successfully.`

Then go to `/platform-admin-login` and log in.

---

## Common Issues

### "Missing required environment variables"
→ Create `.env.local` with both variables (see Step 1)

### "Invalid email address"
→ Use a valid email format (e.g., user@example.com)

### "Password must be at least 8 characters"
→ Use a stronger password (8+ chars)

### "A platform admin with this email already exists"
→ Use a different email or delete the admin from Supabase and try again

---

For detailed documentation:
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variable setup
- [PLATFORM_ADMIN_SETUP.md](./PLATFORM_ADMIN_SETUP.md) - Full setup guide
