# RIO METH - API Hit Engine

## Complete Project Prompt

Yeh prompt copy karke Lovable ya kisi bhi AI tool me paste karo - exactly same project ban jayega.

---

## MASTER PROMPT

```
Ek API Hit Engine web application banao jo multiple APIs ko sequentially hit kare OTP testing ke liye.

## Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- React Router v6
- Supabase Edge Functions (backend)
- localStorage (data persistence)
- sonner (toast notifications)

## Theme & Design
Dark cyberpunk/hacker theme:
- Background: #0a0a0a (almost black)
- Primary: Neon Green (#22c55e) 
- Secondary: Cyan (#06b6d4)
- Accent: Purple (#a855f7)
- Destructive: Red (#ef4444)
- Warning: Orange (#f59e0b)

Effects:
- Gradient text (rainbow animation)
- Neon glow shadows on buttons/cards
- Scanline CRT overlay
- Matrix-style animated background
- Blinking terminal cursor

## Pages & Routes

### 1. HomePage "/" (Public)
- Header: Logo, site name, Admin button
- Warning banner (customizable text)
- Logs Panel (scrollable, max 100 logs)
- Quick Hit Engine:
  - Phone number input (validates 10+ digits)
  - Delay slider (0-2000ms range)
  - Continuous looping mode (infinite rounds until stopped)
  - Stats: Round counter, Total Hits, Success (green), Fails (red)
  - Current API indicator (animated pulse)
  - HIT/STOP buttons
- APIs read from localStorage (synced from admin)

### 2. AdminLogin "/admin"
- Centered card with password input
- Master password check against settings
- On success: sessionStorage.setItem('adminAuth', 'true')
- Redirect to /admin/dashboard
- Warning banner

### 3. AdminDashboard "/admin/dashboard" (Protected)
- Check sessionStorage on mount, redirect if not authenticated
- Header with logout button
- Disclaimer banner
- Full Hit Engine:
  - Phone input
  - Delay control (ms)
  - Max Rounds input
  - Free Proxy toggle
  - Stats display
  - START/STOP buttons
- APIs Section:
  - API cards list
  - Add API button (opens dialog)
  - Each card shows: method badge, name, URL, toggles (enabled, proxy, residential proxy), edit/delete buttons
- Logs Panel
- Site Settings Panel (accordion sections)

### 4. NotFound "/*"
- 404 page with back home button

## Data Structures

### API Interface
```typescript
interface Api {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  body: Record<string, unknown>;
  bodyType: 'json' | 'form-urlencoded' | 'multipart' | 'text' | 'none';
  query_params: Record<string, string>;
  enabled: boolean;
  proxy_enabled: boolean;
  force_proxy: boolean;
  rotation_enabled: boolean;
  residential_proxy_enabled: boolean;
}
// Storage: localStorage key 'admin_apis'
```

### Site Settings Interface
```typescript
interface SiteSettings {
  siteName: string;              // "RIO METH"
  adminButtonText: string;       // "ADMIN"
  warningText: string;           // Public page warning
  quickHitTitle: string;         // "QUICK HIT"
  phoneLabel: string;            // "Phone Number"
  phonePlaceholder: string;      // "91XXXXXXXXXX"
  hitButtonText: string;         // "HIT"
  stopButtonText: string;        // "STOP"
  noApisWarning: string;         // "Admin me APIs add karo"
  adminPanelTitle: string;       // "ADMIN PANEL"
  logoutButtonText: string;      // "LOGOUT"
  disclaimerTitle: string;       // "DISCLAIMER"
  disclaimerText: string;        // Disclaimer message
  apiListTitle: string;          // "API List"
  addApiButtonText: string;      // "Add API"
  noApisText: string;            // "No APIs added yet"
  logoUrl: string;               // Logo image URL
  adminPassword: string;         // Default "12345"
  residentialProxyUrl: string;   // "http://user:pass@host:port"
}
// Storage: localStorage key 'site_settings'
```

### Log Interface
```typescript
interface Log {
  id: string;
  api_name: string;
  mode: string;                  // 'SERVER'
  status_code: number | null;
  success: boolean;
  response_time: number | null;
  error_message: string | null;
  created_at: string;
}
// In-memory only, max 100 logs
```

## Core Features

### 1. Placeholder Replacement
- Replace {PHONE} in URL, headers, and body with actual phone number
- Case-insensitive matching
- Recursive replacement in nested objects

### 2. Hit Engine Logic
```
START clicked:
  For round = 1 to maxRounds (or infinite for public):
    For each enabled API:
      - Replace {PHONE} placeholders
      - Build final URL with query params
      - Call Edge Function with all data
      - Update stats (hits, success, fail)
      - Create log entry
      - Wait for delay (ms)
      - Check if stopped
    End For
  End For
