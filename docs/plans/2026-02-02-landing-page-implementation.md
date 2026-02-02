# Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a public landing page with auto-generated screenshots, hosted on GitHub Pages from the `landing_page` directory.

**Architecture:** Single HTML file with Tailwind CDN (zero build step). Playwright E2E tests generate screenshots by running against the seeded app. A dedicated GitHub Actions workflow regenerates screenshots on push to main and commits them back.

**Tech Stack:** HTML + Tailwind CDN, Playwright (isolated in `e2e/`), GitHub Actions, GitHub Pages

**Working directory:** `/Users/danbim/coding/ws_scoring/.worktrees/landing-page` (branch: `landing-page`)

**Worktree ports:** API=3260, Vite=5433, PostgreSQL=5692

---

### Task 1: Create landing page HTML skeleton

**Files:**
- Create: `landing_page/index.html`

**Step 1: Create the directory and HTML file**

Create `landing_page/index.html` with the full landing page. Uses Tailwind CSS via CDN. Ocean blue/teal gradient theme, sporty styling.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WS Scoring - Windsurfing Contest Judging</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            ocean: {
              50: '#f0f9ff',
              100: '#e0f2fe',
              200: '#bae6fd',
              300: '#7dd3fc',
              400: '#38bdf8',
              500: '#0ea5e9',
              600: '#0284c7',
              700: '#0369a1',
              800: '#075985',
              900: '#0c4a6e',
              950: '#082f49',
            }
          }
        }
      }
    }
  </script>
  <style>
    .hero-gradient {
      background: linear-gradient(135deg, #082f49 0%, #0c4a6e 25%, #0369a1 50%, #0ea5e9 75%, #38bdf8 100%);
    }
    .section-gradient {
      background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);
    }
    .screenshot-shadow {
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1);
    }
  </style>
