# CLI `add` Command Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Split `init` into skeleton-only init + repeatable `add client` / `add server` commands for multi-client project support.

**Architecture:** Move client templates out of `init/` into `add-client/`, create new `add-server/` templates, and build a ts-morph-based config editor to reliably modify `sd.config.ts` and `eslint.config.ts` after package creation.

**Tech Stack:** TypeScript, ts-morph (AST), yargs (CLI), @inquirer/prompts, Handlebars

---

### Task 1: Add ts-morph dependency

**Files:**
- Modify: `packages/cli/package.json`

**Step 1: Install ts-morph**

Run: `pnpm add ts-morph --filter @simplysm/cli`

**Step 2: Commit**

```bash
git add packages/cli/package.json pnpm-lock.yaml
git commit -m "chore(cli): add ts-morph dependency for AST-based config editing"
```

---

### Task 2: Create config-editor utility with tests

This is the core utility that all `add` commands depend on. Uses ts-morph to modify `sd.config.ts` and `eslint.config.ts`.

**Files:**
- Create: `packages/cli/src/utils/config-editor.ts`
- Create: `packages/cli/tests/config-editor.spec.ts`

**Context — sd.config.ts structure:**

```typescript
import type { SdConfigFn } from "@simplysm/cli";

const config: SdConfigFn = () => ({
  packages: {
    "client-web": { target: "client" },
    "server": { target: "server" },
  },
});

export default config;
```

- `packages` is a property of the object literal returned by the arrow function assigned to `config`.
- Client-server relationship: client config has `server: "server-name"` (client → server, NOT server → clients).

**Context — eslint.config.ts structure:**

```typescript
import simplysmPlugin from "@simplysm/eslint-plugin";

export default [
  ...simplysmPlugin.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    settings: {
      tailwindcss: {
        config: "packages/client-web/tailwind.config.ts",
      },
    },
  },
];
```

**Step 1: Write the failing tests**

```typescript
// packages/cli/tests/config-editor.spec.ts
import { describe, test, expect, beforeEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { addPackageToSdConfig, setClientServerInSdConfig, addTailwindToEslintConfig } from "../src/utils/config-editor";

describe("config-editor", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-cli-test-"));
  });

  describe("addPackageToSdConfig", () => {
    test("adds client package to empty packages object", () => {
      const configPath = path.join(tmpDir, "sd.config.ts");
      fs.writeFileSync(
        configPath,
        [
          'import type { SdConfigFn } from "@simplysm/cli";',
          "",
          "const config: SdConfigFn = () => ({",
          "  packages: {},",
          "});",
          "",
          "export default config;",
        ].join("\n"),
      );

      addPackageToSdConfig(configPath, "client-web", { target: "client" });

      const result = fs.readFileSync(configPath, "utf-8");
      expect(result).toContain('"client-web"');
      expect(result).toContain('"client"');
    });

    test("adds server package to existing packages", () => {
      const configPath = path.join(tmpDir, "sd.config.ts");
      fs.writeFileSync(
        configPath,
        [
          'import type { SdConfigFn } from "@simplysm/cli";',
          "",
          "const config: SdConfigFn = () => ({",
          "  packages: {",
          '    "client-web": { target: "client" },',
          "  },",
          "});",
          "",
          "export default config;",
        ].join("\n"),
      );

      addPackageToSdConfig(configPath, "server", { target: "server" });

      const result = fs.readFileSync(configPath, "utf-8");
      expect(result).toContain('"client-web"');
      expect(result).toContain('"server"');
      expect(result).toContain('"server"');
    });

    test("returns false if package already exists", () => {
      const configPath = path.join(tmpDir, "sd.config.ts");
      fs.writeFileSync(
        configPath,
        [
          'import type { SdConfigFn } from "@simplysm/cli";',
          "",
          "const config: SdConfigFn = () => ({",
          "  packages: {",
          '    "client-web": { target: "client" },',
          "  },",
          "});",
          "",
          "export default config;",
        ].join("\n"),
      );

      const result = addPackageToSdConfig(configPath, "client-web", { target: "client" });

      expect(result).toBe(false);
    });
  });

  describe("setClientServerInSdConfig", () => {
    test("adds server field to client config", () => {
      const configPath = path.join(tmpDir, "sd.config.ts");
      fs.writeFileSync(
        configPath,
        [
          'import type { SdConfigFn } from "@simplysm/cli";',
          "",
          "const config: SdConfigFn = () => ({",
          "  packages: {",
          '    "client-web": { target: "client" },',
          "  },",
          "});",
          "",
          "export default config;",
        ].join("\n"),
      );

      setClientServerInSdConfig(configPath, "client-web", "server");

      const result = fs.readFileSync(configPath, "utf-8");
      expect(result).toContain('server: "server"');
    });
  });

  describe("addTailwindToEslintConfig", () => {
    test("adds tailwind settings to eslint config without tailwind", () => {
      const configPath = path.join(tmpDir, "eslint.config.ts");
      fs.writeFileSync(
        configPath,
        [
          'import simplysmPlugin from "@simplysm/eslint-plugin";',
          "",
          "export default [",
          "  ...simplysmPlugin.configs.recommended,",
          "];",
        ].join("\n"),
      );

      addTailwindToEslintConfig(configPath, "client-web");

      const result = fs.readFileSync(configPath, "utf-8");
      expect(result).toContain("tailwindcss");
      expect(result).toContain("packages/client-web/tailwind.config.ts");
    });

    test("does nothing if tailwind settings already exist", () => {
      const configPath = path.join(tmpDir, "eslint.config.ts");
      const original = [
        'import simplysmPlugin from "@simplysm/eslint-plugin";',
        "",
        "export default [",
        "  ...simplysmPlugin.configs.recommended,",
        "  {",
        '    files: ["**/*.{ts,tsx}"],',
        "    settings: {",
        "      tailwindcss: {",
        '        config: "packages/client-old/tailwind.config.ts",',
        "      },",
        "    },",
        "  },",
        "];",
      ].join("\n");
      fs.writeFileSync(configPath, original);

      const result = addTailwindToEslintConfig(configPath, "client-web");

      expect(result).toBe(false);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/cli/tests/config-editor.spec.ts --project=node --run`
