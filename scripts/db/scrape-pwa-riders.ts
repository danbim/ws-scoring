// Standalone script to scrape PWA rider data and save to JSON
// Run this once to populate scripts/db/pwa-riders.json

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PWA_URL = "https://www.pwaworldtour.com/index.php?id=7";
const OUTPUT_FILE = join(__dirname, "pwa-riders.json");

// Parse command line arguments
// Default to fetching all pages, but allow limiting with --max-pages=N
const maxPagesArg = process.argv.find((arg) => arg.startsWith("--max-pages="));
const MAX_PAGES = maxPagesArg
  ? parseInt(maxPagesArg.split("=")[1] || "1", 10)
  : Number.MAX_SAFE_INTEGER;

// Country code mapping from sail number prefixes to ISO country codes
const COUNTRY_CODE_MAP: Record<string, string> = {
  // Common windsurfing country codes
  NC: "NC", // New Caledonia
  AWT: "AWT", // Antigua and Barbuda (AWT might be a special code)
  GRE: "GR", // Greece
  E: "ES", // Spain
  ESP: "ES", // Spain
  F: "FR", // France
  FRA: "FR", // France
  USA: "US", // United States
  JPN: "JP", // Japan
  J: "JP", // Japan
  CRO: "HR", // Croatia
  GER: "DE", // Germany
  NED: "NL", // Netherlands
  CV: "CV", // Cape Verde
  H: "HU", // Hungary
  K: "GB", // United Kingdom
  I: "IT", // Italy
  SBH: "BL", // Saint Barthélemy
  MEX: "MX", // Mexico
  AUS: "AU", // Australia
  GPE: "GP", // Guadeloupe
};

interface ScrapedRider {
  firstName: string;
  lastName: string;
  country: string;
  sailNumber: string;
}

function extractCountryFromSailNumber(sailNumber: string): string {
  // Try to match known prefixes
  for (const [prefix, countryCode] of Object.entries(COUNTRY_CODE_MAP)) {
    if (sailNumber.startsWith(prefix)) {
      return countryCode;
    }
  }

  // Extract first part before dash
  const parts = sailNumber.split("-");
  if (parts.length > 0) {
    const prefix = parts[0];
    // Check if it's a known prefix
    if (COUNTRY_CODE_MAP[prefix]) {
      return COUNTRY_CODE_MAP[prefix];
    }
    // Return prefix as-is if not found (might be a valid country code)
    return prefix;
  }

  return "";
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  // PWA website displays names in "Last First" format
  // Last part is first name, rest is last name
  const firstName = parts[parts.length - 1];
  const lastName = parts.slice(0, -1).join(" ");
  return { firstName, lastName };
}

