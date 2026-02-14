# esbuild Incremental Write Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Make esbuild watch mode only write files whose content actually changed, preventing unnecessary file copies by downstream watchers.

**Architecture:** Set esbuild `write: false` to get `outputFiles` in memory. Apply ESM import rewriting in-memory, compare with existing disk files, and write only changed ones. This replaces the current `esmRelativeImportPlugin` which reads/writes all files from disk on every build.

**Tech Stack:** esbuild, Node.js fs

---

### Task 1: Add `writeChangedOutputFiles` and update esbuild options

**Files:**
- Modify: `packages/sd-cli/src/utils/esbuild-config.ts`
- Create: `packages/sd-cli/tests/write-changed-output-files.spec.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import os from "os";
import fs from "fs/promises";
import type esbuild from "esbuild";
import { writeChangedOutputFiles } from "../src/utils/esbuild-config";

function makeOutputFile(filePath: string, text: string): esbuild.OutputFile {
  const contents = new TextEncoder().encode(text);
  return { path: filePath, contents, text, hash: "" };
}

describe("writeChangedOutputFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "esbuild-write-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("writes new files that don't exist on disk", async () => {
    const outFile = makeOutputFile(path.join(tmpDir, "index.js"), "const x = 1;\n");
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(path.join(tmpDir, "index.js"), "utf-8");
    expect(result).toBe("const x = 1;\n");
  });

  it("skips writing when content is identical", async () => {
    const filePath = path.join(tmpDir, "index.js");
    await fs.writeFile(filePath, "const x = 1;\n");
    const statBefore = await fs.stat(filePath);

    // Small delay to ensure mtime would differ if file were rewritten
    await new Promise((r) => setTimeout(r, 50));

    const outFile = makeOutputFile(filePath, "const x = 1;\n");
    await writeChangedOutputFiles([outFile]);

    const statAfter = await fs.stat(filePath);
    expect(statAfter.mtimeMs).toBe(statBefore.mtimeMs);
  });

  it("writes when content differs", async () => {
    const filePath = path.join(tmpDir, "index.js");
    await fs.writeFile(filePath, "const x = 1;\n");

    const outFile = makeOutputFile(filePath, "const x = 2;\n");
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(filePath, "utf-8");
    expect(result).toBe("const x = 2;\n");
  });

  it("adds .js extension to relative imports in .js files", async () => {
    const filePath = path.join(tmpDir, "index.js");
    const outFile = makeOutputFile(filePath, 'import { foo } from "./utils";\nexport { foo };\n');
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(filePath, "utf-8");
    expect(result).toBe('import { foo } from "./utils.js";\nexport { foo };\n');
  });

  it("does not add .js extension to imports that already have known extensions", async () => {
    const filePath = path.join(tmpDir, "index.js");
    const outFile = makeOutputFile(filePath, 'import "./styles.css";\nimport data from "./data.json";\n');
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(filePath, "utf-8");
    expect(result).toBe('import "./styles.css";\nimport data from "./data.json";\n');
  });

  it("does not rewrite imports in .js.map files", async () => {
    const filePath = path.join(tmpDir, "index.js.map");
    const content = '{"sources":["./utils"]}';
    const outFile = makeOutputFile(filePath, content);
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(filePath, "utf-8");
    expect(result).toBe(content);
  });

  it("creates parent directories if needed", async () => {
    const filePath = path.join(tmpDir, "sub", "deep", "index.js");
    const outFile = makeOutputFile(filePath, "export {};\n");
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(filePath, "utf-8");
    expect(result).toBe("export {};\n");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/sd-cli/tests/write-changed-output-files.spec.ts --project=node --run`
Expected: FAIL — `writeChangedOutputFiles` is not exported

**Step 3: Implement `writeChangedOutputFiles` and update `createLibraryEsbuildOptions`**

In `packages/sd-cli/src/utils/esbuild-config.ts`:

