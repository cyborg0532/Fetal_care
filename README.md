# MaternalCare — System Architecture & Integration Documentation

This document provides a comprehensive technical overview of the **MaternalCare** application. It serves as a guide for engineers, beginners, and stakeholders to understand the codebase structure, directory patterns, data flow, API integrations, security practices, and user experience paradigms.

---

## 🗺️ Project Architecture Overview

MaternalCare is built as a split-stack application:
1. **Frontend**: React Native / Expo (compiled for mobile and web responsive platforms) using Expo Router (file-based routing) and structured styling.
2. **Backend**: FastAPI (Python 3.11+) implementing SQLAlchemy ORM, SQLite/PostgreSQL connectors, JWT authentication, and structured router endpoints.

```
+-----------------------------------------------------------------------+
|                       Frontend (React Native / Expo)                  |
|                                                                       |
|   +-------------------+     +------------------+    +-------------+   |
|   | Dashboard Screens | --> | DashboardLayout  | -> | Sidebar/Top |   |
|   +-------------------+     +------------------+    +-------------+   |
|             |                                                         |
|             v                                                         |
|   +------------------+                                                |
|   |   apiFetch client|                                                |
|   +------------------+                                                |
+-------------|---------------------------------------------------------+
              |
              | (HTTPS / JWT Auth Header)
              v
+-------------|---------------------------------------------------------+
|             v                 Backend (FastAPI)                       |
|   +--------------------+                                              |
|   |   API Routers      |                                              |
|   +--------------------+                                              |
|             |                                                         |
|             v                                                         |
|   +--------------------+                                              |
|   |  SQLAlchemy Engine |                                              |
|   +--------------------+                                              |
+-------------|---------------------------------------------------------+
              |
              v
+-------------|---------------------------------------------------------+
|             v                 Database Layer                          |
|    +------------------+                                               |
|    | PostgreSQL DB    | (Supabase / local instance)                   |
|    +------------------+                                               |
+-----------------------------------------------------------------------+
```

---

## 📂 Codebase & Folder Structure

Understanding the layout of the project helps developers locate components, route files, and business logic quickly.

### 1. Frontend Directory Structure (`/frontend`)