Expected: FAIL — module not found

**Step 3: Implement config-editor**

```typescript
// packages/cli/src/utils/config-editor.ts
import { Project, SyntaxKind, type ObjectLiteralExpression, type PropertyAssignment } from "ts-morph";

/**
 * sd.config.ts에서 packages 객체 리터럴을 찾는다.
 *
 * 구조: const config: SdConfigFn = () => ({ packages: { ... } });
 * → ArrowFunction → ParenthesizedExpression → ObjectLiteral → "packages" property → ObjectLiteral
 */
function findPackagesObject(configPath: string): {
  project: Project;
  packagesObj: ObjectLiteralExpression;
} {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(configPath);

  // "config" 변수 선언 찾기
  const configVar = sourceFile.getVariableDeclarationOrThrow("config");
  const arrowFn = configVar.getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction);

  // 화살표 함수 본문에서 반환 객체 찾기
  const body = arrowFn.getBody();
  let returnObj: ObjectLiteralExpression;

  if (body.isKind(SyntaxKind.ParenthesizedExpression)) {
    returnObj = body.getExpressionIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  } else if (body.isKind(SyntaxKind.Block)) {
    const returnStmt = body.getFirstDescendantByKindOrThrow(SyntaxKind.ReturnStatement);
    returnObj = returnStmt.getExpressionIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  } else {
    throw new Error("sd.config.ts의 구조를 인식할 수 없습니다.");
  }

  // "packages" 프로퍼티 찾기
  const packagesProp = returnObj.getPropertyOrThrow("packages") as PropertyAssignment;
  const packagesObj = packagesProp.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

  return { project, packagesObj };
}

/**
 * sd.config.ts의 packages 객체에 새 패키지 항목을 추가한다.
 *
 * @returns true: 성공, false: 이미 존재
 */
export function addPackageToSdConfig(
  configPath: string,
  packageName: string,
  config: Record<string, unknown>,
): boolean {
  const { project, packagesObj } = findPackagesObject(configPath);

  // 이미 존재하는지 확인
  const existing = packagesObj.getProperty(`"${packageName}"`) ?? packagesObj.getProperty(packageName);
  if (existing) return false;

  // 새 프로퍼티 추가
  const configStr = JSON.stringify(config)
    .replace(/"([^"]+)":/g, "$1:")   // 프로퍼티 키 따옴표 제거
    .replace(/"/g, '"');              // 값은 따옴표 유지

  packagesObj.addPropertyAssignment({
    name: `"${packageName}"`,
    initializer: configStr,
  });

  project.saveSync();
  return true;
}

/**
 * sd.config.ts에서 특정 클라이언트의 server 필드를 설정한다.
 */
export function setClientServerInSdConfig(
  configPath: string,
  clientName: string,
  serverName: string,
): void {
  const { project, packagesObj } = findPackagesObject(configPath);

  const clientProp = (packagesObj.getProperty(`"${clientName}"`) ??
    packagesObj.getProperty(clientName)) as PropertyAssignment | undefined;
  if (clientProp == null) {
    throw new Error(`클라이언트 "${clientName}"을(를) sd.config.ts에서 찾을 수 없습니다.`);
  }

  const clientObj = clientProp.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

  // 기존 server 프로퍼티가 있으면 제거
  const serverProp = clientObj.getProperty("server");
  if (serverProp) serverProp.remove();

  // server 프로퍼티 추가
  clientObj.addPropertyAssignment({
    name: "server",
    initializer: `"${serverName}"`,
  });

  project.saveSync();
}

/**
 * eslint.config.ts에 tailwindcss 설정 블록을 추가한다.
 *
 * @returns true: 추가됨, false: 이미 존재
 */
export function addTailwindToEslintConfig(configPath: string, clientName: string): boolean {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(configPath);

  // default export 배열 찾기
  const defaultExport = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  // tailwindcss 설정이 이미 있는지 확인
  const text = defaultExport.getText();
  if (text.includes("tailwindcss")) return false;

  // 새 설정 객체 추가
  defaultExport.addElement(`{
    files: ["**/*.{ts,tsx}"],
    settings: {
      tailwindcss: {
        config: "packages/${clientName}/tailwind.config.ts",
      },
    },
  }`);

  project.saveSync();
  return true;
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/cli/tests/config-editor.spec.ts --project=node --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/cli/src/utils/config-editor.ts packages/cli/tests/config-editor.spec.ts
git commit -m "feat(cli): add ts-morph config editor for sd.config.ts and eslint.config.ts"
```