</head>
<body class="bg-white text-gray-900 font-sans">

  <!-- Hero Section -->
  <header class="hero-gradient text-white">
    <div class="max-w-6xl mx-auto px-6 py-24 text-center">
      <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
        WS Scoring
      </h1>
      <p class="text-xl md:text-2xl text-ocean-200 max-w-2xl mx-auto mb-10">
        Real-time windsurfing wave contest judging. Score waves and jumps, manage brackets, and stream results live.
      </p>
      <a href="https://ws-scoring.danbim.com"
         class="inline-block bg-white text-ocean-800 font-bold px-8 py-4 rounded-xl text-lg hover:bg-ocean-50 transition-colors shadow-lg">
        Launch App
      </a>
    </div>
  </header>

  <!-- For Judges -->
  <section id="judges" class="py-20 section-gradient">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-16">
        <span class="inline-block bg-ocean-100 text-ocean-800 font-semibold px-4 py-1.5 rounded-full text-sm uppercase tracking-wide mb-4">For Judges</span>
        <h2 class="text-4xl font-bold text-gray-900 mb-4">Score Waves & Jumps in Real Time</h2>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          Enter scores from your phone or tablet with the touch-optimized interface. Works offline and syncs automatically when reconnected.
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-8 mb-12">
        <div>
          <img src="screenshots/judge-scoresheet-desktop.png" alt="Heat score sheet - desktop view" class="rounded-xl screenshot-shadow w-full" loading="lazy">
          <p class="text-sm text-gray-500 mt-3 text-center">Heat score sheet with rider cards and live totals</p>
        </div>
        <div>
          <img src="screenshots/judge-scoresheet-mobile.png" alt="Heat score sheet - mobile view" class="rounded-xl screenshot-shadow w-full max-w-xs mx-auto" loading="lazy">
          <p class="text-sm text-gray-500 mt-3 text-center">Mobile-optimized for on-the-water judging</p>
        </div>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <img src="screenshots/judge-wave-modal-desktop.png" alt="Wave score entry - desktop" class="rounded-xl screenshot-shadow w-full" loading="lazy">
          <p class="text-sm text-gray-500 mt-3 text-center">Wave score entry</p>
        </div>
        <div>
          <img src="screenshots/judge-wave-modal-mobile.png" alt="Wave score entry - mobile" class="rounded-xl screenshot-shadow w-full" loading="lazy">
          <p class="text-sm text-gray-500 mt-3 text-center">Wave score (mobile)</p>
        </div>
        <div>
          <img src="screenshots/judge-jump-modal-desktop.png" alt="Jump score entry - desktop" class="rounded-xl screenshot-shadow w-full" loading="lazy">
          <p class="text-sm text-gray-500 mt-3 text-center">Jump score with trick selection</p>
        </div>
        <div>
          <img src="screenshots/judge-jump-modal-mobile.png" alt="Jump score entry - mobile" class="rounded-xl screenshot-shadow w-full" loading="lazy">
          <p class="text-sm text-gray-500 mt-3 text-center">Jump score (mobile)</p>
        </div>
      </div>

      <ul class="mt-12 grid sm:grid-cols-3 gap-6 text-center">
        <li class="bg-white p-6 rounded-xl shadow-sm">
          <div class="text-3xl mb-2">&#127754;</div>
          <h3 class="font-bold text-lg mb-1">Wave & Jump Scoring</h3>
          <p class="text-gray-600 text-sm">Score 0-10 with decimal precision. Supports all PWA jump types.</p>
        </li>
        <li class="bg-white p-6 rounded-xl shadow-sm">
          <div class="text-3xl mb-2">&#128246;</div>
          <h3 class="font-bold text-lg mb-1">Offline Support</h3>
          <p class="text-gray-600 text-sm">Keep scoring even without connectivity. Syncs when back online.</p>
        </li>
        <li class="bg-white p-6 rounded-xl shadow-sm">
          <div class="text-3xl mb-2">&#128241;</div>
          <h3 class="font-bold text-lg mb-1">Mobile Optimized</h3>
          <p class="text-gray-600 text-sm">Touch-friendly on-screen keyboard designed for quick entry.</p>
        </li>
      </ul>
    </div>
  </section>

  <!-- For Head Judges -->
  <section id="head-judges" class="py-20 bg-white">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-16">
        <span class="inline-block bg-teal-100 text-teal-800 font-semibold px-4 py-1.5 rounded-full text-sm uppercase tracking-wide mb-4">For Head Judges</span>
        <h2 class="text-4xl font-bold text-gray-900 mb-4">Oversee Scores & Manage Brackets</h2>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          See all judges' scores side by side, manage single elimination brackets, and control heat progression.
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-8 mb-12">
        <div>
          <img src="screenshots/headjudge-bracket-desktop.png" alt="Bracket visualization" class="rounded-xl screenshot-shadow w-full" loading="lazy">
          <p class="text-sm text-gray-500 mt-3 text-center">Single elimination bracket with automatic progression</p>
        </div>
        <div>
          <img src="screenshots/headjudge-heats-desktop.png" alt="Head judge heat overview" class="rounded-xl screenshot-shadow w-full" loading="lazy">
          <p class="text-sm text-gray-500 mt-3 text-center">All judges' scores at a glance with final averages</p>
        </div>
      </div>

      <ul class="mt-12 grid sm:grid-cols-3 gap-6 text-center">
        <li class="bg-ocean-50 p-6 rounded-xl">
          <div class="text-3xl mb-2">&#127942;</div>
          <h3 class="font-bold text-lg mb-1">Bracket Management</h3>
          <p class="text-gray-600 text-sm">Single elimination brackets for 2-64 riders with automatic bye handling.</p>
        </li>
        <li class="bg-ocean-50 p-6 rounded-xl">
          <div class="text-3xl mb-2">&#128202;</div>
          <h3 class="font-bold text-lg mb-1">Score Oversight</h3>
          <p class="text-gray-600 text-sm">View all judges' scores side by side with computed averages.</p>
        </li>
        <li class="bg-ocean-50 p-6 rounded-xl">
          <div class="text-3xl mb-2">&#9201;</div>
          <h3 class="font-bold text-lg mb-1">Heat Control</h3>
          <p class="text-gray-600 text-sm">Complete heats and trigger automatic bracket advancement.</p>
        </li>
      </ul>
    </div>
  </section>

  <!-- For Spectators -->
  <section id="spectators" class="py-20 section-gradient">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-16">
        <span class="inline-block bg-cyan-100 text-cyan-800 font-semibold px-4 py-1.5 rounded-full text-sm uppercase tracking-wide mb-4">For Spectators</span>
        <h2 class="text-4xl font-bold text-gray-900 mb-4">Follow the Action Live</h2>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          Watch scores update in real time from the beach or anywhere. No login required.
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-8 mb-12">
        <div>
          <img src="screenshots/spectator-viewer-desktop.png" alt="Live heat viewer - desktop" class="rounded-xl screenshot-shadow w-full" loading="lazy">
          <p class="text-sm text-gray-500 mt-3 text-center">Live scoreboard with real-time WebSocket updates</p>
        </div>
        <div>
          <img src="screenshots/spectator-viewer-mobile.png" alt="Live heat viewer - mobile" class="rounded-xl screenshot-shadow w-full max-w-xs mx-auto" loading="lazy">
          <p class="text-sm text-gray-500 mt-3 text-center">Works on any device, no app needed</p>
        </div>
      </div>

      <ul class="mt-12 grid sm:grid-cols-3 gap-6 text-center">
        <li class="bg-white p-6 rounded-xl shadow-sm">
          <div class="text-3xl mb-2">&#9889;</div>
          <h3 class="font-bold text-lg mb-1">Real-Time Updates</h3>
          <p class="text-gray-600 text-sm">Scores stream live via WebSocket. No page refresh needed.</p>
        </li>
        <li class="bg-white p-6 rounded-xl shadow-sm">
          <div class="text-3xl mb-2">&#128275;</div>
          <h3 class="font-bold text-lg mb-1">No Login Required</h3>
          <p class="text-gray-600 text-sm">Public viewer accessible to everyone. Share the link.</p>
        </li>
        <li class="bg-white p-6 rounded-xl shadow-sm">
          <div class="text-3xl mb-2">&#128250;</div>
          <h3 class="font-bold text-lg mb-1">Big Screen Ready</h3>
          <p class="text-gray-600 text-sm">Embed the viewer on any display at the beach or event.</p>
        </li>
      </ul>
    </div>
  </section>

  <!-- Footer -->
  <footer class="hero-gradient text-white py-12">
    <div class="max-w-6xl mx-auto px-6 text-center">
      <p class="text-ocean-200 mb-4">Built for the Danish Open 2026</p>
      <div class="flex justify-center gap-6">
        <a href="https://github.com/danbim/ws-scoring" class="text-ocean-300 hover:text-white transition-colors">GitHub</a>
        <a href="https://ws-scoring.danbim.com" class="text-ocean-300 hover:text-white transition-colors">Launch App</a>
      </div>
    </div>
  </footer>

