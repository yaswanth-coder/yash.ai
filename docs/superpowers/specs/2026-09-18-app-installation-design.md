# Design Document: Yash.AI App Installation Experience

**Date:** 2026-09-18  
**Status:** Approved  
**Topic:** App Installation (PWA Mobile/Desktop & 1-Click Local Launchers)

---

## 1. Executive Summary

Yash.AI is an AI platform offering chat, multimodal studio tools, and project workspaces. To make Yash.AI feel like a native mobile and desktop application for end users and remove friction for local self-hosters, this specification defines:
1. **PWA In-App Installation Experience:** Production-grade Service Worker (`/sw.js`), Chromium `beforeinstallprompt` capture, iOS Safari Add-to-Home-Screen guided modal, and persistent install buttons in the Sidebar and Settings.
2. **1-Click Startup & Setup Scripts:** Cross-platform launchers (`start.bat`, `install.bat` on Windows; `start.sh`, `install.sh` on Linux/macOS) that validate dependencies, configure environments, boot backend + frontend concurrently, and launch the user's browser.

---

## 2. Architecture & Components

### 2.1 PWA Service Worker (`apps/yash-frontend/public/sw.js`)
- **Lifecycle Management:**
  - `install` event: Pre-caches core app assets (`/favicon.png`, `/icon-192.png`, `/icon-512.png`, `/manifest.json`, and offline shell). Calls `self.skipWaiting()`.
  - `activate` event: Purges stale cache versions and claims active clients via `clients.claim()`.
- **Fetch Routing:**
  - `api/*`, `/images/*`, `/auth/*`, and non-GET requests: Bypass service worker (direct network pass-through).
  - Static assets (`_next/static/*`, `/fonts/*`, images): Cache-first with background network revalidation.
  - HTML Page Navigation: Network-first with cache fallback to ensure offline usability without broken pages.

### 2.2 Reusable PWA Install Hook & Context (`apps/yash-frontend/context/PwaContext.tsx`)
- Detects whether the app is currently running in standalone mode via `window.matchMedia('(display-mode: standalone)').matches` or `navigator.standalone`.
- Intercepts and caches the `beforeinstallprompt` event (Chromium, Android Chrome, Edge).
- Detects iOS / iPadOS Safari (using `navigator.userAgent` and touch points).
- Exposes:
  - `isInstallable: boolean`
  - `isInstalled: boolean`
  - `isIOS: boolean`
  - `promptInstall: () => Promise<void>`
  - `showIosGuide: boolean`
  - `setShowIosGuide: (show: boolean) => void`
  - `dismissBanner: () => void`

### 2.3 User Interface Touchpoints
1. **Floating Install Banner (`apps/yash-frontend/components/InstallPrompt.tsx`):**
   - Appears non-intrusively on mobile or desktop if the app is installable and not already installed.
   - Dismissing sets a 7-day cooldown in `localStorage` (`yash_pwa_banner_dismissed_until`).
   - Clicking "Install App" triggers the native prompt on Android/Desktop or displays the iOS walkthrough on iPhone/iPad.
2. **iOS Safari Walkthrough Modal (`apps/yash-frontend/components/IosInstallModal.tsx`):**
   - Visual step-by-step sheet showing:
     - Step 1: Tap Share icon (`⎋` or `↥`) in Safari.
     - Step 2: Scroll and tap "Add to Home Screen" (`⊞`).
     - Step 3: Tap "Add" in top-right.
3. **Sidebar Entry Point (`apps/yash-frontend/components/Sidebar.tsx`):**
   - Renders a clean "Install App" action item in the sidebar footer if `!isInstalled`.
4. **Settings Page Integration (`apps/yash-frontend/app/settings/page.tsx`):**
   - Dedicated "Application & PWA" card with live install status indicator and "Install Now" trigger.

### 2.4 1-Click Launchers & Install Scripts
1. **Windows Scripts:**
   - **`start.bat`**:
     - Checks Python (`python --version`) and Node (`node --version`).
     - Verifies `.env` exists, copying from `.env.example` if needed.
     - Verifies Python venv (`apps/backend/venv`), creates it and installs requirements if missing.
     - Verifies frontend dependencies (`node_modules`), runs `npm install` if missing.
     - Starts FastAPI backend (`uvicorn app.main:app --port 8000`) and Next.js frontend (`npm run dev`) in separate or managed command processes.
     - Opens default browser at `http://localhost:3000`.
   - **`install.bat`**:
     - Dedicated script that installs all backend and frontend dependencies without starting the servers.
2. **Linux / macOS Scripts:**
   - **`start.sh`** & **`install.sh`**:
     - Bash scripts with colored status indicators, checking system prerequisites, installing venv & npm packages, booting servers, and launching the browser with `open` (macOS) or `xdg-open` (Linux).

---

## 3. Verification Plan

1. **Automated / Unit Testing:**
   - Verify `/sw.js` syntax and registration.
   - Verify script execution syntax (`pwsh` / `cmd` testing for batch files).
2. **Browser Verification:**
   - Test in Chrome / Chromium to verify `beforeinstallprompt` event interception.
   - Emulate iPhone/iOS in devtools to verify the iOS Add-to-Home-Screen walkthrough.
   - Verify Sidebar and Settings "Install App" triggers.
   - Verify standalone mode hides installation prompts.