```

### 3. Node.js Fetch Code Parser (ApiImporter)
Parse code like:
```javascript
const myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
const body = JSON.stringify({ phone: "{PHONE}" });
fetch("https://api.example.com/otp", {
  method: "POST",
  headers: myHeaders,
  body: body
});
```

Parser extracts:
- URL from fetch() call
- Method from options
- Headers from new Headers() or object
- Body with type detection:
  - JSON.stringify() → bodyType: 'json'
  - new URLSearchParams() → bodyType: 'form-urlencoded'
  - new FormData() → bodyType: 'multipart'
  - String → bodyType: 'text'
- Variable resolution (finds const/let/var definitions)

Headers to remove automatically:
- User-Agent, Cookie, Accept-Encoding, Content-Length
- All sec-* headers (sec-fetch-mode, sec-ch-ua, etc.)
- Host, Connection, Priority, Pragma, Cache-Control

Auto-generate API name from URL path.

### 4. Proxy System

#### Free CORS Proxies (rotation on failure):
```typescript
const FREE_PROXIES = [
  { name: 'allorigins', url: 'https://api.allorigins.win/raw?url=' },
  { name: 'corsproxy', url: 'https://corsproxy.io/?' },
  { name: 'cors-anywhere', url: 'https://cors-anywhere.herokuapp.com/' }
];
```

#### Residential Proxy:
- Per-API toggle (residential_proxy_enabled)
- Global URL in settings (residentialProxyUrl)
- Format: http://username:password@host:port
- Adds Proxy-Authorization header

## Edge Function: hit-api

Location: supabase/functions/hit-api/index.ts

```typescript
// Request
interface HitApiRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  bodyType?: 'json' | 'form-urlencoded' | 'text' | 'none';
  useProxy?: boolean;
  useResidentialProxy?: boolean;
  residentialProxyUrl?: string;
}

// Response
interface HitApiResponse {
  success: boolean;
  status_code: number | null;
  response_time: number;
  response_text?: string;        // First 1000 chars
  error_message?: string;
  proxy_used: string;            // 'direct' | proxy name
}
```

Features:
1. Add browser-like headers automatically:
   - User-Agent: Chrome Windows
   - Accept: application/json, text/plain, */*
   - Accept-Language: en-US,en
   - Origin/Referer from URL
   - Cache-Control: no-cache

2. Body serialization by bodyType:
   - json → JSON.stringify + Content-Type: application/json
   - form-urlencoded → URLSearchParams.toString() + Content-Type: application/x-www-form-urlencoded
   - text → as-is

3. Proxy modes:
   - Direct: No proxy
   - Free Proxy: Try each proxy in order, fallback on failure
   - Residential: Use provided proxy URL with auth

4. CORS headers for browser access

## Components Structure

### Hooks (src/hooks/)
- useApis.ts - CRUD for APIs (localStorage)
- useLogs.ts - In-memory logs management
- useSiteSettings.ts - Settings with defaults
- useProxies.ts - Proxy list (optional)

### Dashboard Components (src/components/dashboard/)
- Header.tsx - Admin header with logout
- DisclaimerBanner.tsx - Warning banner
- HitEngine.tsx - Full admin hit engine
- ApiCard.tsx - Single API display card
- ApiForm.tsx - Add/Edit API dialog
- ApiImporter.tsx - Node.js fetch parser
- LogsPanel.tsx - Logs display
- SiteSettingsPanel.tsx - Settings accordion

### Public Components (src/components/)
- QuickHitEngine.tsx - Simplified public hit engine

## UI Components to Use (shadcn/ui)
- Button, Input, Textarea, Label
- Card, CardHeader, CardContent, CardTitle
- Dialog, DialogContent, DialogHeader, DialogTitle
- Switch, Badge, Separator
- ScrollArea
- Accordion, AccordionItem, AccordionTrigger, AccordionContent
- Select, SelectTrigger, SelectValue, SelectContent, SelectItem
- Tabs (optional)

## Site Settings Panel Sections
1. Logo/Image - URL input with preview
2. Header Texts - Site name, admin button
3. Warning Banner - Warning text, disclaimer
4. Quick Hit Engine - All labels
5. Admin Panel - Panel texts
6. Security - Admin password
7. Residential Proxy - Proxy URL (highlighted purple)

## Mobile Responsive
- Full height layout, no body scroll
- Compact header
- Scrollable logs and API list
- Touch-friendly controls
- 1 column mobile, 2 columns desktop grid

## Authentication Flow
1. User enters password on /admin
2. Compare with settings.adminPassword
3. Success: sessionStorage.setItem('adminAuth', 'true')
4. Redirect to /admin/dashboard
5. Dashboard checks sessionStorage on mount
6. Logout: clear sessionStorage, redirect to /admin

## Important Notes
- All data in localStorage (no database needed for APIs)
- Edge Function handles actual HTTP requests
- {PHONE} placeholder replaced before each request
- Logs are in-memory only (cleared on refresh)
- Admin password default: "12345"
- Continuous mode for public, round-based for admin
```

---

## Usage

1. Copy the entire prompt above
2. Paste in Lovable or any AI coding tool
3. Let it build step by step
4. Test each feature

---

*Yeh prompt exactly same project recreate karega*
