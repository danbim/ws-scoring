import { Glob } from "bun";

interface BoundaryRule {
  name: string;
  sourceGlob: string;
  forbiddenPattern: RegExp;
}

const RULES: BoundaryRule[] = [
  {
    name: "domain \u2192 infrastructure",
    sourceGlob: "src/domain/**/*.ts",
    forbiddenPattern: /from\s+["'][^"']*infrastructure[^"']*["']/,
  },
  {
    name: "domain \u2192 api",
    sourceGlob: "src/domain/**/*.ts",
    forbiddenPattern: /from\s+["'][^"']*\/api\/[^"']*["']/,
  },
  {
    name: "domain \u2192 app",
    sourceGlob: "src/domain/**/*.ts",
    forbiddenPattern: /from\s+["'][^"']*\/app\/[^"']*["']/,
  },
  {
    name: "infrastructure \u2192 api",
    sourceGlob: "src/infrastructure/**/*.ts",
    forbiddenPattern: /from\s+["'][^"']*\/api\/[^"']*["']/,
  },
  {
    name: "infrastructure \u2192 app",
    sourceGlob: "src/infrastructure/**/*.ts",
    forbiddenPattern: /from\s+["'][^"']*\/app\/[^"']*["']/,
  },
];

interface Violation {
  rule: string;
  file: string;
  line: number;
  text: string;
}

async function checkBoundaries(): Promise<Violation[]> {
  const violations: Violation[] = [];

  for (const rule of RULES) {
    const glob = new Glob(rule.sourceGlob);

    for await (const filePath of glob.scan({ cwd: "." })) {
      const file = Bun.file(filePath);
      const content = await file.text();
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip type-only imports — these don't create runtime dependencies
        if (/^\s*import\s+type\s/.test(line)) {
          continue;
        }

        if (rule.forbiddenPattern.test(line)) {
          violations.push({
            rule: rule.name,
            file: filePath,
            line: i + 1,
            text: line.trim(),
          });
        }
      }
    }
  }

  return violations;
}

const violations = await checkBoundaries();

if (violations.length > 0) {
  console.error("\nBOUNDARY VIOLATIONS FOUND:\n");

  for (const v of violations) {
    console.error(`  ${v.rule}`);
    console.error(`    ${v.file}:${v.line}`);
    console.error(`    ${v.text}\n`);
  }

  console.error(`${violations.length} violation(s) found.`);
  process.exit(1);
} else {
  console.log("All architecture boundaries OK.");
  process.exit(0);
}
