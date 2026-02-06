-- =============================================
-- MIGRATION 002: SEED DATA
-- =============================================
-- Description: Adds sample data after user signup
-- Run this AFTER 001_initial_schema.sql
-- =============================================

-- =============================================
-- HOW TO GET YOUR USER ID
-- =============================================

-- After signing up, run this query to get your user_id:
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Copy the 'id' value and use it below
-- Replace 'YOUR-USER-ID-HERE' with actual UUID

-- =============================================
-- SAMPLE CORS PROXIES
-- =============================================

-- Uncomment and update user_id after signup:

/*
INSERT INTO public.cors_proxies (user_id, name, url, is_active, priority) VALUES
('YOUR-USER-ID-HERE', 'AllOrigins', 'https://api.allorigins.win/raw?url=', true, 1),
('YOUR-USER-ID-HERE', 'CORS Anywhere', 'https://cors-anywhere.herokuapp.com/', true, 2),
('YOUR-USER-ID-HERE', 'ThingProxy', 'https://thingproxy.freeboard.io/fetch/', true, 3),
('YOUR-USER-ID-HERE', 'CORS.SH', 'https://cors.sh/', true, 4),
('YOUR-USER-ID-HERE', 'Corsproxy.io', 'https://corsproxy.io/?', true, 5);
*/

-- =============================================
-- SAMPLE APIS (Optional - for testing)
-- =============================================

-- Uncomment and update user_id:

/*
INSERT INTO public.apis (user_id, name, url, method, headers, body, enabled) VALUES
('YOUR-USER-ID-HERE', 'Test - JSONPlaceholder', 'https://jsonplaceholder.typicode.com/posts/1', 'GET', '{}', '{}', true),
('YOUR-USER-ID-HERE', 'Test - HTTPBin GET', 'https://httpbin.org/get', 'GET', '{}', '{}', true),
('YOUR-USER-ID-HERE', 'Test - HTTPBin POST', 'https://httpbin.org/post', 'POST', '{"Content-Type": "application/json"}', '{"test": "data"}', true);
*/

-- =============================================
-- MIGRATION 002 COMPLETE! ✅
-- =============================================
