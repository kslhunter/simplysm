import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "../../..");
const errors = [];

// 1. Root package.json version check
const pkgPath = resolve(root, "package.json");
if (!existsSync(pkgPath)) {
  errors.push("package.json not found");
} else {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const major = parseInt(pkg.version?.split(".")[0], 10);
  if (Number.isNaN(major) || major < 13) {
    errors.push(`This skill requires simplysm v13+. Current: ${pkg.version}`);
  }

  // 3. Scripts check
  if (!pkg.scripts?.typecheck) {
    errors.push("'typecheck' script not defined in package.json");
  }
  if (!pkg.scripts?.lint) {
    errors.push("'lint' script not defined in package.json");
  }
}

// 2. pnpm workspace files
for (const f of ["pnpm-workspace.yaml", "pnpm-lock.yaml"]) {
  if (!existsSync(resolve(root, f))) {
    errors.push(`${f} not found`);
  }
}

// 4. Vitest config
if (!existsSync(resolve(root, "vitest.config.ts"))) {
  errors.push("vitest.config.ts not found");
}

if (errors.length > 0) {
  console.log("FAIL");
  for (const e of errors) console.log(`- ${e}`);
  process.exit(1);
} else {
  console.log("Environment OK");
}