</body>
</html>
```

**Step 2: Verify it renders locally**

Open the file in a browser to check the layout:

```bash
open landing_page/index.html
```

Expected: The page loads with the ocean gradient hero, three audience sections with placeholder image areas (broken images are fine - screenshots don't exist yet), and the footer.

**Step 3: Commit**

```bash
git add landing_page/index.html
git commit -m "feat: add landing page HTML with Tailwind CDN"
```

---

### Task 2: Set up Playwright E2E project

**Files:**
- Create: `e2e/package.json`
- Create: `e2e/playwright.config.ts`
- Create: `e2e/tsconfig.json`

**Step 1: Create the e2e directory and package.json**

Create `e2e/package.json`:

```json
{
  "name": "ws-scoring-e2e",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0"
  }
}
```

**Step 2: Create Playwright config**

Create `e2e/playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const API_URL = process.env.API_URL || "http://localhost:3000";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    screenshot: "off",
    video: "off",
    trace: "off",
  },
  projects: [
    {
      name: "screenshots",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
```

**Step 3: Create tsconfig for e2e**

Create `e2e/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["*.ts"]
}
```

**Step 4: Install Playwright dependencies**

```bash
cd e2e && npm install && npx playwright install chromium
```

Expected: Chromium browser binary downloaded, `node_modules` created in `e2e/`.

**Step 5: Add e2e/node_modules to .gitignore**

Add to the project's `.gitignore`:

```
# E2E tests
e2e/node_modules/
e2e/test-results/
e2e/playwright-report/
```

**Step 6: Commit**

```bash
git add e2e/package.json e2e/playwright.config.ts e2e/tsconfig.json .gitignore
git commit -m "feat: set up Playwright E2E project for screenshot generation"
```

---

### Task 3: Add seed script for E2E test users

The existing seed script (`scripts/db/seed.ts`) creates riders, seasons, contests, divisions, and brackets, but does NOT create users. The user creation script (`scripts/users/create-user.ts`) is interactive. We need a non-interactive way to create test users for E2E.

**Files:**
- Create: `scripts/db/seed-users.ts`
- Modify: `package.json` (add `db:seed:users` script)

**Step 1: Create the seed-users script**

Create `scripts/db/seed-users.ts`:

```typescript
// Create test users for E2E screenshot generation
// Non-interactive — used by CI and local E2E setup

import { getDb } from "../../src/infrastructure/db/index.js";
import { createUserRepository } from "../../src/infrastructure/repositories/index.js";
import type { CreateUserInput } from "../../src/domain/user/types.js";

const TEST_USERS: CreateUserInput[] = [
  {
    username: "judge1",
    password: "password123",
    role: "judge",
    email: null,
  },
  {
    username: "judge2",
    password: "password123",
    role: "judge",
    email: null,
  },
  {
    username: "headjudge",
    password: "password123",
    role: "head_judge",
    email: null,
  },
];

async function seedUsers() {
  const db = await getDb();
  const userRepository = createUserRepository(db);

  for (const userInput of TEST_USERS) {
    const existing = await userRepository.getUserByUsername(userInput.username);
    if (existing) {
      console.log(`  User "${userInput.username}" already exists, skipping`);
      continue;
    }
    const user = await userRepository.createUser(userInput);
    console.log(`  Created user: ${user.username} (${user.role})`);
  }

  console.log("\nTest users ready.");
  process.exit(0);
}

if (import.meta.main) {
  seedUsers().catch((error) => {
    console.error("Failed to seed users:", error);
    process.exit(1);
  });
}
```

**Step 2: Add script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"db:seed:users": "bun run scripts/db/seed-users.ts"
```

**Step 3: Run it locally to verify (requires running PostgreSQL)**

```bash
bun run db:seed:users
```

Expected output:
```
  Created user: judge1 (judge)
  Created user: judge2 (judge)
  Created user: headjudge (head_judge)

Test users ready.
```

**Step 4: Commit**

```bash
git add scripts/db/seed-users.ts package.json
git commit -m "feat: add non-interactive seed script for E2E test users"
```

---

### Task 4: Write Playwright screenshot spec

This is the core task. The spec logs in, navigates the app, enters scores, and captures screenshots at desktop and mobile viewports.

**Files:**
- Create: `e2e/screenshots.spec.ts`

**Step 1: Create the screenshot spec**

Create `e2e/screenshots.spec.ts`:

```typescript
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const SCREENSHOT_DIR = path.resolve(__dirname, "../landing_page/screenshots");

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const API_URL = process.env.API_URL || "http://localhost:3000";

// Credentials matching scripts/db/seed-users.ts
const JUDGE_USER = { username: "judge1", password: "password123" };
const HEAD_JUDGE_USER = { username: "headjudge", password: "password123" };

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

async function login(page: Page, username: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`);
}