---

### Task 3: Restructure init templates

Move client templates out of `init/` and update root templates to generate skeleton-only output.

**Files:**
- Move: `packages/cli/templates/init/packages/__CLIENT__/` → `packages/cli/templates/add-client/__CLIENT__/`
- Modify: `packages/cli/templates/init/sd.config.ts.hbs`
- Modify: `packages/cli/templates/init/eslint.config.ts.hbs`
- Delete: `packages/cli/templates/init/packages/` directory (empty after move)

**Step 1: Create add-client template directory**

```bash
mkdir -p packages/cli/templates/add-client
mv packages/cli/templates/init/packages/__CLIENT__ packages/cli/templates/add-client/__CLIENT__
rmdir packages/cli/templates/init/packages
```

**Step 2: Update sd.config.ts.hbs — empty packages**

Replace content of `packages/cli/templates/init/sd.config.ts.hbs` with:

```handlebars
import type { SdConfigFn } from "@simplysm/cli";

const config: SdConfigFn = () => ({
  packages: {},
});

export default config;
```

**Step 3: Update eslint.config.ts.hbs — no tailwind**

Replace content of `packages/cli/templates/init/eslint.config.ts.hbs` with:

```handlebars
import simplysmPlugin from "@simplysm/eslint-plugin";

export default [
  ...simplysmPlugin.configs.recommended,
];
```

**Step 4: Commit**

```bash
git add packages/cli/templates/
git commit -m "refactor(cli): move client templates to add-client, simplify init templates"
```

---

### Task 4: Create server template

