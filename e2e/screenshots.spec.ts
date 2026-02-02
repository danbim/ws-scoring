import path from "node:path";
import { type Page, test } from "@playwright/test";

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
    if ((await addWaveButtons.count()) > 0) {
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
      const submitButton = desktopPage
        .locator('button:has-text("Submit"), button:has-text("Save"), button:has-text("OK")')
        .first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
      }
      await desktopPage.waitForTimeout(500);

      // Add more wave scores for realism
      if ((await addWaveButtons.count()) > 0) {
        await addWaveButtons.first().click();
        await desktopPage.waitForTimeout(300);
        await desktopPage.locator('button:has-text("8")').first().click();
        const submitBtn = desktopPage
          .locator('button:has-text("Submit"), button:has-text("Save"), button:has-text("OK")')
          .first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
        }
        await desktopPage.waitForTimeout(500);
      }
    }

    // Add jump score
    const addJumpButtons = desktopPage.locator('button:has-text("Add Jump")');
    if ((await addJumpButtons.count()) > 0) {
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
      const submitJump = desktopPage
        .locator('button:has-text("Submit"), button:has-text("Save"), button:has-text("OK")')
        .first();
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
    if ((await mobileWaveButtons.count()) > 0) {
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
    if ((await mobileJumpButtons.count()) > 0) {
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

      const cancelBtn = mobilePage
        .locator('button:has-text("Cancel"), button:has-text("Back")')
        .first();
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