async function logout(page: Page) {
  // Click logout button in the navbar
  await page.click('button:has-text("Logout")');
  await page.waitForURL(`${BASE_URL}/login`);
}

// Helper to find the first heat with riders so we can navigate to it
async function findFirstHeatUrl(page: Page): Promise<string> {
  // Navigate: Seasons -> first contest -> first division -> first bracket -> first heat
  await page.goto(`${BASE_URL}/`);
  // Click the first season link
  await page.locator("a").filter({ hasText: "2026 Season" }).first().click();
  await page.waitForURL(/\/contests/);

  // Click the first contest
  await page.locator("a").filter({ hasText: "Danish Open" }).first().click();
  await page.waitForURL(/\/divisions/);

  // Click the first division
  await page.locator("a").first().click();
  await page.waitForURL(/\/participants|\/brackets/);

  // We need to navigate to a heat - look for heat links on the page
  // The bracket view should show heats
  const heatLink = page.locator('a[href*="/heats/"]').first();
  await heatLink.click();
  await page.waitForURL(/\/heats\//);

  return page.url();
}

test.describe("Screenshot generation", () => {

  test("Judge screenshots - desktop and mobile", async ({ browser }) => {
    // Desktop context
    const desktopContext = await browser.newContext({ viewport: DESKTOP });
    const desktopPage = await desktopContext.newPage();

    await login(desktopPage, JUDGE_USER.username, JUDGE_USER.password);

    // Navigate to a heat
    const heatUrl = await findFirstHeatUrl(desktopPage);

    // Screenshot: Score sheet (desktop)
    await desktopPage.waitForTimeout(1000); // Let scores render
    await screenshot(desktopPage, "judge-scoresheet-desktop");

    // Add wave scores to make it look realistic
    const addWaveButtons = desktopPage.locator('button:has-text("Add Wave")');
    if (await addWaveButtons.count() > 0) {
      // Add wave score for first rider
      await addWaveButtons.first().click();
      await desktopPage.waitForTimeout(500);

      // Screenshot: Wave modal (desktop)
      await screenshot(desktopPage, "judge-wave-modal-desktop");

      // Enter a score using on-screen keyboard
      await desktopPage.locator('button:has-text("7")').first().click();
      await desktopPage.locator('button:has-text(".")').first().click();
      await desktopPage.locator('button:has-text("5")').first().click();
      // Submit the score
      const submitButton = desktopPage.locator('button:has-text("Submit"), button:has-text("Save"), button:has-text("OK")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
      }
      await desktopPage.waitForTimeout(500);

      // Add more wave scores for realism
      if (await addWaveButtons.count() > 0) {
        await addWaveButtons.first().click();
        await desktopPage.waitForTimeout(300);
        await desktopPage.locator('button:has-text("8")').first().click();
        const submitBtn = desktopPage.locator('button:has-text("Submit"), button:has-text("Save"), button:has-text("OK")').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
        }
        await desktopPage.waitForTimeout(500);
      }
    }

    // Add jump score
    const addJumpButtons = desktopPage.locator('button:has-text("Add Jump")');
    if (await addJumpButtons.count() > 0) {
      await addJumpButtons.first().click();
      await desktopPage.waitForTimeout(500);

      // Screenshot: Jump modal step 1 - trick selection (desktop)
      // Select a jump type (e.g., Forward)
      await desktopPage.locator('button:has-text("F")').first().click();
      await desktopPage.waitForTimeout(300);

      // Click Next to go to score entry
      const nextButton = desktopPage.locator('button:has-text("Next")').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await desktopPage.waitForTimeout(300);
      }

      await screenshot(desktopPage, "judge-jump-modal-desktop");

      // Enter jump score
      await desktopPage.locator('button:has-text("8")').first().click();
      await desktopPage.locator('button:has-text(".")').first().click();
      await desktopPage.locator('button:has-text("5")').first().click();
      const submitJump = desktopPage.locator('button:has-text("Submit"), button:has-text("Save"), button:has-text("OK")').first();
      if (await submitJump.isVisible()) {
        await submitJump.click();
      }
      await desktopPage.waitForTimeout(500);
    }

    // Re-screenshot score sheet with scores filled in
    await screenshot(desktopPage, "judge-scoresheet-desktop");

    // Mobile context - same heat URL
    const mobileContext = await browser.newContext({ viewport: MOBILE });
    const mobilePage = await mobileContext.newPage();

    await login(mobilePage, JUDGE_USER.username, JUDGE_USER.password);
    await mobilePage.goto(heatUrl);
    await mobilePage.waitForTimeout(1000);

    // Screenshot: Score sheet (mobile)
    await screenshot(mobilePage, "judge-scoresheet-mobile");

    // Open wave modal on mobile
    const mobileWaveButtons = mobilePage.locator('button:has-text("Add Wave")');
    if (await mobileWaveButtons.count() > 0) {
      await mobileWaveButtons.first().click();
      await mobilePage.waitForTimeout(500);
      await screenshot(mobilePage, "judge-wave-modal-mobile");

      // Close modal
      const cancelButton = mobilePage.locator('button:has-text("Cancel")').first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
      await mobilePage.waitForTimeout(300);
    }

    // Open jump modal on mobile
    const mobileJumpButtons = mobilePage.locator('button:has-text("Add Jump")');
    if (await mobileJumpButtons.count() > 0) {
      await mobileJumpButtons.first().click();
      await mobilePage.waitForTimeout(500);

      // Select jump type then go to score screen
      await mobilePage.locator('button:has-text("F")').first().click();
      const nextBtn = mobilePage.locator('button:has-text("Next")').first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await mobilePage.waitForTimeout(300);
      }

      await screenshot(mobilePage, "judge-jump-modal-mobile");

      const cancelBtn = mobilePage.locator('button:has-text("Cancel"), button:has-text("Back")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }

    await desktopContext.close();
    await mobileContext.close();
  });

  test("Head Judge screenshots - desktop only", async ({ browser }) => {
    const desktopContext = await browser.newContext({ viewport: DESKTOP });
    const desktopPage = await desktopContext.newPage();

    await login(desktopPage, HEAD_JUDGE_USER.username, HEAD_JUDGE_USER.password);

    // Navigate to find a heat, then go to head judge view
    const heatUrl = await findFirstHeatUrl(desktopPage);

    // Extract heatId from URL and navigate to head judge view
    const heatIdMatch = heatUrl.match(/heats\/([^/?]+)/);
    if (heatIdMatch) {
      const heatId = heatIdMatch[1];
      await desktopPage.goto(`${BASE_URL}/head-judge/heats/${heatId}`);
      await desktopPage.waitForTimeout(2000); // Wait for WebSocket data

      // Screenshot: Head judge view with scores
      await screenshot(desktopPage, "headjudge-heats-desktop");
    }

    // Navigate to bracket view
    // Go back to divisions page which shows brackets
    await desktopPage.goto(`${BASE_URL}/`);
    await desktopPage.locator("a").filter({ hasText: "2026 Season" }).first().click();
    await desktopPage.waitForURL(/\/contests/);
    await desktopPage.locator("a").filter({ hasText: "Danish Open" }).first().click();
    await desktopPage.waitForURL(/\/divisions/);

    await desktopPage.waitForTimeout(1000);

    // Screenshot: Bracket/division overview
    await screenshot(desktopPage, "headjudge-bracket-desktop");

    await desktopContext.close();
  });

  test("Spectator screenshots - desktop and mobile", async ({ browser }) => {
    // First, we need to find a heat ID. Log in temporarily to navigate
    const tempContext = await browser.newContext({ viewport: DESKTOP });
    const tempPage = await tempContext.newPage();
    await login(tempPage, JUDGE_USER.username, JUDGE_USER.password);
    const heatUrl = await findFirstHeatUrl(tempPage);
    const heatIdMatch = heatUrl.match(/heats\/([^/?]+)/);
    const heatId = heatIdMatch ? heatIdMatch[1] : "";
    await tempContext.close();

    if (!heatId) {
      throw new Error("Could not find a heat ID for spectator screenshots");
    }

    // Desktop - public viewer (no auth needed)
    const desktopContext = await browser.newContext({ viewport: DESKTOP });
    const desktopPage = await desktopContext.newPage();

    // The viewer is served by the API server directly, not by Vite
    await desktopPage.goto(`${API_URL}/viewer/${heatId}`);
    await desktopPage.waitForTimeout(2000); // Wait for WebSocket data

    await screenshot(desktopPage, "spectator-viewer-desktop");
    await desktopContext.close();

    // Mobile
    const mobileContext = await browser.newContext({ viewport: MOBILE });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto(`${API_URL}/viewer/${heatId}`);
    await mobilePage.waitForTimeout(2000);

    await screenshot(mobilePage, "spectator-viewer-mobile");
    await mobileContext.close();
  });

});
```

**Important notes for the implementer:**
- The spec uses resilient locators (`has-text`, `first()`) since UI may evolve
- `waitForTimeout` calls give the app time to render and WebSocket to connect
- The `findFirstHeatUrl` helper navigates through the hierarchy to find a real heat
- Screenshot filenames match what `landing_page/index.html` references
- The viewer runs on the API server (port 3000/3260), not on Vite

**Step 2: Verify the spec can be parsed**

```bash
cd e2e && npx playwright test --list
```

Expected: Lists the 3 test cases without errors.

**Step 3: Commit**

```bash
git add e2e/screenshots.spec.ts
git commit -m "feat: add Playwright screenshot generation spec"
```

---

### Task 5: Create GitHub Actions screenshot workflow

**Files:**
- Create: `.github/workflows/screenshots.yml`

**Step 1: Create the workflow**

Create `.github/workflows/screenshots.yml`:

```yaml
name: Generate Landing Page Screenshots

