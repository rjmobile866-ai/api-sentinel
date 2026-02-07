# 🔥 API Hit Engine - Recreation Prompts

Yeh prompts use karo future me similar project banane ke liye. Har prompt ko sequentially bhejo.

---

## 📋 Prompt Sequence

---

### **Prompt 1: Project Setup & Theme**

```
Ek React + TypeScript project banao with:
- Vite build tool
- Tailwind CSS
- shadcn/ui components
- Dark cyberpunk/hacker theme

Theme colors:
- Primary: Neon Green (#22c55e)
- Secondary: Cyan (#06b6d4)  
- Accent: Purple (#a855f7)
- Background: Dark (#0a0a0a)
- Destructive: Red

Custom effects add karo:
- Gradient text effect (rainbow)
- Neon glow shadows on buttons
- Scanline CRT overlay animation
- Matrix-style gradient background
- Blinking terminal cursor animation

Dark mode only rakhna hai.
```

---

### **Prompt 2: Page Structure & Routing**

```
React Router v6 se 4 pages banao:

1. "/" - HomePage (Public)
   - Header with logo, site name, admin button
   - Warning banner
   - Quick Hit Engine component
   - Logs panel

2. "/admin" - AdminLogin
   - Password input (master password)
   - Login button
   - Warning message

3. "/admin/dashboard" - AdminDashboard
   - Protected route (check sessionStorage)
   - Header with logout
   - Hit Engine (full controls)
   - API list with cards
   - Add/Edit API dialog
   - Site Settings panel
   - Logs panel

4. "/*" - NotFound (404 page)
```

---

### **Prompt 3: API Data Structure & Storage**

```
localStorage me APIs store karo with structure:

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

useApis hook banao with:
- addApi(data) - Add new API
- updateApi(id, updates) - Update existing
- deleteApi(id) - Remove API
- toggleApiField(id, field, value) - Toggle boolean fields

Duplicate detection add karo (same URL + method warning).
```

---

### **Prompt 4: Site Settings System**

```
Customizable site settings banao jo localStorage me save ho:

interface SiteSettings {
  // Branding
  siteName: string;           // "RIO METH"
  logoUrl: string;            // Logo image URL
  
  // Texts - Header
  adminButtonText: string;    // "ADMIN"
  
  // Texts - Warning
  warningText: string;        // Main page warning
  disclaimerTitle: string;    // Admin disclaimer title
  disclaimerText: string;     // Admin disclaimer
  
  // Texts - Quick Hit
  quickHitTitle: string;      // "QUICK HIT"
  phoneLabel: string;         // "Phone Number"
  phonePlaceholder: string;   // "91XXXXXXXXXX"
  hitButtonText: string;      // "HIT"
  stopButtonText: string;     // "STOP"
  noApisWarning: string;      // "Admin me APIs add karo"
  
  // Texts - Admin
  adminPanelTitle: string;    // "ADMIN PANEL"
  logoutButtonText: string;   // "LOGOUT"
  apiListTitle: string;       // "API List"
  addApiButtonText: string;   // "Add API"
  noApisText: string;         // "No APIs added yet"
  
  // Security
  adminPassword: string;      // Default: "12345"
  
  // Proxy
  residentialProxyUrl: string; // "http://user:pass@host:port"
}

SiteSettingsPanel component banao with accordion sections:
- Logo/Image (with preview)
- Header Texts
- Warning Banner
- Quick Hit Engine texts
- Admin Panel texts
- Security (password)
- Residential Proxy
```

---

### **Prompt 5: Hit Engine Component**

```
Hit Engine component banao jo APIs ko sequentially hit kare:

Features:
1. Phone Number input
2. Delay control (0-2000ms slider)
3. Max Rounds input (admin only)
4. Free Proxy toggle
5. Start/Stop buttons
6. Real-time stats display:
   - APIs count
   - Mode (SERVER)
   - Current Round / Max Rounds
   - Total Hits
   - Success count (green)
   - Fail count (red)
7. Current API indicator (animated)

Placeholder replacement function:
- Replace {PHONE} in URL, headers, body with actual phone number
- Case-insensitive replacement

Loop logic:
- For each round (1 to maxRounds)
  - For each enabled API
    - Replace placeholders
    - Call Edge Function
    - Update stats
    - Wait for delay
  - If stopped, break
```

---

### **Prompt 6: Quick Hit Engine (Public)**

```
Public page ke liye simplified Quick Hit Engine:

Features:
1. Phone input (10+ digits validation)
2. Delay slider (compact)
3. Continuous looping mode (infinite rounds until stopped)
4. Compact stats: Round, Hits, Success, Fails
5. No API management (read-only from localStorage)

Differences from Admin HitEngine:
- No max rounds (infinite loop)
- No proxy toggle
- Compact mobile-friendly UI
- APIs synced from admin via localStorage

Listen for localStorage changes to sync APIs.
```

---

### **Prompt 7: Edge Function for API Calls**

