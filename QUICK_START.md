# SchoolHub - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Node.js 18+
- pnpm
- Supabase account (free)
- Google reCAPTCHA keys (free)

### 1. Local Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Add your credentials to .env.local:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXT_PUBLIC_RECAPTCHA_SITE_KEY
# - RECAPTCHA_SECRET_KEY
```

### 2. Database Setup

**In Supabase Dashboard:**
1. Go to SQL Editor
2. Create New Query
3. Paste contents of `supabase/migrations/001_initial_schema.sql`
4. Click Run

### 3. Run Locally

```bash
pnpm dev
```

Visit: http://localhost:3000

### 4. Test

| Page | URL | Notes |
|------|-----|-------|
| Landing | http://localhost:3000 | Public |
| Sign Up | http://localhost:3000/signup | School admin |
| Log In | http://localhost:3000/login | All school users |
| Admin Login | http://localhost:3000/platform-admin-login | Super admin |

## 📋 Key Features

| Feature | Status | Location |
|---------|--------|----------|
| Landing Page | ✅ Complete | `/` |
| Public Pages | ✅ Complete | `/terms`, `/privacy` |
| School Signup | ✅ Complete | `/signup` |
| School Login | ✅ Complete | `/login` |
| Dashboard | ✅ Complete | `/dashboard` |
| Platform Admin | ✅ Complete | `/platform-admin-login` |
| 2FA | ✅ Complete | Platform admin login |
| Audit Log | ✅ Schema ready | Database |
| InitialsAvatar | ✅ Complete | `components/InitialsAvatar.tsx` |

## 📁 Important Files

```
Key Files:
├── app/page.tsx                    # Landing page
├── app/signup/page.tsx             # Signup form
├── app/login/page.tsx              # Login form
├── app/dashboard/page.tsx          # Dashboard
├── app/platform-admin-login/page.tsx # Admin login
├── app/api/auth/*                  # Auth API routes
├── app/api/platform-admin/*        # Admin API routes
├── middleware.ts                   # Route protection
├── types/index.ts                  # All types
├── lib/schemas.ts                  # Validation
└── supabase/migrations/001_initial_schema.sql # DB schema
```

## 🔑 Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_key
RECAPTCHA_SECRET_KEY=your_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Deploy to Vercel

```bash
# 1. Push to GitHub
git push origin main

# 2. Go to vercel.com
# 3. Click "Add New" → "Project"
# 4. Select repository
# 5. Add environment variables
# 6. Click Deploy
```

## ✅ Testing Checklist

- [ ] Landing page loads
- [ ] Signup form works
- [ ] Login works with valid credentials
- [ ] Invalid credentials rejected
- [ ] Platform admin login accessible
- [ ] 2FA code entry works
- [ ] Dashboard loads
- [ ] TypeScript: `pnpm tsc --noEmit` passes
- [ ] Build succeeds: `pnpm build`

## 🎯 User Roles

| Role | Login URL | Can Do |
|------|-----------|--------|
| School Admin | `/login` | Manage school, staff, students |
| Teacher | `/login` | Manage grades, attendance |
| Accountant | `/login` | Manage fees, invoices |
| Parent | `/login` | View child's grades, attendance |
| Platform Admin | `/platform-admin-login` | Manage all schools, users, audit log |

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| README.md | Overview & quick start |
| DEPLOYMENT.md | Step-by-step Vercel deployment |
| ARCHITECTURE.md | System design & patterns |
| SETUP_CHECKLIST.md | Detailed setup verification |
| PROJECT_SUMMARY.md | Complete project overview |
| QUICK_START.md | This file |

## 🆘 Troubleshooting

**Build Error?**
```bash
pnpm install
pnpm tsc --noEmit
```

**Env var not working?**
- Restart dev server after changing `.env.local`
- Use `NEXT_PUBLIC_` prefix for client variables

**Database error?**
- Check SQL migrations ran in Supabase
- Verify tables exist in Supabase dashboard

**Login not working?**
- Check Supabase connection keys in `.env.local`
- Verify user created in Supabase Auth
- Check browser console for errors

## 🔗 Useful Links

- Next.js Docs: https://nextjs.org
- Supabase Docs: https://supabase.com/docs
- TypeScript: https://www.typescriptlang.org
- Tailwind CSS: https://tailwindcss.com
- Zod: https://zod.dev

## 📊 Project Stats

- **Total Files**: 30+
- **Lines of Code**: 5000+
- **TypeScript**: 100% of app code
- **API Routes**: 7
- **Database Tables**: 12+
- **Components**: 2 main (+ shadcn/ui)
- **Build Time**: ~6 seconds
- **Bundle Size**: Optimized for Vercel free tier

## ⚡ Next Steps

1. **Customize**: Update branding/colors
2. **Deploy**: Follow DEPLOYMENT.md
3. **Add Data**: Create test schools/users
4. **Extend**: Add more features using existing patterns
5. **Monitor**: Setup error tracking & analytics

## 💡 Tips

- Use TypeScript everywhere (no `any`)
- Run `pnpm tsc --noEmit` before committing
- Check `types/index.ts` for all type definitions
- API routes are in `app/api/`
- Zod schemas are in `lib/schemas.ts`
- Supabase client setup in `lib/supabase.ts`

---

**Ready to go!** 🎉

For more details, see other documentation files in the project root.