on:
  push:
    branches: [main]
  workflow_dispatch:

# Prevent screenshot commit from re-triggering
concurrency:
  group: screenshots
  cancel-in-progress: false

jobs:
  screenshots:
    name: Generate Screenshots
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:18-alpine
        env:
          POSTGRES_USER: user
          POSTGRES_PASSWORD: password
          POSTGRES_DB: ws_scoring
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      POSTGRESQL_CONNECTION_STRING: postgresql://user:password@localhost:5432/ws_scoring
      PORT: 3000
      CORS_ALLOWED_ORIGIN: http://localhost:5173
      API_TARGET: http://localhost:3000
      NODE_ENV: development

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install app dependencies
        run: bun install --frozen-lockfile

      - name: Run database migrations
        run: bun run db:migrate

      - name: Seed database
        run: bun run db:seed

      - name: Seed test users
        run: bun run db:seed:users

      - name: Build frontend
        run: bun run build:app

      - name: Start API server
        run: |
          bun run dev:api &
          echo "Waiting for API server..."
          for i in $(seq 1 30); do
            curl -s http://localhost:3000/rpc > /dev/null && break
            sleep 1
          done
          echo "API server ready"

      - name: Start frontend dev server
        run: |
          bun run dev:app &
          echo "Waiting for Vite dev server..."
          for i in $(seq 1 30); do
            curl -s http://localhost:5173 > /dev/null && break
            sleep 1
          done
          echo "Vite dev server ready"

      - name: Install Playwright
        working-directory: e2e
        run: |
          npm ci
          npx playwright install --with-deps chromium

      - name: Create screenshots directory
        run: mkdir -p landing_page/screenshots

      - name: Run screenshot tests
        working-directory: e2e
        env:
          BASE_URL: http://localhost:5173
          API_URL: http://localhost:3000
        run: npx playwright test

      - name: Commit and push screenshots
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add landing_page/screenshots/
          git diff --staged --quiet || git commit -m "chore: update landing page screenshots [skip ci]"
          git push