```
Supabase Edge Function banao: hit-api

Request body:
{
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  bodyType: 'json' | 'form-urlencoded' | 'text' | 'none',
  useProxy: boolean,
  useResidentialProxy: boolean,
  residentialProxyUrl: string
}

Response:
{
  success: boolean,
  status_code: number | null,
  response_time: number,
  response_text: string (first 1000 chars),
  error_message: string | null,
  proxy_used: 'direct' | 'allorigins' | 'corsproxy' | 'cors-anywhere' | 'residential'
}

Features:
1. Add browser-like headers:
   - User-Agent (Chrome Windows)
   - Accept
   - Accept-Language
   - Cache-Control
   - Origin/Referer from URL

2. Body serialization by type:
   - json → JSON.stringify + Content-Type: application/json
   - form-urlencoded → URLSearchParams + Content-Type: application/x-www-form-urlencoded
   - text → as-is

3. Free CORS Proxy rotation (on failure try next):
   - allorigins.win
   - corsproxy.io
   - cors-anywhere.herokuapp.com

4. Residential Proxy support:
   - Parse proxy URL (http://user:pass@host:port)
   - Add Proxy-Authorization header

5. CORS headers for browser:
   - Access-Control-Allow-Origin: *
   - Access-Control-Allow-Headers: authorization, content-type, etc.
```

---

### **Prompt 8: Node.js Fetch Code Parser**

```
API Importer component banao jo Node.js fetch code parse kare:

Input example:
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

Parser features:
1. URL extraction - fetch("url") or fetch('url')
2. Method detection from options
3. Headers parsing:
   - new Headers() with .append()
   - Direct object literal
   - Variable reference resolution

4. Body type detection:
   - JSON.stringify({...}) → json
   - new URLSearchParams() → form-urlencoded
   - new FormData() → multipart
   - Plain string → text

5. Variable resolution:
   - Find const/let/var declarations
   - Parse object/string values

6. Header sanitization (remove):
   - User-Agent, Cookie
   - sec-* headers
   - Content-Length, Accept-Encoding
   - Host, Connection, Priority

7. Auto-generate API name from URL path
8. Validation with error messages
9. Preview before adding
```

---

### **Prompt 9: API Card & Form**

```
API management UI banao:

ApiCard component:
- Method badge (GET=green, POST=blue, PUT=yellow, DELETE=red)
- API name (truncated)
- URL display (truncated)
- Toggle switches:
  - Enabled (main toggle)
  - Proxy (free CORS proxies)
  - Residential Proxy (premium, highlighted purple)
- Edit button
- Delete button with confirmation

ApiForm dialog:
- Name input
- URL input
- Method select (GET, POST, PUT, DELETE, PATCH)
- Headers textarea (JSON format)
- Body textarea (JSON format)
- Query Params textarea (JSON format)
- Toggle switches for all options
- Import from Code button (opens ApiImporter)
- Save/Cancel buttons

Form validation:
- Name required (min 2 chars)
- Valid URL format
- Valid JSON for headers/body/params
```

---

### **Prompt 10: Logs Panel**

```
Logs display component banao:

Log structure:
{
  id: string,
  api_name: string,
  mode: 'SERVER',
  status_code: number | null,
  success: boolean,
  response_time: number | null,
  error_message: string | null,
  created_at: string
}

UI features:
- Scrollable list (max height)
- Each log item shows:
  - Success/Fail icon (green check / red X)
  - API name (truncated)
  - Status code (colored: <400 green, >=400 red)
  - Response time in ms
- Color coded background (success=green tint, fail=red tint)
- Clear all button
- Empty state message
- Keep max 100 logs in memory
```

---

### **Prompt 11: Admin Authentication**

```
Simple password-based admin auth:

AdminLogin page:
- Password input (centered card)
- Submit button
- Warning banner

Auth flow:
1. Check password against settings.adminPassword
2. If match: sessionStorage.setItem('adminAuth', 'true')
3. Redirect to /admin/dashboard

AdminDashboard protection:
1. On mount: check sessionStorage.getItem('adminAuth')
2. If not 'true': redirect to /admin
3. Logout: sessionStorage.removeItem + redirect

Default password: "12345"
Password changeable in Site Settings.
```

---

### **Prompt 12: Mobile Responsive UI**

```
Mobile-first responsive design:

Public page (/):
- Full height, no scroll on container
- Compact header (logo + name + admin button)
- Warning banner (single line)
- Logs panel (fixed height with scroll)
- Quick Hit Engine (compact, bottom)

Admin dashboard:
- Responsive grid (1 col mobile, 2 col desktop)
- Collapsible sections
- Touch-friendly buttons
- Scrollable API list
- Dialog for forms (full screen mobile)

General:
- Min touch target 44px
- Readable fonts (14-16px base)
- Proper spacing
- No horizontal scroll
```

---

## 🚀 Quick Start (Single Prompt)

Agar ek hi prompt me basic version chahiye:

```
Ek API Hit Engine web app banao with React + TypeScript + Tailwind + shadcn/ui.

Features:
1. Dark cyberpunk theme with neon green/cyan colors
2. Public page with Quick Hit Engine:
   - Phone number input with {PHONE} placeholder
   - Delay slider
   - Continuous loop mode
   - Live stats (hits, success, fails)
3. Admin panel (password protected):
   - Add/Edit/Delete APIs
   - API importer from Node.js fetch code
   - Site settings customization
   - Residential proxy configuration
4. Supabase Edge Function for HTTP requests:
   - Browser-like headers
   - Free CORS proxy rotation (allorigins, corsproxy.io)
   - Residential proxy support
5. LocalStorage for APIs and settings persistence
6. Real-time logs with status codes and response times

APIs stored as: name, url, method, headers, body, bodyType, enabled, proxy flags.
Settings include: site name, logo, all UI texts, admin password, proxy URL.
```

---

## 📝 Notes

1. **Order matters** - Prompts ko sequence me bhejo
2. **Wait for completion** - Har prompt complete hone do pehle next bhejne se
3. **Test each step** - Har step ke baad test karo
4. **Customize** - Apne requirements ke hisaab se modify karo

---

*Created for future reference*