1. Remove the `esmRelativeImportPlugin` function (lines 16-44)
2. Remove the `glob` import (line 5 — no longer needed)
3. Add `write: false` to the return value in `createLibraryEsbuildOptions`
4. Update `createLibraryEsbuildOptions` plugins array — no longer includes `esmRelativeImportPlugin`
5. Add `writeChangedOutputFiles`:

```typescript
/**
 * esbuild outputFiles 중 실제로 변경된 파일만 디스크에 쓴다.
 *
 * - .js 파일: ESM 상대 import 경로에 .js 확장자를 추가한 후 비교
 * - 그 외 파일(.js.map 등): 원본 그대로 비교
 * - 기존 파일과 내용이 동일하면 쓰기를 건너뛰어 타임스탬프를 유지한다.
 */
export async function writeChangedOutputFiles(outputFiles: esbuild.OutputFile[]): Promise<void> {
  await Promise.all(
    outputFiles.map(async (file) => {
      const finalText = file.path.endsWith(".js")
        ? file.text.replace(
            /((?:from|import)\s*["'])(\.\.?\/[^"']*?)(["'])/g,
            (_match, prefix: string, importPath: string, suffix: string) => {
              if (/\.(js|mjs|cjs|json|css|wasm|node)$/i.test(importPath)) return _match;
              return `${prefix}${importPath}.js${suffix}`;
            },
          )
        : file.text;

      // Compare with existing file — skip write if unchanged
      try {
        const existing = await fs.readFile(file.path, "utf-8");
        if (existing === finalText) return;
      } catch {
        // File doesn't exist yet
      }

      await fs.mkdir(path.dirname(file.path), { recursive: true });
      await fs.writeFile(file.path, finalText);
    }),
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/sd-cli/tests/write-changed-output-files.spec.ts --project=node --run`
Expected: PASS — all 7 tests

**Step 5: Commit**

```bash
git add packages/sd-cli/src/utils/esbuild-config.ts packages/sd-cli/tests/write-changed-output-files.spec.ts
git commit -m "feat(sd-cli): add writeChangedOutputFiles for incremental writes"
```

---

### Task 2: Wire `writeChangedOutputFiles` into library worker

**Files:**
- Modify: `packages/sd-cli/src/workers/library.worker.ts`

**Step 1: Update imports**

Add `writeChangedOutputFiles` to the import from `../utils/esbuild-config`:

```typescript
import { createLibraryEsbuildOptions, getTypecheckEnvFromTarget, writeChangedOutputFiles } from "../utils/esbuild-config";
```

**Step 2: Update one-shot `build()` function**

In the `build()` function (around line 121), change:

```typescript
// Before:
const result = await esbuild.build(esbuildOptions);
const errors = result.errors.map((e) => e.text);

// After:
const result = await esbuild.build(esbuildOptions);
if (result.outputFiles) {
  await writeChangedOutputFiles(result.outputFiles);
}
const errors = result.errors.map((e) => e.text);
```

**Step 3: Update `createAndBuildContext()` watch-notify plugin**

In the `onEnd` callback (around line 179), add `writeChangedOutputFiles` call before sending events:

```typescript
pluginBuild.onEnd(async (result) => {
  // Write only changed files to disk
  if (result.outputFiles) {
    await writeChangedOutputFiles(result.outputFiles);
  }

  const errors = result.errors.map((e) => e.text);
  const success = result.errors.length === 0;

  sender.send("build", { success, errors: errors.length > 0 ? errors : undefined });

  if (isBuildFirstTime) {
    isBuildFirstTime = false;
    resolveFirstBuild?.();
  }
});
```

**Step 4: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS — no type errors

**Step 5: Run all sd-cli tests**

Run: `pnpm vitest packages/sd-cli --project=node --run`
Expected: PASS — all tests including the new ones

**Step 6: Integration test — one-shot build**

Run: `pnpm build solid`
Expected: Build succeeds, `packages/solid/dist/` contains output files

**Step 7: Commit**

```bash
git add packages/sd-cli/src/workers/library.worker.ts
git commit -m "feat(sd-cli): wire writeChangedOutputFiles into library worker"
```
