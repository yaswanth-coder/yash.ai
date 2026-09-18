# App Installation & Launchers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a seamless native app installation experience for mobile/desktop users via PWA (service worker, install prompts, iOS guide, persistent triggers) and 1-click startup/install launchers (`start.bat`, `install.bat`, `start.sh`, `install.sh`).

**Architecture:** A lightweight client-side PWA context listens to browser install events (`beforeinstallprompt`) and standalone display modes, while an offline-ready Service Worker handles asset caching. For local runners, cross-platform shell scripts orchestrate environment checks, dependency installation, concurrent daemon startup, and browser launch.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Service Worker API, Tailwind/Vanilla CSS, Windows Batch (`.bat`), POSIX Bash (`.sh`), Python venv, FastAPI.

## Global Constraints
- Do NOT break existing chat, image studio, or provider routing functionality.
- Do NOT introduce heavy desktop wrappers like Electron; keep PWA web standards compliant.
- Ensure cross-platform compatibility (Windows 10/11, macOS, Linux, iOS Safari, Android Chrome).
- Zero credentials or API keys embedded in scripts or client code.

---

### Task 1: Service Worker & Registration

**Files:**
- Create: `apps/yash-frontend/public/sw.js`
- Modify: `apps/yash-frontend/app/layout.tsx`

**Interfaces:**
- Produces: `/sw.js` serving cached app shell and icons; service worker registered on `window.load`.

- [ ] **Step 1: Create `apps/yash-frontend/public/sw.js`**
Implement the service worker with cache-first for static icons/manifest and network-first with cache fallback for navigation.
- [ ] **Step 2: Add Service Worker registration script in `apps/yash-frontend/app/layout.tsx`**
Register `/sw.js` safely in client runtime.
- [ ] **Step 3: Verify Service Worker registration**
Check with browser or curl that `/sw.js` returns HTTP 200 with `application/javascript`.
- [ ] **Step 4: Commit**
`git add apps/yash-frontend/public/sw.js apps/yash-frontend/app/layout.tsx && git commit -m "feat(pwa): add service worker and registration"`

---

### Task 2: PwaContext & Hook

**Files:**
- Create: `apps/yash-frontend/context/PwaContext.tsx`
- Modify: `apps/yash-frontend/app/layout.tsx`

**Interfaces:**
- Produces: `usePwaInstall(): { isInstallable, isInstalled, isIOS, promptInstall, showIosGuide, setShowIosGuide, dismissBanner }`

- [ ] **Step 1: Create `apps/yash-frontend/context/PwaContext.tsx`**
Implement detection of `display-mode: standalone`, `beforeinstallprompt` event interception, iOS detection, and localStorage 7-day cooldown.
- [ ] **Step 2: Wrap RootLayout with `PwaProvider` in `app/layout.tsx`**
Ensure all pages and components have access to PWA state.
- [ ] **Step 3: Commit**
`git add apps/yash-frontend/context/PwaContext.tsx apps/yash-frontend/app/layout.tsx && git commit -m "feat(pwa): add PwaContext and install hook"`

---

### Task 3: Install UI Components (Banner, iOS Modal, Sidebar, Settings)

**Files:**
- Create: `apps/yash-frontend/components/InstallPrompt.tsx`
- Create: `apps/yash-frontend/components/IosInstallModal.tsx`
- Modify: `apps/yash-frontend/components/Sidebar.tsx`
- Modify: `apps/yash-frontend/app/settings/page.tsx`
- Modify: `apps/yash-frontend/app/layout.tsx`

**Interfaces:**
- Consumes: `usePwaInstall()` from `PwaContext`.
- Produces: Floating install banner, iOS guide modal, Sidebar install button, Settings PWA card.

- [ ] **Step 1: Create `IosInstallModal.tsx`**
Sheet with 3-step visual instructions for iOS Safari users.
- [ ] **Step 2: Create `InstallPrompt.tsx`**
Floating glassmorphism install notification on mobile/desktop.
- [ ] **Step 3: Add Install Button in `Sidebar.tsx`**
Add "Install App" button in sidebar footer above settings.
- [ ] **Step 4: Add PWA & App Installation card in `app/settings/page.tsx`**
Add status indicator and install trigger.
- [ ] **Step 5: Include `InstallPrompt` and `IosInstallModal` in `app/layout.tsx`**
- [ ] **Step 6: Commit**
`git add apps/yash-frontend/components/InstallPrompt.tsx apps/yash-frontend/components/IosInstallModal.tsx apps/yash-frontend/components/Sidebar.tsx apps/yash-frontend/app/settings/page.tsx apps/yash-frontend/app/layout.tsx && git commit -m "feat(pwa): add install banner, iOS guide, sidebar and settings entry points"`

---

### Task 4: Windows 1-Click Launchers (`start.bat` & `install.bat`)

**Files:**
- Create: `start.bat`
- Create: `install.bat`

**Interfaces:**
- Produces: Executable batch scripts verifying prerequisites, installing venv & packages, running servers concurrently, and launching browser.

- [ ] **Step 1: Create `install.bat`**
Validates Python & Node, sets up Python virtual environment, installs backend requirements, installs frontend npm packages.
- [ ] **Step 2: Create `start.bat`**
Runs prerequisites check, boots backend uvicorn & frontend next dev, opens default browser at `http://localhost:3000`.
- [ ] **Step 3: Test batch script syntax and execution**
Run dry-run or syntax test using cmd/pwsh.
- [ ] **Step 4: Commit**
`git add start.bat install.bat && git commit -m "feat(scripts): add Windows 1-click install and startup scripts"`

---

### Task 5: Linux/macOS Launchers (`start.sh` & `install.sh`)

**Files:**
- Create: `start.sh`
- Create: `install.sh`

**Interfaces:**
- Produces: Executable Bash scripts with colored logs for Unix systems.

- [ ] **Step 1: Create `install.sh`**
Validates environment, installs venv and npm packages.
- [ ] **Step 2: Create `start.sh`**
Boots backend and frontend, handles traps for SIGINT/SIGTERM, launches browser via `xdg-open` or `open`.
- [ ] **Step 3: Commit**
`git add start.sh install.sh && git commit -m "feat(scripts): add Linux/macOS 1-click install and startup scripts"`

---

### Task 6: End-to-End Verification & Walkthrough

**Files:**
- Modify: `README.md`
- Output: Browser validation & testing report

- [ ] **Step 1: Update `README.md` with App Installation & 1-Click Launch guides**
- [ ] **Step 2: Browser Verification**
Verify PWA banner in Chrome/Edge and test iOS modal toggle.
- [ ] **Step 3: Git Push**
Push all commits to `origin/main`.