**Files:**
- Create: `packages/cli/templates/add-server/__SERVER__/package.json.hbs`
- Create: `packages/cli/templates/add-server/__SERVER__/src/main.ts.hbs`

**Step 1: Create server package.json template**

```handlebars
{
  "name": "@{{projectName}}/{{serverName}}",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "dependencies": {
    "@simplysm/service-server": "^13.0.0"
  }
}
```

**Step 2: Create server main.ts template**

Reference: `packages/solid-demo-server/src/main.ts` — the `ServiceServer` constructor takes `{ rootPath, port, services }`. In dev mode (`process.env["DEV"]`), the CLI handles server lifecycle, so `listen()` is skipped.

```handlebars
import { ServiceServer } from "@simplysm/service-server";

const server = new ServiceServer({
  rootPath: process.cwd(),
  port: {{port}},
  services: [],
});

if (!process.env["DEV"]) {
  await server.listen();
}
```

Template context variable `port` will default to `3000`.

**Step 3: Commit**

```bash
git add packages/cli/templates/add-server/
git commit -m "feat(cli): add server package template"
```

---

### Task 5: Modify init.ts — remove client logic

**Files:**
- Modify: `packages/cli/src/commands/init.ts`

**Step 1: Remove client prompts and update completion message**

The modified `runInit` function should:
1. Keep directory validation (empty check)
2. Keep project name validation
3. Remove client suffix prompt, router prompt
4. Remove `dirReplacements` (no `__CLIENT__` to replace)
5. Template context: only `{ projectName }`
6. Keep `pnpm install` + `sd-cli install`
7. Update completion message to guide `sd-cli add client`

```typescript
export async function runInit(_options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:init");

  // 1. 디렉토리 비어있는지 확인
  const entries = fs.readdirSync(cwd);
  if (entries.length > 0) {
    consola.error("디렉토리가 비어있지 않습니다. 빈 디렉토리에서 실행해주세요.");
    process.exitCode = 1;
    return;
  }

  // 2. 프로젝트명 검증
  const projectName = path.basename(cwd);
  if (!isValidScopeName(projectName)) {
    consola.error(
      `프로젝트 이름 "${projectName}"이(가) 유효하지 않습니다. 소문자, 숫자, 하이픈만 사용 가능합니다.`,
    );
    process.exitCode = 1;
    return;
  }

  // 3. 템플릿 렌더링
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "init");

  const context = { projectName };

  logger.info("프로젝트 파일 생성 중...");
  await renderTemplateDir(templateDir, cwd, context);
  logger.success("프로젝트 파일 생성 완료");

  // 4. pnpm install
  logger.info("pnpm install 실행 중...");
  await spawn("pnpm", ["install"], { cwd });
  logger.success("pnpm install 완료");

  // 5. sd-cli install (Claude Code 스킬 설치)
  logger.info("sd-cli install 실행 중...");
  await runInstall({});
  logger.success("sd-cli install 완료");

  // 6. 완료 메시지
  consola.box(
    [
      "프로젝트가 생성되었습니다!",
      "",
      "다음 단계:",
      "  sd-cli add client    클라이언트 패키지 추가",
      "  sd-cli add server    서버 패키지 추가",
    ].join("\n"),
  );
}
```