```

**Key details:**
- Uses `[skip ci]` in the commit message to prevent re-triggering workflows
- PostgreSQL service container for real database
- Waits for both servers to be healthy before running Playwright
- Uses `concurrency` group to prevent parallel runs

**Step 2: Commit**

```bash
git add .github/workflows/screenshots.yml
git commit -m "feat: add GitHub Actions workflow for screenshot generation"
```

---

### Task 6: Update README.md with landing page link

**Files:**
- Modify: `README.md`

**Step 1: Add "See It In Action" section**

Add immediately after the disclaimer section (after line 14), before "## Features":

```markdown
## See It In Action

Check out the [WS Scoring Landing Page](https://danbim.github.io/ws-scoring/) to see the app in action with screenshots for judges, head judges, and spectators.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add landing page link to README"
```

---

### Task 7: Update CLAUDE.md with landing page maintenance instructions

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add maintenance section**

Add a new section at the end of `CLAUDE.md`:

```markdown
## Landing Page

The project has a public landing page at `landing_page/index.html` hosted on GitHub Pages.

### Landing Page Maintenance

When adding or changing user-facing features:
- Update `landing_page/index.html` feature descriptions to reflect the change
- If new screens/pages are added, consider adding Playwright screenshots in `e2e/screenshots.spec.ts` and updating the landing page layout
- Screenshots are auto-regenerated on push to main via `.github/workflows/screenshots.yml`

### E2E Screenshot Tests

- E2E tests live in `e2e/` with their own `package.json` (Playwright, isolated from main app)
- Run locally: `cd e2e && npm test` (requires app + seeded DB running)
- Screenshots saved to `landing_page/screenshots/`
- Test users created by `bun run db:seed:users` (judge1, judge2, headjudge)
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add landing page maintenance instructions to CLAUDE.md"
```

---

### Task 8: Configure GitHub Pages and repository website

**Step 1: Enable GitHub Pages**

Use the GitHub API to enable Pages from the `landing_page` directory on the `main` branch. This will be done after merging to main, but document it here:

```bash
gh api repos/danbim/ws-scoring/pages \
  --method POST \
  --field source='{"branch":"main","path":"/landing_page"}' \
  || echo "Pages may already be configured"
```

**Step 2: Set repository website URL**

```bash
gh repo edit danbim/ws-scoring --homepage "https://danbim.github.io/ws-scoring/"
```

**Step 3: Verify**

```bash
gh repo view danbim/ws-scoring --json homepageUrl
```

Expected: `{"homepageUrl":"https://danbim.github.io/ws-scoring/"}`

**Note:** GitHub Pages configuration requires the branch to be `main`. These commands should be run after merging the `landing-page` branch, or can be configured in advance (Pages will show 404 until the `landing_page` directory exists on main).

---

### Task 9: Add placeholder screenshots for development

Until the CI generates real screenshots, add placeholder images so the landing page doesn't show broken images during development.

**Files:**
- Create: `landing_page/screenshots/.gitkeep`

**Step 1: Create the screenshots directory with gitkeep**

```bash
mkdir -p landing_page/screenshots
touch landing_page/screenshots/.gitkeep
```

**Step 2: Commit**

```bash
git add landing_page/screenshots/.gitkeep
git commit -m "chore: add screenshots directory placeholder"
```

---

### Task 10: Local E2E test run and screenshot verification

This task verifies everything works end-to-end locally before merging.

**Prerequisites:** PostgreSQL running on port 5692 (worktree port), app seeded with data and test users.

**Step 1: Set up database and seed data**

```bash
bun run db:migrate
bun run db:seed
bun run db:seed:users
```

**Step 2: Start the app servers**

```bash
bun run dev:api &
bun run dev:app &
```

Wait for both to be ready.

**Step 3: Run Playwright screenshot tests**

```bash
cd e2e && BASE_URL=http://localhost:5433 API_URL=http://localhost:3260 npx playwright test
```

Expected: 3 tests pass, screenshots appear in `landing_page/screenshots/`.

**Step 4: Verify screenshots**

```bash
ls -la landing_page/screenshots/
```

Expected files:
- `judge-scoresheet-desktop.png`
- `judge-scoresheet-mobile.png`
- `judge-wave-modal-desktop.png`
- `judge-wave-modal-mobile.png`
- `judge-jump-modal-desktop.png`
- `judge-jump-modal-mobile.png`
- `headjudge-bracket-desktop.png`
- `headjudge-heats-desktop.png`
- `spectator-viewer-desktop.png`
- `spectator-viewer-mobile.png`

**Step 5: Open the landing page and verify it looks good**

```bash
open landing_page/index.html
```

Verify screenshots appear correctly in each section.

**Step 6: Commit screenshots (for the PR)**

```bash
git add landing_page/screenshots/*.png
git commit -m "chore: add initial landing page screenshots"
```

---

### Task 11: Final quality checks and PR

**Step 1: Run project quality checks**

```bash
bun format
bun check:fix
bun typecheck
bun run check:boundaries
```

Fix any issues found.

**Step 2: Commit any fixes**

```bash
git add -A
git diff --staged --quiet || git commit -m "chore: fix lint and formatting issues"
```

**Step 3: Create pull request**

```bash
gh pr create \
  --title "Add landing page with auto-generated screenshots" \
  --body "$(cat <<'EOF'
## Summary

- Add public landing page (`landing_page/index.html`) with Tailwind CDN
- Organize features by audience: Judges, Head Judges, Spectators
- Desktop + mobile screenshots for Judges and Spectators, desktop only for Head Judges
- Playwright E2E tests generate screenshots from seeded app
- GitHub Actions workflow auto-regenerates screenshots on push to main
- GitHub Pages serves from `landing_page/` directory on main
- Landing page linked from README.md
- CLAUDE.md updated with maintenance instructions

## Test plan

- [ ] Open `landing_page/index.html` in browser - verify layout and styling
- [ ] Run `cd e2e && npx playwright test` locally - verify all screenshots generated
- [ ] Verify screenshots appear correctly in the landing page
- [ ] Verify GitHub Actions workflow syntax is valid
- [ ] After merge, enable GitHub Pages and verify site is live

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```