async function scrapePwaRiders(): Promise<ScrapedRider[]> {
  console.log(`Fetching PWA riders from ${PWA_URL}...`);

  try {
    const response = await fetch(PWA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`Fetched ${html.length} bytes of HTML`);

    // Parse HTML - riders are in <li class="sailor-list-row"> elements
    // Structure:
    // <li class="sailor-list-row">
    //   <div class="sailor-country-flag nc"></div>
    //   <div class="sailor-sail-no">NC-42</div>
    //   <div class="sailor-name"><a href="...">Marc</a></div>
    // </li>

    const riders: ScrapedRider[] = [];
    const seenSailNumbers = new Set<string>();

    // Pattern to match sailor list rows
    const sailorRowPattern = /<li class="sailor-list-row">([\s\S]*?)<\/li>/gi;
    let rowMatch: RegExpExecArray | null = sailorRowPattern.exec(html);

    while (rowMatch !== null) {
      const rowHtml = rowMatch[1];

      // Extract sail number
      const sailNoMatch = rowHtml.match(/<div class="sailor-sail-no">([^<]+)<\/div>/i);
      if (!sailNoMatch) {
        rowMatch = sailorRowPattern.exec(html);
        continue;
      }

      const sailNumber = sailNoMatch[1].trim();

      // Skip if we've already seen this sail number
      if (seenSailNumbers.has(sailNumber)) {
        rowMatch = sailorRowPattern.exec(html);
        continue;
      }

      // Extract name from link
      const nameMatch = rowHtml.match(/<div class="sailor-name"><a[^>]*>([^<]+)<\/a><\/div>/i);
      if (!nameMatch) {
        rowMatch = sailorRowPattern.exec(html);
        continue;
      }

      const fullName = nameMatch[1].trim();

      // Extract country from flag class (optional, fallback to sail number parsing)
      let country = "";
      const flagMatch = rowHtml.match(/<div class="sailor-country-flag\s+(\w+)"><\/div>/i);
      if (flagMatch) {
        const flagClass = flagMatch[1].toLowerCase();
        // Map flag class to country code
        const flagToCountry: Record<string, string> = {
          nc: "NC",
          awt: "AWT",
          gre: "GR",
          es: "ES",
          esp: "ES",
          f: "FR",
          fra: "FR",
          usa: "US",
          jpn: "JP",
          j: "JP",
          cro: "HR",
          ger: "DE",
          ned: "NL",
          cv: "CV",
          h: "HU",
          k: "GB",
          i: "IT",
          sbh: "BL",
          mex: "MX",
          aus: "AU",
          gpe: "GP",
        };
        country = flagToCountry[flagClass] || extractCountryFromSailNumber(sailNumber);
      } else {
        country = extractCountryFromSailNumber(sailNumber);
      }

      const { firstName, lastName } = parseName(fullName);

      if (firstName && sailNumber && firstName.length > 1) {
        seenSailNumbers.add(sailNumber);
        riders.push({
          firstName,
          lastName,
          country,
          sailNumber,
        });
      }
      rowMatch = sailorRowPattern.exec(html);
    }
    console.log(`  Found ${riders.length} riders on page 1`);

    // Handle pagination - fetch all pages
    // Extract total number of pages and cHash from pagination
    const pageLinks = html.match(/<a class="page"[^>]*href="([^"]+)"[^>]*>(\d+)<\/a>/g);
    const pageHashMap = new Map<number, string>();

    if (pageLinks && pageLinks.length > 0) {
      const pageNumbers: number[] = [];
      for (const link of pageLinks) {
        // Extract page number
        const pageMatch = link.match(/>(\d+)</);
        if (!pageMatch) continue;
        const pageNum = parseInt(pageMatch[1], 10);
        pageNumbers.push(pageNum);

        // Extract cHash from href
        const hrefMatch = link.match(/href="[^"]*cHash=([^"&]+)/);
        if (hrefMatch) {
          pageHashMap.set(pageNum, hrefMatch[1]);
        }
      }
      const maxPage = Math.max(...pageNumbers);

      // Limit pages based on command line argument or fetch all
      const pagesToFetch = Math.min(maxPage, MAX_PAGES);
      if (MAX_PAGES === Number.MAX_SAFE_INTEGER) {
        console.log(`Found ${maxPage} pages, fetching all pages...`);
      } else {
        console.log(`Found ${maxPage} pages, fetching first ${pagesToFetch} pages...`);
      }

      // Helper function to fetch with timeout
      async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
        // #region agent log
        fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "scrape-pwa-riders.ts:188",
            message: "fetchWithTimeout called",
            data: { url, timeoutMs },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "C",
          }),
        }).catch(() => {});
        // #endregion

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:192",
              message: "Timeout triggered",
              data: { url },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "C",
            }),
          }).catch(() => {});
          // #endregion
          controller.abort();
        }, timeoutMs);

        try {
          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:198",
              message: "About to call fetch",
              data: { url, hasSignal: true },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "B,C",
            }),
          }).catch(() => {});
          // #endregion

          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
            },
          });

          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:210",
              message: "Fetch returned",
              data: {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url: response.url,
                finalUrl: response.url,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "B,C,D",
            }),
          }).catch(() => {});
          // #endregion

          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:217",
              message: "Fetch error caught",
              data: {
                errorName: error instanceof Error ? error.name : "unknown",
                errorMessage: error instanceof Error ? error.message : String(error),
                url,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "C",
            }),
          }).catch(() => {});
          // #endregion

          clearTimeout(timeoutId);
          throw error;
        }
      }

      // Fetch remaining pages
      for (let page = 2; page <= pagesToFetch; page++) {
        try {
          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:195",
              message: "Starting page fetch",
              data: { page, pagesToFetch },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "A,B,C",
            }),
          }).catch(() => {});
          // #endregion

          // Build URL with cHash if available
          const cHash = pageHashMap.get(page);
          let pageUrl = `https://www.pwaworldtour.com/index.php?id=7&tx_pwasailor_pi1%5Bpage%5D=${page}`;
          if (cHash) {
            pageUrl += `&cHash=${cHash}`;
          }
          console.log(`  Fetching page ${page}/${pagesToFetch}...`);

          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:363",
              message: "Page URL with cHash",
              data: { page, pageUrl, hasCHash: !!cHash },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "A",
            }),
          }).catch(() => {});
          // #endregion

          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:201",
              message: "URL constructed",
              data: { pageUrl, page },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "A",
            }),
          }).catch(() => {});
          // #endregion

          // Add a small delay between requests to avoid rate limiting
          if (page > 2) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:208",
              message: "About to call fetchWithTimeout",
              data: { pageUrl },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "C",
            }),
          }).catch(() => {});
          // #endregion

          const pageResponse = await fetchWithTimeout(pageUrl, 10000);

          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:213",
              message: "Fetch completed",
              data: {
                status: pageResponse.status,
                statusText: pageResponse.statusText,
                ok: pageResponse.ok,
                url: pageResponse.url,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "B,C,D",
            }),
          }).catch(() => {});
          // #endregion

          if (!pageResponse.ok) {
            console.warn(`  ⚠ Failed to fetch page ${page}: HTTP ${pageResponse.status}`);
            continue;
          }

          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:220",
              message: "About to read response text",
              data: { page },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "E",
            }),
          }).catch(() => {});
          // #endregion

          const pageHtml = await pageResponse.text();

          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:225",
              message: "Response text received",
              data: { page, htmlLength: pageHtml.length, firstChars: pageHtml.substring(0, 200) },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "E",
            }),
          }).catch(() => {});
          // #endregion

          // Create a new regex for each page to avoid state issues
          const pageSailorRowPattern = /<li class="sailor-list-row">([\s\S]*?)<\/li>/gi;
          let pageRowMatch = pageSailorRowPattern.exec(pageHtml);
          let pageRiderCount = 0;
          let loopIterations = 0;
          let skippedAlreadySeen = 0;
          let skippedNoSailMatch = 0;
          let skippedNoNameMatch = 0;

          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:232",
              message: "Starting regex loop",
              data: {
                page,
                initialMatch: pageRowMatch !== null,
                seenSailNumbersCount: seenSailNumbers.size,
                htmlLength: pageHtml.length,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "A,B,C",
            }),
          }).catch(() => {});
          // #endregion

          while (pageRowMatch !== null) {
            loopIterations++;

            // #region agent log
            if (loopIterations % 10 === 0) {
              fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  location: "scrape-pwa-riders.ts:245",
                  message: "Loop iteration",
                  data: { page, loopIterations, pageRiderCount },
                  timestamp: Date.now(),
                  sessionId: "debug-session",
                  runId: "run1",
                  hypothesisId: "E",
                }),
              }).catch(() => {});
            }
            // #endregion

            const rowHtml = pageRowMatch[1];

            // Extract sail number
            const sailNoMatch = rowHtml.match(/<div class="sailor-sail-no">([^<]+)<\/div>/i);
            if (!sailNoMatch) {
              skippedNoSailMatch++;
              pageRowMatch = pageSailorRowPattern.exec(pageHtml);
              continue;
            }

            const sailNumber = sailNoMatch[1].trim();

            // Skip if we've already seen this sail number
            if (seenSailNumbers.has(sailNumber)) {
              skippedAlreadySeen++;
              // #region agent log
              if (skippedAlreadySeen <= 5) {
                fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    location: "scrape-pwa-riders.ts:500",
                    message: "Skipping already seen rider",
                    data: { page, sailNumber, seenSailNumbersCount: seenSailNumbers.size },
                    timestamp: Date.now(),
                    sessionId: "debug-session",
                    runId: "run1",
                    hypothesisId: "C",
                  }),
                }).catch(() => {});
              }
              // #endregion
              pageRowMatch = pageSailorRowPattern.exec(pageHtml);
              continue;
            }

            // Extract name from link
            const nameMatch = rowHtml.match(
              /<div class="sailor-name"><a[^>]*>([^<]+)<\/a><\/div>/i
            );
            if (!nameMatch) {
              skippedNoNameMatch++;
              // #region agent log
              if (skippedNoNameMatch <= 3) {
                fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    location: "scrape-pwa-riders.ts:508",
                    message: "No name match found",
                    data: { page, sailNumber, rowHtmlSample: rowHtml.substring(0, 200) },
                    timestamp: Date.now(),
                    sessionId: "debug-session",
                    runId: "run1",
                    hypothesisId: "A,B",
                  }),
                }).catch(() => {});
              }
              // #endregion
              pageRowMatch = pageSailorRowPattern.exec(pageHtml);
              continue;
            }

            const fullName = nameMatch[1].trim();

            // Extract country from flag class
            let country = "";
            const flagMatch = rowHtml.match(/<div class="sailor-country-flag\s+(\w+)"><\/div>/i);
            if (flagMatch) {
              const flagClass = flagMatch[1].toLowerCase();
              const flagToCountry: Record<string, string> = {
                nc: "NC",
                awt: "AWT",
                gre: "GR",
                es: "ES",
                esp: "ES",
                f: "FR",
                fra: "FR",
                usa: "US",
                jpn: "JP",
                j: "JP",
                cro: "HR",
                ger: "DE",
                ned: "NL",
                cv: "CV",
                h: "HU",
                k: "GB",
                i: "IT",
                sbh: "BL",
                mex: "MX",
                aus: "AU",
                gpe: "GP",
              };
              country = flagToCountry[flagClass] || extractCountryFromSailNumber(sailNumber);
            } else {
              country = extractCountryFromSailNumber(sailNumber);
            }

            const { firstName, lastName } = parseName(fullName);

            if (firstName && sailNumber && firstName.length > 1) {
              seenSailNumbers.add(sailNumber);
              riders.push({
                firstName,
                lastName,
                country,
                sailNumber,
              });
              pageRiderCount++;
            }
            pageRowMatch = pageSailorRowPattern.exec(pageHtml);
          }

          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:295",
              message: "Regex loop completed",
              data: {
                page,
                pageRiderCount,
                loopIterations,
                skippedAlreadySeen,
                skippedNoSailMatch,
                skippedNoNameMatch,
                seenSailNumbersCount: seenSailNumbers.size,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "A,B,C",
            }),
          }).catch(() => {});
          // #endregion

          console.log(`    Found ${pageRiderCount} riders on page ${page}`);

          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/0d0dddb2-c8c1-40a9-ad0b-96c634608ca5", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "scrape-pwa-riders.ts:581",
              message: "After page processing",
              data: { page, pageRiderCount },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "E",
            }),
          }).catch(() => {});
          // #endregion
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            console.warn(`  ⚠ Timeout fetching page ${page} (skipping)`);
          } else {
            console.warn(
              `  ⚠ Error fetching page ${page}:`,
              error instanceof Error ? error.message : String(error)
            );
          }
          // Continue to next page instead of stopping
        }
      }
    }

    console.log(`Found ${riders.length} unique riders`);
    return riders;
  } catch (error) {
    console.error("Error scraping PWA riders:", error);
    throw error;
  }
}

async function main() {
  try {
    const riders = await scrapePwaRiders();

    if (riders.length === 0) {
      console.error("No riders found. The HTML structure may have changed.");
      process.exit(1);
    }

    // Write to JSON file
    await Bun.write(OUTPUT_FILE, JSON.stringify(riders, null, 2));

    console.log(`\n✓ Successfully scraped ${riders.length} riders`);
    console.log(`✓ Saved to ${OUTPUT_FILE}`);
    console.log("\nSample riders:");
    riders.slice(0, 5).forEach((rider) => {
      console.log(
        `  ${rider.sailNumber} - ${rider.firstName} ${rider.lastName} (${rider.country})`
      );
    });
  } catch (error) {
    console.error("Failed to scrape PWA riders:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