Remove the unused `confirm` import (only `input` was used for client suffix, and that's gone too). Remove unused `@inquirer/prompts` import entirely.

**Step 2: Commit**

```bash
git add packages/cli/src/commands/init.ts
git commit -m "refactor(cli): simplify init to skeleton-only, remove client creation"
```

---

### Task 6: Create add-client command

**Files:**
- Create: `packages/cli/src/commands/add-client.ts`

**Step 1: Implement add-client**

```typescript
// packages/cli/src/commands/add-client.ts
import path from "path";
import fs from "fs";
import { input, confirm } from "@inquirer/prompts";
import { consola } from "consola";
import { renderTemplateDir } from "../utils/template";
import { addPackageToSdConfig, addTailwindToEslintConfig } from "../utils/config-editor";
import { spawn } from "../utils/spawn";

//#region Types

export interface AddClientOptions {}

//#endregion

//#region Utilities

/**
 * import.meta.dirname에서 상위로 올라가며 package.json을 찾아 패키지 루트를 반환한다.
 */
function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("package.json을 찾을 수 없습니다.");
    dir = parent;
  }
  return dir;
}

//#endregion

//#region Main

/**
 * 클라이언트 패키지를 프로젝트에 추가한다.
 *
 * 1. 프로젝트 루트 확인 (sd.config.ts 존재)
 * 2. 대화형 프롬프트 (이름 접미사, 라우터 사용 여부)
 * 3. 패키지 디렉토리 중복 확인
 * 4. Handlebars 템플릿 렌더링
 * 5. sd.config.ts에 패키지 항목 추가 (ts-morph)
 * 6. eslint.config.ts에 tailwind 설정 추가 (첫 클라이언트인 경우)
 * 7. pnpm install
 */
export async function runAddClient(_options: AddClientOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:add-client");

  // 1. 프로젝트 루트 확인
  if (!fs.existsSync(path.join(cwd, "sd.config.ts"))) {
    consola.error("sd.config.ts를 찾을 수 없습니다. 프로젝트 루트에서 실행해주세요.");
    process.exitCode = 1;
    return;
  }

  // 프로젝트명 (루트 package.json의 name)
  const projectName = path.basename(cwd);

  // 2. 대화형 프롬프트
  const clientSuffix = await input({
    message: "클라이언트 이름을 입력하세요 (client-___):",
    validate: (value) => {
      if (!value.trim()) return "이름을 입력해주세요.";
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "소문자, 숫자, 하이픈만 사용 가능합니다.";
      return true;
    },
  });

  const useRouter = await confirm({
    message: "라우터를 사용하시겠습니까?",
    default: true,
  });

  const clientName = `client-${clientSuffix}`;

  // 3. 패키지 디렉토리 중복 확인
  const packageDir = path.join(cwd, "packages", clientName);
  if (fs.existsSync(packageDir)) {
    consola.error(`packages/${clientName} 디렉토리가 이미 존재합니다.`);
    process.exitCode = 1;
    return;
  }

  // 4. 템플릿 렌더링
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "add-client");

  const context = {
    projectName,
    clientSuffix,
    clientName,
    router: useRouter,
  };

  const dirReplacements = {
    __CLIENT__: clientName,
  };

  logger.info(`${clientName} 패키지 생성 중...`);
  await renderTemplateDir(templateDir, path.join(cwd, "packages"), context, dirReplacements);
  logger.success(`packages/${clientName} 생성 완료`);

  // 5. sd.config.ts 업데이트
  const sdConfigPath = path.join(cwd, "sd.config.ts");
  const added = addPackageToSdConfig(sdConfigPath, clientName, { target: "client" });
  if (added) {
    logger.success("sd.config.ts 업데이트 완료");
  } else {
    consola.warn(`"${clientName}"이(가) sd.config.ts에 이미 존재합니다.`);
  }

  // 6. eslint.config.ts tailwind 설정 추가 (첫 클라이언트인 경우)
  const eslintConfigPath = path.join(cwd, "eslint.config.ts");
  if (fs.existsSync(eslintConfigPath)) {
    const tailwindAdded = addTailwindToEslintConfig(eslintConfigPath, clientName);
    if (tailwindAdded) {
      logger.success("eslint.config.ts에 tailwind 설정 추가");
    }
  }

  // 7. pnpm install
  logger.info("pnpm install 실행 중...");
  await spawn("pnpm", ["install"], { cwd });
  logger.success("pnpm install 완료");

  // 완료
  consola.box(
    [
      `클라이언트 "${clientName}"이(가) 추가되었습니다!`,
      "",
      `  pnpm dev ${clientName}    개발 서버 실행`,
    ].join("\n"),
  );
}

//#endregion
```

**Step 2: Commit**

```bash
git add packages/cli/src/commands/add-client.ts
git commit -m "feat(cli): add add-client command"
```

---

### Task 7: Create add-server command

**Files:**
- Create: `packages/cli/src/commands/add-server.ts`

**Context:** When clients exist, user multi-selects which clients this server serves. The client configs get updated with `server: "server-name"` (client → server relationship, per `SdClientPackageConfig`).

**Step 1: Implement add-server**

```typescript
// packages/cli/src/commands/add-server.ts
import path from "path";
import fs from "fs";
import { input, checkbox } from "@inquirer/prompts";
import { consola } from "consola";
import { renderTemplateDir } from "../utils/template";
import { addPackageToSdConfig, setClientServerInSdConfig } from "../utils/config-editor";
import { spawn } from "../utils/spawn";

//#region Types

export interface AddServerOptions {}

//#endregion

//#region Utilities

function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("package.json을 찾을 수 없습니다.");
    dir = parent;
  }
  return dir;
}

/**
 * sd.config.ts를 읽어서 target이 "client"인 패키지명 목록을 반환한다.
 */
function findClientPackages(sdConfigPath: string): string[] {
  const content = fs.readFileSync(sdConfigPath, "utf-8");
  const clients: string[] = [];

  // 간단한 패턴 매칭으로 client 패키지 찾기
  // "package-name": { target: "client" ... }
  const regex = /"([^"]+)":\s*\{[^}]*target:\s*"client"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) != null) {
    clients.push(match[1]);
  }
  return clients;
}

//#endregion

//#region Main

/**
 * 서버 패키지를 프로젝트에 추가한다.
 *
 * 1. 프로젝트 루트 확인
 * 2. 대화형 프롬프트 (이름 접미사, 클라이언트 선택)
 * 3. 패키지 디렉토리 중복 확인
 * 4. Handlebars 템플릿 렌더링
 * 5. sd.config.ts에 서버 패키지 항목 추가
 * 6. 선택된 클라이언트의 server 필드 업데이트
 * 7. pnpm install
 */
export async function runAddServer(_options: AddServerOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:add-server");

  // 1. 프로젝트 루트 확인
  const sdConfigPath = path.join(cwd, "sd.config.ts");
  if (!fs.existsSync(sdConfigPath)) {
    consola.error("sd.config.ts를 찾을 수 없습니다. 프로젝트 루트에서 실행해주세요.");
    process.exitCode = 1;
    return;
  }

  const projectName = path.basename(cwd);

  // 2. 대화형 프롬프트
  const serverSuffix = await input({
    message: '서버 이름 접미사 (비워두면 "server"):',
    validate: (value) => {
      if (value.trim() === "") return true; // 빈 값 허용
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "소문자, 숫자, 하이픈만 사용 가능합니다.";
      return true;
    },
  });

  const serverName = serverSuffix.trim() === "" ? "server" : `server-${serverSuffix}`;

  // 클라이언트 선택 (기존 클라이언트가 있는 경우)
  const clientPackages = findClientPackages(sdConfigPath);
  let selectedClients: string[] = [];

  if (clientPackages.length > 0) {
    selectedClients = await checkbox({
      message: "이 서버가 서비스할 클라이언트를 선택하세요:",
      choices: clientPackages.map((name) => ({ name, value: name })),
    });
  }

  // 3. 패키지 디렉토리 중복 확인
  const packageDir = path.join(cwd, "packages", serverName);
  if (fs.existsSync(packageDir)) {
    consola.error(`packages/${serverName} 디렉토리가 이미 존재합니다.`);
    process.exitCode = 1;
    return;
  }

  // 4. 템플릿 렌더링
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "add-server");

  const context = {
    projectName,
    serverName,
    port: 3000,
  };

  const dirReplacements = {
    __SERVER__: serverName,
  };

  logger.info(`${serverName} 패키지 생성 중...`);
  await renderTemplateDir(templateDir, path.join(cwd, "packages"), context, dirReplacements);
  logger.success(`packages/${serverName} 생성 완료`);

  // 5. sd.config.ts에 서버 패키지 추가
  const added = addPackageToSdConfig(sdConfigPath, serverName, { target: "server" });
  if (added) {
    logger.success("sd.config.ts에 서버 패키지 추가 완료");
  } else {
    consola.warn(`"${serverName}"이(가) sd.config.ts에 이미 존재합니다.`);
  }

  // 6. 선택된 클라이언트의 server 필드 업데이트
  for (const clientName of selectedClients) {
    setClientServerInSdConfig(sdConfigPath, clientName, serverName);
    logger.info(`${clientName}의 서버를 "${serverName}"으로 설정`);
  }

  // 7. pnpm install
  logger.info("pnpm install 실행 중...");
  await spawn("pnpm", ["install"], { cwd });
  logger.success("pnpm install 완료");

  // 완료
  consola.box(`서버 "${serverName}"이(가) 추가되었습니다!`);
}

//#endregion
```

**Step 2: Commit**

```bash
git add packages/cli/src/commands/add-server.ts
git commit -m "feat(cli): add add-server command"
```

---

### Task 8: Register commands in sd-cli.ts and index.ts

**Files:**
- Modify: `packages/cli/src/sd-cli.ts`
- Modify: `packages/cli/src/index.ts`

**Step 1: Add `add` command with `client` and `server` subcommands to sd-cli.ts**

Insert after the `init` command registration (around line 233), before `install`:

```typescript
.command(
  "add",
  "프로젝트에 패키지를 추가한다.",
  (cmd) =>
    cmd
      .version(false)
      .hide("help")
      .command(
        "client",
        "클라이언트 패키지를 추가한다.",
        (subCmd) => subCmd.version(false).hide("help"),
        async () => {
          const { runAddClient } = await import("./commands/add-client.js");
          await runAddClient({});
        },
      )
      .command(
        "server",
        "서버 패키지를 추가한다.",
        (subCmd) => subCmd.version(false).hide("help"),
        async () => {
          const { runAddServer } = await import("./commands/add-server.js");
          await runAddServer({});
        },
      )
      .demandCommand(1, "패키지 타입을 지정해주세요. (client, server)"),
)
```

**Step 2: Add exports to index.ts**

Add after the existing `runInit` export:

```typescript
export { runAddClient, type AddClientOptions } from "./commands/add-client";
export { runAddServer, type AddServerOptions } from "./commands/add-server";
```

**Step 3: Commit**

```bash
git add packages/cli/src/sd-cli.ts packages/cli/src/index.ts
git commit -m "feat(cli): register add client/server subcommands"
```

---

### Task 9: Typecheck and lint

**Step 1: Run typecheck**

Run: `pnpm typecheck packages/cli`
Expected: PASS — no type errors

**Step 2: Run lint**

Run: `pnpm lint packages/cli`
Expected: PASS — no lint errors

**Step 3: Fix any issues found, then commit**

```bash
git add -A
git commit -m "fix(cli): resolve typecheck and lint issues"
```

---

### Task 10: Run config-editor tests

**Step 1: Run unit tests**

Run: `pnpm vitest packages/cli/tests/config-editor.spec.ts --project=node --run`
Expected: PASS — all tests green

**Step 2: Fix any failing tests, commit if needed**

---

### Summary of all changes

| File | Action | Description |
|------|--------|-------------|
| `packages/cli/package.json` | Modify | Add `ts-morph` dependency |
| `packages/cli/src/utils/config-editor.ts` | Create | ts-morph based config file editor |
| `packages/cli/tests/config-editor.spec.ts` | Create | Unit tests for config-editor |
| `packages/cli/templates/init/sd.config.ts.hbs` | Modify | Empty `packages: {}` |
| `packages/cli/templates/init/eslint.config.ts.hbs` | Modify | Remove tailwind settings |
| `packages/cli/templates/init/packages/` | Delete | Moved to add-client |
| `packages/cli/templates/add-client/__CLIENT__/` | Create (move) | Client template files |
| `packages/cli/templates/add-server/__SERVER__/` | Create | Server template files |
| `packages/cli/src/commands/init.ts` | Modify | Remove client logic, update message |
| `packages/cli/src/commands/add-client.ts` | Create | `sd-cli add client` command |
| `packages/cli/src/commands/add-server.ts` | Create | `sd-cli add server` command |
| `packages/cli/src/sd-cli.ts` | Modify | Register `add` subcommands |
| `packages/cli/src/index.ts` | Modify | Export new commands |
