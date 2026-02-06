# 🚀 Complete Supabase Migration Guide

Yeh guide aapko apne Supabase project me complete database setup karne me help karegi.

---

## 📋 Prerequisites (Pehle Yeh Karo)

1. **Supabase Account** - [supabase.com](https://supabase.com) pe sign up karo
2. **New Project Create Karo** - Dashboard me "New Project" click karo
3. **Project Settings Note Karo:**
   - `SUPABASE_URL` - Settings > API > Project URL
   - `SUPABASE_ANON_KEY` - Settings > API > anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` - Settings > API > service_role key (secret)

---

## 📂 Migration Files

Sab migration files `supabase/migrations/` folder me hain. Inhe **ORDER ME** run karo:

| Step | File | Description |
|------|------|-------------|
| 1 | `001_initial_schema.sql` | Tables, RLS, Functions |
| 2 | `002_seed_data.sql` | Default CORS proxies |

---

## 🔧 Step-by-Step Setup

### Step 1: SQL Editor Kholo
1. Supabase Dashboard open karo
2. Left sidebar me **SQL Editor** click karo
3. **New Query** click karo

### Step 2: Schema Migration Run Karo
1. `supabase/migrations/001_initial_schema.sql` file ka content copy karo
2. SQL Editor me paste karo
3. **RUN** button click karo
4. ✅ Success message aana chahiye

### Step 3: Seed Data Add Karo (Optional)
1. `supabase/migrations/002_seed_data.sql` file ka content copy karo
2. SQL Editor me paste karo
3. **RUN** button click karo

### Step 4: Auth Settings Configure Karo
1. **Authentication** > **Providers** > **Email** enable karo
2. **Site URL** set karo: `https://your-domain.com`
3. **Redirect URLs** add karo

---

## 🔐 Environment Variables

Apne project me `.env` file me yeh variables add karo:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

---

## ✅ Verification Checklist

Run karne ke baad verify karo:

- [ ] `profiles` table created
- [ ] `apis` table created
- [ ] `api_logs` table created
- [ ] `cors_proxies` table created
- [ ] RLS enabled on all tables
- [ ] `handle_new_user` function exists
- [ ] `on_auth_user_created` trigger exists

### Verify Tables:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Verify RLS Policies:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## ⚠️ Troubleshooting

### Error: "relation already exists"
Table pehle se hai. Drop karke dubara run karo ya skip karo.

### Error: "permission denied"
Service role key use karo ya Supabase dashboard se run karo.

### Error: "violates row-level security"
User logged in nahi hai ya `user_id` galat hai.

---

## 🔄 Reset Database (DANGER!)

Agar fresh start chahiye:

```sql
-- ⚠️ WARNING: Yeh sab data delete kar dega!
DROP TABLE IF EXISTS public.api_logs CASCADE;
DROP TABLE IF EXISTS public.apis CASCADE;
DROP TABLE IF EXISTS public.cors_proxies CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
```

Phir migrations dubara run karo.

---

## 📱 App Configuration

Supabase client update karo `src/integrations/supabase/client.ts` me:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## 🎉 Done!

Ab aapka Supabase backend ready hai. App me login karo aur APIs add karna start karo!

---

## 📞 Support

Koi issue ho toh:
1. Supabase docs check karo: [supabase.com/docs](https://supabase.com/docs)
2. GitHub issues me report karo
