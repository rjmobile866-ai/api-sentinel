# 🔥 RIO METH - API Hit Engine System

## Complete Project Documentation

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack](#-tech-stack)
3. [Project Structure](#-project-structure)
4. [Features Overview](#-features-overview)
5. [Pages & Routes](#-pages--routes)
6. [Core Components](#-core-components)
7. [Hooks & State Management](#-hooks--state-management)
8. [Edge Functions (Backend)](#-edge-functions-backend)
9. [Database Schema](#-database-schema)
10. [API Importer (Node.js Fetch Parser)](#-api-importer-nodejs-fetch-parser)
11. [Proxy System](#-proxy-system)
12. [Site Settings System](#-site-settings-system)
13. [Authentication System](#-authentication-system)
14. [How Everything Works Together](#-how-everything-works-together)
15. [Prompts for Recreation](#-prompts-for-recreation)

---

## 🎯 Project Overview

**RIO METH** ek API Hit Engine hai jo multiple APIs ko sequentially rounds me hit karta hai. Yeh mainly OTP bombing/testing ke liye design kiya gaya hai.

### Key Features:
- ✅ Unlimited APIs add karo
- ✅ Node.js Fetch snippets se auto-parse karke API import karo
- ✅ Phone number placeholder replacement `{PHONE}`
- ✅ Continuous looping mode (infinite rounds)
- ✅ Free CORS Proxy rotation (allorigins, corsproxy.io, cors-anywhere)
- ✅ Residential Proxy support (Bright Data, Oxylabs, etc.)
- ✅ Real-time logs with success/fail status
- ✅ Admin Panel with password protection
- ✅ Customizable site settings (logo, texts, etc.)

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | Frontend framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | UI component library |
| **React Router v6** | Client-side routing |
| **TanStack React Query** | Data fetching |
| **Supabase** | Backend (Edge Functions) |
| **Deno** | Edge function runtime |
| **localStorage** | Client-side data persistence |
| **sonner** | Toast notifications |

---

## 📁 Project Structure

```
src/
├── App.tsx                           # Main app with routes
├── main.tsx                          # Entry point
├── index.css                         # Global styles + Tailwind
│
├── pages/
│   ├── HomePage.tsx                  # Main public page (/)
│   ├── AdminLogin.tsx                # Admin login (/admin)
│   ├── AdminDashboard.tsx            # Admin panel (/admin/dashboard)
│   └── NotFound.tsx                  # 404 page
│
├── components/
│   ├── QuickHitEngine.tsx            # Public page hit engine
│   ├── NavLink.tsx                   # Navigation component
│   │
│   ├── dashboard/
│   │   ├── Header.tsx                # Admin header
│   │   ├── DisclaimerBanner.tsx      # Warning banner
│   │   ├── HitEngine.tsx             # Admin hit engine (full controls)
│   │   ├── ApiCard.tsx               # Single API card display
│   │   ├── ApiForm.tsx               # Add/Edit API dialog
│   │   ├── ApiImporter.tsx           # Node.js fetch code parser
│   │   ├── LogsPanel.tsx             # Logs display
│   │   └── SiteSettingsPanel.tsx     # Site settings form
│   │
│   └── ui/                           # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       └── ... (50+ components)
│
├── hooks/
│   ├── useApis.ts                    # API CRUD operations
│   ├── useLogs.ts                    # Logs management
│   ├── useProxies.ts                 # Proxy list management
│   └── useSiteSettings.ts            # Site settings management
│
├── contexts/
│   └── AuthContext.tsx               # Supabase auth context
│
├── integrations/
│   └── supabase/
│       ├── client.ts                 # Supabase client
│       └── types.ts                  # Auto-generated types
│
└── lib/
    └── utils.ts                      # Utility functions (cn)

supabase/
├── config.toml                       # Supabase configuration
└── functions/
    └── hit-api/
        └── index.ts                  # Edge function for API calls
```

---

## ✨ Features Overview

### 1. **Quick Hit Engine (Public Page)**
- Phone number input
- Delay slider (0-2000ms)
- Continuous looping mode
- Real-time stats (Rounds, Hits, Success, Fails)
- APIs synced from Admin Panel via localStorage

### 2. **Admin Hit Engine**
- Phone number input
- Delay control
- Max rounds setting
- Free Proxy toggle
- Per-API Residential Proxy toggle
- Full stats display

### 3. **API Management**
- Add/Edit/Delete APIs
- Enable/Disable individual APIs
- Toggle proxy settings per API
- Import from Node.js fetch code

### 4. **Node.js Fetch Auto Parser**
- Paste Node.js fetch code (Reqable compatible)
- Auto-detects: URL, Method, Headers, Body
- Body type detection: JSON, form-urlencoded, multipart, text
- Variable resolution (reads variable definitions)
- Header sanitization (removes unwanted headers)

### 5. **Proxy System**
- **Free CORS Proxies**: allorigins, corsproxy.io, cors-anywhere
- **Residential Proxy**: Premium proxy with authentication

### 6. **Site Settings**
- Logo URL
- Site name
- All text labels customizable
- Admin password
- Residential Proxy URL

---

## 🛣 Pages & Routes

```typescript
// src/App.tsx

<Routes>
  <Route path="/" element={<HomePage />} />           // Public page
  <Route path="/admin" element={<AdminLogin />} />    // Admin login
  <Route path="/admin/dashboard" element={<AdminDashboard />} />  // Admin panel
  <Route path="*" element={<NotFound />} />           // 404
</Routes>
```

### Route Details:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage` | Public Quick Hit Engine |
| `/admin` | `AdminLogin` | Password-protected login |
| `/admin/dashboard` | `AdminDashboard` | Full admin panel |

---

## 🧩 Core Components

### 1. QuickHitEngine.tsx (Public Page)

```typescript
interface QuickHitEngineProps {
  onLogCreate?: (log: LogData) => void;
}

// Features:
// - Reads APIs from localStorage (read-only)
// - Continuous looping (infinite rounds until stopped)
// - Calls Edge Function for each API
// - Phone number placeholder replacement
// - Real-time stats tracking
```

**Key Functions:**
- `hitApiViaEdgeFunction()` - Calls Supabase Edge Function
- `replacePlaceholders()` - Replaces `{PHONE}` in URL/headers/body
- `handleQuickHit()` - Starts continuous loop
- `handleStop()` - Stops the loop

---

### 2. HitEngine.tsx (Admin Panel)

```typescript
interface HitEngineProps {
  apis: Api[];
  proxies: Proxy[];
  onLogCreate: (log: LogData) => void;
}

// Features:
// - Phone input
// - Delay control (ms)
// - Max rounds setting
// - Free Proxy toggle
// - Residential Proxy per API
// - Round-based execution
```

**Key Functions:**
- `startHitting()` - Main loop with max rounds
- `stopHitting()` - Abort and stop
- `hitApiViaEdgeFunction()` - Edge Function call with all options

---

### 3. ApiImporter.tsx (Node.js Fetch Parser)

```typescript
// Parses Node.js fetch code like:
fetch("https://api.example.com/send-otp", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer token"
  },
  body: JSON.stringify({ phone: "{PHONE}" })
});

// Auto-detects:
// - URL extraction
// - Method detection
// - Headers parsing (with sanitization)
// - Body type detection (json, form-urlencoded, multipart, text)
// - Variable resolution (const body = {...})
```

**Body Types Supported:**
| Type | Detection | Content-Type |
|------|-----------|--------------|
| `json` | `JSON.stringify({...})` | `application/json` |
| `form-urlencoded` | `new URLSearchParams()` | `application/x-www-form-urlencoded` |
| `multipart` | `new FormData()` | `multipart/form-data` |
| `text` | Plain string | None |

**Headers Removed Automatically:**
- `User-Agent`
- `Cookie`
- `Accept-Encoding`
- `Content-Length`
- `sec-*` (all security headers)
- `Host`, `Connection`, `Priority`

---

### 4. ApiCard.tsx

```typescript
interface ApiCardProps {
  api: Api;
  onToggle: (id: string, field: string, value: boolean) => void;
  onEdit: (api: Api) => void;
  onDelete: (id: string) => void;
}

// Displays:
// - API name with method badge (GET/POST/etc)
// - URL (truncated)
// - Toggle switches: Enabled, Proxy, Residential Proxy
// - Edit/Delete buttons
```

---

### 5. SiteSettingsPanel.tsx

```typescript
// Accordion sections:
// 1. Logo / Image - Logo URL with preview
// 2. Header Texts - Site name, Admin button text
// 3. Warning Banner - Warning and disclaimer texts
// 4. Quick Hit Engine - All labels and placeholders
// 5. Admin Panel - Panel texts
// 6. Security - Admin password
// 7. Residential Proxy - Proxy URL with credentials
```

---

### 6. LogsPanel.tsx

```typescript
interface Log {
  id: string;
  api_name: string;
  mode: string;           // 'SERVER' or 'SERVER-SIDE'
  status_code: number | null;
  success: boolean;
  response_time: number | null;
  error_message: string | null;
  created_at: string;
}

// Features:
// - Scrollable log list
// - Color-coded (green=success, red=fail)
// - Status code display
// - Response time (ms)
// - Clear button
```

---

## 🪝 Hooks & State Management

### 1. useApis.ts

```typescript
export const useApis = () => {
  const [apis, setApis] = useState<Api[]>([]);
  
  // CRUD Operations (localStorage based)
  const addApi = async (apiData) => {...}
  const updateApi = async (id, updates) => {...}
  const deleteApi = async (id) => {...}
  const toggleApiField = async (id, field, value) => {...}
  
  return { apis, loading, addApi, updateApi, deleteApi, toggleApiField };
};

// Storage Key: 'admin_apis'
```

### 2. useLogs.ts

```typescript
export const useLogs = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  
  const addLog = (logData) => {
    // Prepends new log, keeps max 100
    setLogs(prev => [newLog, ...prev.slice(0, 99)]);
  };
  
  const clearLogs = () => setLogs([]);
  
  return { logs, addLog, clearLogs };
};

// In-memory only (not persisted)
```

### 3. useSiteSettings.ts

```typescript
interface SiteSettings {
  siteName: string;
  adminButtonText: string;
  warningText: string;
  quickHitTitle: string;
  phoneLabel: string;
  phonePlaceholder: string;
  hitButtonText: string;
  stopButtonText: string;
  noApisWarning: string;
  adminPanelTitle: string;
  logoutButtonText: string;
  disclaimerTitle: string;
  disclaimerText: string;
  apiListTitle: string;
  addApiButtonText: string;
  noApisText: string;
  logoUrl: string;
  adminPassword: string;
  residentialProxyUrl: string;
}

// Storage Key: 'site_settings'
// Default password: '12345'
```

---

## ⚡ Edge Functions (Backend)

### hit-api/index.ts

```typescript
// Location: supabase/functions/hit-api/index.ts

// Request Body:
interface HitApiRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  bodyType?: 'json' | 'form-urlencoded' | 'multipart' | 'text' | 'none';
  useProxy?: boolean;
  useResidentialProxy?: boolean;
  residentialProxyUrl?: string;
}

// Response:
interface HitApiResponse {
  success: boolean;
  status_code: number | null;
  response_time: number;
  response_text?: string;          // First 1000 chars
  error_message?: string;
  proxy_used: string;              // 'direct' | 'allorigins' | 'corsproxy' | 'residential'
}

// Free CORS Proxies (rotated on failure):
const FREE_PROXIES = [
  { name: 'allorigins', format: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: 'corsproxy', format: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}` },
  { name: 'cors-anywhere', format: (url) => `https://cors-anywhere.herokuapp.com/${url}` },
];

// Browser-like headers added automatically:
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  'Cache-Control': 'no-cache',
};
```

**Flow:**
1. Receive request
2. Add browser-like headers
3. If `useResidentialProxy=true`: Use residential proxy
4. Else if `useProxy=true`: Try free proxies with fallback
5. Else: Direct request
6. Return response with status, time, and proxy info

---

## 🗃 Database Schema

### Tables (Supabase)

```sql
-- APIs Table (not used in current version - localStorage used instead)
CREATE TABLE apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  headers JSONB DEFAULT '{}',
  body JSONB DEFAULT '{}',
  query_params JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  proxy_enabled BOOLEAN DEFAULT false,
  force_proxy BOOLEAN DEFAULT true,
  rotation_enabled BOOLEAN DEFAULT false,
  residential_proxy_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- API Logs Table
CREATE TABLE api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_id UUID REFERENCES apis(id),
  api_name TEXT NOT NULL,
  mode TEXT NOT NULL,
  status_code INTEGER,
  success BOOLEAN NOT NULL,
  response_time INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CORS Proxies Table
CREATE TABLE cors_proxies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles Table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 📥 API Importer (Node.js Fetch Parser)

### Input Example:

```javascript
const myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("Authorization", "Bearer xyz123");

const body = JSON.stringify({
  "mobile": "{PHONE}",
  "countryCode": "+91"
});

const requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: body,
  redirect: "follow"
};

fetch("https://api.example.com/v1/otp/send", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result));
```

### Parser Output:

```typescript
{
  name: "POST otp send",
  url: "https://api.example.com/v1/otp/send",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer xyz123"
  },
  body: {
    "mobile": "{PHONE}",
    "countryCode": "+91"
  },
  bodyType: "json",
  query_params: {}
}
```

### Parsing Steps:

1. **Extract URL** - Regex for `fetch("url")` or `fetch('url')`
2. **Extract Method** - From options object
3. **Parse Headers** - Handle `new Headers()`, direct object, variable reference
4. **Detect Body Type**:
   - `new URLSearchParams()` → `form-urlencoded`
   - `new FormData()` → `multipart`
   - `JSON.stringify()` → `json`
   - Plain string → `text`
5. **Resolve Variables** - Find and parse variable definitions
6. **Sanitize Headers** - Remove unwanted headers
7. **Generate Name** - From URL path

---

## 🔄 Proxy System

### 1. Free CORS Proxies

```typescript
// Automatically rotated on failure
const FREE_PROXIES = [
  {
    name: 'allorigins',
    format: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  },
  {
    name: 'corsproxy',
    format: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
  },
  {
    name: 'cors-anywhere',
    format: (url) => `https://cors-anywhere.herokuapp.com/${url}`
  }
];

// Usage in Edge Function:
// 1. Try proxy 1 → if fails → try proxy 2 → if fails → try proxy 3
```

### 2. Residential Proxy

```typescript
// Format: http://username:password@host:port

// Configured in: Admin Panel → Site Settings → Residential Proxy

// Per-API toggle: Each API can have `residential_proxy_enabled: true/false`

// When enabled:
// 1. Frontend sends `residentialProxyUrl` to Edge Function
// 2. Edge Function adds `Proxy-Authorization` header
// 3. Request routed through residential proxy
```

**Supported Providers:**
- Bright Data
- Oxylabs
- Smartproxy
- IPRoyal

---

## ⚙ Site Settings System

### Storage Key: `site_settings`

### All Configurable Options:

| Setting | Default | Description |
|---------|---------|-------------|
| `siteName` | "RIO METH" | Site title |
| `adminButtonText` | "ADMIN" | Admin button label |
| `warningText` | "⚠️ Sirf authorized..." | Public page warning |
| `quickHitTitle` | "QUICK HIT" | Engine title |
| `phoneLabel` | "Phone Number" | Input label |
| `phonePlaceholder` | "91XXXXXXXXXX" | Input placeholder |
| `hitButtonText` | "HIT" | Start button text |
| `stopButtonText` | "STOP" | Stop button text |
| `noApisWarning` | "Admin me APIs add karo." | No APIs warning |
| `adminPanelTitle` | "ADMIN PANEL" | Admin header |
| `logoutButtonText` | "LOGOUT" | Logout button |
| `disclaimerTitle` | "⚠️ DISCLAIMER" | Admin disclaimer title |
| `disclaimerText` | "Yeh tool sirf..." | Admin disclaimer |
| `apiListTitle` | "API List" | APIs section title |
| `addApiButtonText` | "Add API" | Add button text |
| `noApisText` | "No APIs added yet" | Empty state text |
| `logoUrl` | "" | Logo image URL |
| `adminPassword` | "12345" | Admin login password |
| `residentialProxyUrl` | "" | Proxy URL with auth |

---

## 🔐 Authentication System

### Admin Authentication Flow:

```
1. User visits /admin
2. AdminLogin page shows password input
3. User enters password
4. Password checked against settings.adminPassword
5. If match: sessionStorage.setItem('adminAuth', 'true')
6. Redirect to /admin/dashboard
7. AdminDashboard checks sessionStorage on mount
8. If not 'true': redirect back to /admin
```

### Session Storage Key: `adminAuth`

### Password Storage: `localStorage` in `site_settings.adminPassword`

---

## 🔄 How Everything Works Together

### Flow Diagram:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   HomePage (/)  │     │  AdminLogin      │     │ AdminDashboard  │
│                 │     │  (/admin)        │     │ (/admin/dash)   │
│  QuickHitEngine │     │                  │     │                 │
│  (read-only)    │     │  Password Check  │────▶│  Full Controls  │
└────────┬────────┘     └──────────────────┘     │  - HitEngine    │
         │                                        │  - ApiForm      │
         │                                        │  - ApiImporter  │
         │                                        │  - Settings     │
         │                                        └────────┬────────┘
         │                                                 │
         │  localStorage                                   │
         │  ('admin_apis')                                 │
         │◀────────────────────────────────────────────────┘
         │
         │  APIs Synced
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Edge Function                            │
│                     (hit-api/index.ts)                          │
│                                                                 │
│  1. Receive request (url, method, headers, body, proxy options) │
│  2. Add browser-like headers                                    │
│  3. Check proxy mode:                                           │
│     - Residential → Use user's proxy                            │
│     - Free Proxy → Try allorigins → corsproxy → cors-anywhere   │
│     - Direct → No proxy                                         │
│  4. Make HTTP request                                           │
│  5. Return: { success, status_code, response_time, proxy_used } │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow:

```
┌──────────────────────────────────────────────────────────────────┐
│                        localStorage                              │
├──────────────────────────────────────────────────────────────────┤
│  admin_apis      →  Array of API configurations                  │
│  site_settings   →  All customizable settings                    │
├──────────────────────────────────────────────────────────────────┤
│                        sessionStorage                            │
├──────────────────────────────────────────────────────────────────┤
│  adminAuth       →  'true' if admin authenticated                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📝 Prompts for Recreation

### Prompt 1: Base Project Setup

```
Create a React + TypeScript + Vite project with Tailwind CSS and shadcn/ui.
Add dark cyberpunk theme with neon colors (green primary, cyan secondary, purple accent).
Include gradient backgrounds, glow effects, and scanline animations.
```

### Prompt 2: API Hit Engine

```
Create an API Hit Engine that:
1. Allows adding unlimited APIs with name, URL, method, headers, body
2. Supports {PHONE} placeholder replacement in URL, headers, and body
3. Hits all enabled APIs sequentially in rounds
4. Shows real-time stats: Hits, Success, Fails, Round counter
5. Has delay control between requests (0-2000ms)
6. Continuous looping mode until manually stopped
7. Calls a Supabase Edge Function to make actual HTTP requests
```

### Prompt 3: Node.js Fetch Parser

```
Create an API Importer that parses Node.js fetch code (Reqable style):
1. Extract URL from fetch() call
2. Detect HTTP method from options
3. Parse headers from new Headers() or object literal
4. Detect body type: JSON.stringify → json, URLSearchParams → form-urlencoded, FormData → multipart
5. Resolve variable references (const body = {...})
6. Remove unwanted headers (User-Agent, Cookie, sec-*, etc.)
7. Auto-generate meaningful API name from URL path
8. Validate and show errors/warnings
```

### Prompt 4: Edge Function

```
Create a Supabase Edge Function (hit-api) that:
1. Accepts: url, method, headers, body, bodyType, useProxy, useResidentialProxy, residentialProxyUrl
2. Adds browser-like headers (User-Agent, Accept, etc.)
3. Supports 3 modes:
   - Direct: No proxy
   - Free Proxy: Rotate through allorigins, corsproxy.io, cors-anywhere
   - Residential: Use provided proxy URL with authentication
4. Returns: success, status_code, response_time, response_text, proxy_used
```

### Prompt 5: Admin Panel

```
Create password-protected Admin Panel with:
1. Login page with master password (stored in localStorage)
2. Dashboard with full API management (add/edit/delete)
3. Per-API toggles: enabled, proxy, residential proxy
4. Site Settings panel with accordion sections for all customizable texts
5. Residential Proxy URL configuration
6. Logs panel with clear button
```

### Prompt 6: Public Quick Hit Page

```
Create public Quick Hit page that:
1. Reads APIs from localStorage (synced from admin)
2. Has phone input with validation
3. Delay slider (0-2000ms)
4. Continuous looping mode (infinite rounds)
5. Real-time stats display
6. Compact mobile-friendly UI
7. Warning banner and admin link
```

### Prompt 7: Proxy System

```
Implement dual-layer proxy system:
1. Free CORS Proxies with automatic rotation:
   - allorigins.win
   - corsproxy.io
   - cors-anywhere.herokuapp.com
2. Residential Proxy support:
   - Per-API toggle
   - Global URL configuration in settings
   - Format: http://user:pass@host:port
   - Proxy-Authorization header handling
```

---

## 🎨 Styling Notes

### Color Tokens:

```css
:root {
  --primary: 142.1 76.2% 36.3%;      /* Green */
  --secondary: 198 93% 60%;          /* Cyan */
  --accent: 270 91% 65%;             /* Purple */
  --success: 142 76% 36%;            /* Green */
  --destructive: 0 84.2% 60.2%;      /* Red */
  --warning: 38 92% 50%;             /* Orange */
}
```

### Custom Classes:

```css
.gradient-text         /* Rainbow gradient text */
.text-glow             /* Neon glow effect */
.glow-primary          /* Green glow shadow */
.glow-destructive      /* Red glow shadow */
.scanline              /* CRT scanline overlay */
.gradient-matrix       /* Matrix-style background */
.terminal-cursor       /* Blinking cursor animation */
```

---

## 📱 Responsive Design

- Mobile-first approach
- Compact UI for small screens
- Scrollable areas for logs and API lists
- Touch-friendly buttons and inputs

---

## 🚀 Deployment

1. **Frontend**: Lovable auto-deployment
2. **Edge Functions**: Auto-deployed on save
3. **Database**: Supabase Cloud (Lovable managed)

---

## ⚠️ Disclaimer

This tool is for **authorized testing and educational purposes only**. Unauthorized use is strictly prohibited.

---

*Last Updated: February 2025*
*Documentation Version: 1.0*