*   [app/](file:///home/vortex/Desktop/New%20Folder/frontend/src/app): Expo Router file-based navigation workspace.
    *   [(auth)/](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(auth)): Screens for signing in ([login.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(auth)/login.tsx)) and signing up ([signup.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(auth)/signup.tsx)) with custom role selections.
    *   [(tabs)/](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(tabs)): Redesigned feature pages containing:
        *   [index.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(tabs)/index.tsx): Main dashboard (pregnancy milestones, water tracker, checklist logs).
        *   [appointments.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(tabs)/appointments.tsx): CRUD scheduler grouped by trimester filter lists.
        *   [meds_mood.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(tabs)/meds_mood.tsx): Medication logging systems and 7-day mood tracker metrics.
        *   [community.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(tabs)/community.tsx): Group discussions and threaded mother circles.
        *   [sos.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(tabs)/sos.tsx): Pulsing Emergency SOS dashboard featuring coordinates tracking.
        *   [ai-buddy.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(tabs)/ai-buddy.tsx): Interactive conversational health assistant.
        *   [ai-community.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(tabs)/ai-community.tsx): Comparative display side-by-side.
        *   [father-portal.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(tabs)/father-portal.tsx): Partner task sheets and red flag warning indexes.
        *   [_layout.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/app/(tabs)/_layout.tsx): Stack routes router mapping.
*   [components/](file:///home/vortex/Desktop/New%20Folder/frontend/src/components): Shared visual component modules:
    *   [DashboardLayout.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/components/DashboardLayout.tsx): Viewport container responsive boundary.
    *   [Sidebar.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/components/Sidebar.tsx): Multi-item sidebar navigation panel.
    *   [TopBar.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/components/TopBar.tsx): Navigation header with profile avatars.
    *   [PremiumUI.tsx](file:///home/vortex/Desktop/New%20Folder/frontend/src/components/PremiumUI.tsx): Reusable library elements (GlassCard, StatCard, ProgressBar).
*   [constants/theme.ts](file:///home/vortex/Desktop/New%20Folder/frontend/src/constants/theme.ts): centralized variables configuring borders, typography styles, shadows, and color systems.
*   [services/api.ts](file:///home/vortex/Desktop/New%20Folder/frontend/src/services/api.ts): API client wrapper carrying asynchronous token injections.

### 2. Backend Directory Structure (`/backend`)

*   [routers/](file:///home/vortex/Desktop/New%20Folder/backend/routers): Business logic divided by service routes.
    *   [auth.py](file:///home/vortex/Desktop/New%20Folder/backend/routers/auth.py): Password validation, token generators, and registrations.
    *   [tracker.py](file:///home/vortex/Desktop/New%20Folder/backend/routers/tracker.py): Weekly calendar calculations.
    *   [appointments.py](file:///home/vortex/Desktop/New%20Folder/backend/routers/appointments.py): Appointment CRUD databases interfaces.
    *   [medicines.py](file:///home/vortex/Desktop/New%20Folder/backend/routers/medicines.py): Dosage logging systems.
    *   [mood.py](file:///home/vortex/Desktop/New%20Folder/backend/routers/mood.py): Analytics trends calculators.
    *   [sos.py](file:///home/vortex/Desktop/New%20Folder/backend/routers/sos.py): Location triggers and medical profiles.
    *   [community.py](file:///home/vortex/Desktop/New%20Folder/backend/routers/community.py): Social forum threads.
*   [config.py](file:///home/vortex/Desktop/New%20Folder/backend/config.py): Configuration parser loading environment values.
*   [database.py](file:///home/vortex/Desktop/New%20Folder/backend/database.py): Engine connector with dynamic IPv4 fallback routes.
*   [models.py](file:///home/vortex/Desktop/New%20Folder/backend/models.py): Database tables schema declarations.
*   [schemas.py](file:///home/vortex/Desktop/New%20Folder/backend/schemas.py): Pydantic input schemas validating API formats.
*   [main.py](file:///home/vortex/Desktop/New%20Folder/backend/main.py): App start handler linking routers.
*   [.env](file:///home/vortex/Desktop/New%20Folder/backend/.env): Encrypted connection environments.

---

## 🔒 Security Protocols & Optimization Techniques

When moving from a local sandbox to a production-ready application, several strict rules must be enforced regarding user safety, server security, and visual UX performance.

### 1. Backend Security & Safeguards

#### 🛡️ Mitigating Password-Hash Denial of Service (DoS)
Hashing algorithms like `bcrypt` are deliberately CPU-intensive to prevent brute-force attacks. However, malicious actors can exploit this by submitting massive passwords (e.g., 100,000 characters) to overload your server's CPU and crash the service (a Password-Hash DoS).

We prevent this in [routers/auth.py](file:///home/vortex/Desktop/New%20Folder/backend/routers/auth.py) by enforcing Pydantic validations that restrict password lengths to a maximum of 128 characters, rejecting overlong inputs before they ever reach the CPU-intensive hashing step.

#### 🛡️ Database Connection Failbacks (IPv4/IPv6 Routing)
Direct connections to modern cloud instances (like Supabase) resolve to IPv6 by default. If your local deployment server lacks IPv6 capabilities, database queries will hang and return `Network is unreachable`. 

MaternalCare's engine implements a dynamic resolver inside [database.py](file:///home/vortex/Desktop/New%20Folder/backend/database.py). On startup, it checks if the server is running on an IPv4-only network:
- It attempts to resolve the Supabase database host to an IPv4 address (`socket.AF_INET`).
- If successful, it injects the IPv4 address directly into the connection arguments via psycopg2's `hostaddr` parameter, maintaining secure SSL hostname validations while bypassing unreachable IPv6 channels.

#### 🛡️ Cross-Origin Resource Sharing (CORS) Protection
To prevent malicious third-party websites from reading sensitive maternal health data from the API, strict CORS policies are declared in [main.py](file:///home/vortex/Desktop/New%20Folder/backend/main.py) which limit allowable domain origins, query headers, and HTTP methods.

---

### 2. Frontend Security & Form Validations

To protect the backend from junk data, forms must be validated client-side before dispatching API requests:
- **Email Validation**: Enforced via regex checks matching standard RFC patterns to filter out invalid accounts.
- **Double-Confirm Passwords**: Evaluated locally during account creation to prevent typos that could lock users out of their new accounts.
- **Input Sanitization**: Multi-line fields (such as Doctor Notes or Mood comments) limit character counts to prevent request-body buffer overflows.

---

### 3. Visual UX & Optimization Techniques

To ensure the app feels responsive and premium on all devices:
- **FlatList & ScrollView Optimizations**: Social feeds and timelines use optimized windowing parameters to dynamically unmount off-screen list components, preventing memory leaks on low-end mobile devices.
- **Responsive Layout Breakpoints**: The layout automatically detects viewport width:
  - **Desktop (>=1024px)**: Sidebar stays permanently open, providing a comfortable dual-panel workspace.
  - **Mobile/Tablet (<1024px)**: Sidebar folds into an off-screen drawer, activated by a sliding spring animation via `Animated.Value`.
- **Pre-ping Connection Polling**: To avoid slow page loads when the backend has been idle, the database pool pre-pings active sessions every 5 minutes to keep Postgres resources hot and responsive.

---

## 📈 Detailed Component Workflows

### 🔐 Authentication Flow
1. User enters credentials in the login form.
2. Frontend sanitizes inputs and posts them to `/auth/token`.
3. Server validates credentials against hash records and returns an encrypted HS256 JWT access token.
4. Client stores the token locally using `AsyncStorage`. All subsequent requests append it to the `Authorization` header.

### 🚨 Emergency SOS Flow
1. User taps the pulsing Emergency SOS widget.
2. App retrieves device coordinates using standard location packages.
3. App posts metadata payloads to `/sos/trigger`.
4. Backend fetches the caller's medical profile (blood group, allergies, preferred facility) and alerts emergency contacts with active location mappings.
