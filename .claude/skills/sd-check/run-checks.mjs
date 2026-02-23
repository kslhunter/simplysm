import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";

const root = resolve(import.meta.dirname, "../../..");

// ══════════════════════════════════════════
// Phase 1: Environment Pre-check
// ══════════════════════════════════════════

const errors = [];

const pkgPath = resolve(root, "package.json");
if (!existsSync(pkgPath)) {
  errors.push("package.json not found");
} else {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const major = parseInt(pkg.version?.split(".")[0], 10);
  if (Number.isNaN(major) || major < 13) {
    errors.push(`This skill requires simplysm v13+. Current: ${pkg.version}`);
  }
  if (!pkg.scripts?.check) {
    errors.push("'check' script not defined in package.json");
  }
}

for (const f of ["pnpm-workspace.yaml", "pnpm-lock.yaml"]) {
  if (!existsSync(resolve(root, f))) {
    errors.push(`${f} not found`);
  }
}

if (!existsSync(resolve(root, "vitest.config.ts"))) {
  errors.push("vitest.config.ts not found");
}

if (errors.length > 0) {
  console.log("ENV-CHECK FAIL");
  for (const e of errors) console.log(`- ${e}`);
  process.exit(1);
}

console.log("ENV-CHECK OK");

// ══════════════════════════════════════════
// Phase 2: Delegate to pnpm check
// ══════════════════════════════════════════

const args = ["check", ...process.argv.slice(2)];
const child = spawn("pnpm", args, { cwd: root, shell: true, stdio: "inherit" });

child.on("close", (code) => {
  process.exit(code ?? 1);
});
