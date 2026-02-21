import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";

const root = resolve(import.meta.dirname, "../../..");
const pathArg = process.argv[2];

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
  if (!pkg.scripts?.typecheck) {
    errors.push("'typecheck' script not defined in package.json");
  }
  if (!pkg.scripts?.lint) {
    errors.push("'lint' script not defined in package.json");
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

// ══════════════════════════════════════════
// Phase 2: Run 3 checks in parallel
// ══════════════════════════════════════════

const logDir = resolve(root, ".tmp/sd-check");

function runCommand(name, cmd, args) {
  return new Promise((res) => {
    const child = spawn(cmd, args, { cwd: root, shell: true, stdio: "pipe" });
    const chunks = [];

    child.stdout.on("data", (d) => chunks.push(d));
    child.stderr.on("data", (d) => chunks.push(d));

    child.on("close", (code) => {
      const output = Buffer.concat(chunks).toString("utf8");
      res({ name, code, output });
    });

    child.on("error", (err) => {
      res({ name, code: 1, output: err.message });
    });
  });
}

function extractTestCount(output) {
  const match =
    output.match(/(\d+)\s+tests?\s+passed/i) ??
    output.match(/Tests\s+(\d+)\s+passed/i) ??
    output.match(/(\d+)\s+pass/i);
  return match ? match[1] : null;
}

const checks = [
  { name: "TYPECHECK", cmd: "pnpm", args: pathArg ? ["typecheck", pathArg] : ["typecheck"] },
  { name: "LINT", cmd: "pnpm", args: pathArg ? ["lint", "--fix", pathArg] : ["lint", "--fix"] },
  { name: "TEST", cmd: "pnpm", args: pathArg ? ["vitest", pathArg, "--run"] : ["vitest", "--run"] },
];

const results = await Promise.all(checks.map((c) => runCommand(c.name, c.cmd, c.args)));

// ══════════════════════════════════════════
// Output results
// ══════════════════════════════════════════

const failed = [];
mkdirSync(logDir, { recursive: true });

for (const r of results) {
  const passed = r.code === 0;
  let label = passed ? "PASS" : "FAIL";

  if (passed && r.name === "TEST") {
    const count = extractTestCount(r.output);
    if (count) label = `PASS (${count} tests)`;
  }

  if (passed) {
    console.log(`\n${"=".repeat(6)} ${r.name}: ${label} ${"=".repeat(6)}`);
  } else {
    const logFile = resolve(logDir, `${r.name.toLowerCase()}.log`);
    writeFileSync(logFile, r.output, "utf8");
    console.log(`\n${"=".repeat(6)} ${r.name}: ${label} → ${logFile} ${"=".repeat(6)}`);
    failed.push(r.name.toLowerCase());
  }
}

console.log();
if (failed.length === 0) {
  console.log(`${"=".repeat(6)} SUMMARY: ALL PASSED ${"=".repeat(6)}`);
} else {
  console.log(
    `${"=".repeat(6)} SUMMARY: ${failed.length}/3 FAILED (${failed.join(", ")}) ${"=".repeat(6)}`,
  );
}

process.exit(failed.length > 0 ? 1 : 0);
