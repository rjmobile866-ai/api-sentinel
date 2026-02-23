# 🚀 Self-Hosting Guide - Supabase + Vercel

## 📋 Step-by-Step Migration Guide

---

### Step 1: Supabase Project Create Karo

1. [supabase.com](https://supabase.com) pe jaao aur sign up karo
2. **New Project** create karo
3. Project ban jaaye toh yeh note karo:
   - **Project URL**: Settings > API > Project URL (`https://xxxxx.supabase.co`)
   - **Anon Key**: Settings > API > `anon` public key
   - **Service Role Key**: Settings > API > `service_role` key (yeh secret hai, share mat karo)

---

### Step 2: Database Schema Run Karo

1. Supabase Dashboard me **SQL Editor** kholo (left sidebar)
2. **New Query** click karo
3. `supabase/schema.sql` file ka **PURA content** copy karo
4. SQL Editor me paste karo
5. **RUN** button dabao ▶️
6. ✅ "Success. No rows returned" aayega - yeh sahi hai!

---

### Step 3: Edge Functions Deploy Karo

#### Option A: Supabase CLI se (Recommended)

```bash
# Supabase CLI install karo
npm install -g supabase

# Login karo
supabase login

# Project link karo
supabase link --project-ref YOUR_PROJECT_ID

# Functions deploy karo
supabase functions deploy verify-password
supabase functions deploy hit-api
```

#### Option B: Dashboard se manually

1. Supabase Dashboard > **Edge Functions**
2. **New Function** > name: `verify-password`
3. `supabase/functions/verify-password/index.ts` ka code paste karo
4. Deploy karo
5. Same karo `hit-api` function ke liye

---

### Step 4: Verify Karo Ki Sab Tables Bane

SQL Editor me yeh run karo:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Yeh tables dikhni chahiye:
- ✅ `api_logs`
- ✅ `apis`
- ✅ `cors_proxies`
- ✅ `hit_logs`
- ✅ `profiles`
- ✅ `site_config`
- ✅ `user_passwords`

---

### Step 5: Vercel Pe Deploy Karo

1. GitHub pe apna code push karo
2. [vercel.com](https://vercel.com) pe jaao
3. **New Project** > GitHub repo select karo
4. **Environment Variables** me yeh add karo:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

5. **Deploy** click karo! 🚀

---

### Step 6: Supabase Secrets Set Karo

Edge Functions ke liye secrets chahiye:

```bash
# CLI se
supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Ya Dashboard > Settings > Edge Functions > Secrets me manually add karo.

---

## ⚠️ Important Notes

- **Admin Panel URL**: `/shubh` pe hai (secure URL, koi guess nahi kar payega)
- **Default Admin Password**: `xyzdark6767@@` (pehli baar login ke baad change karo!)
- **Password System**: Har password sirf 1 device/IP pe kaam karega
- **Edge Functions**: `verify-password` aur `hit-api` dono deploy karna zaroori hai

---

## 🔄 Reset Database (DANGER!)

Agar fresh start chahiye toh `schema.sql` dubara run karo - woh pehle sab drop karega phir create karega.

---

## 🆘 Troubleshooting

| Error | Solution |
|-------|----------|
| "relation already exists" | Schema me pehle DROP hai, toh yeh nahi aana chahiye. Agar aaye toh pehle manually tables drop karo |
| "permission denied" | Service role key use karo ya Dashboard SQL Editor se run karo |
| Edge function 404 | Function deploy nahi hua - Step 3 dubara karo |
| CORS error | Edge function me CORS headers check karo |
| Password not working | `site_config` table me `admin_password` row check karo |
