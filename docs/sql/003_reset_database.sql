-- =============================================
-- MIGRATION 003: RESET DATABASE (DANGER!)
-- =============================================
-- ⚠️ WARNING: Yeh script SARI DATA DELETE kar degi!
-- Sirf tab use karo jab fresh start chahiye
-- =============================================

-- =============================================
-- 1. DROP TRIGGERS FIRST
-- =============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_apis_updated_at ON public.apis;

-- =============================================
-- 2. DROP FUNCTIONS
-- =============================================

DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;

-- =============================================
-- 3. DROP TABLES (Order matters due to foreign keys)
-- =============================================

-- Drop api_logs first (has foreign key to apis)
DROP TABLE IF EXISTS public.api_logs CASCADE;

-- Drop other tables
DROP TABLE IF EXISTS public.apis CASCADE;
DROP TABLE IF EXISTS public.cors_proxies CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =============================================
-- 4. VERIFY CLEANUP
-- =============================================

-- Run this to verify all tables are gone:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- =============================================
-- RESET COMPLETE! ✅
-- Ab 001_initial_schema.sql dubara run karo
-- =============================================
