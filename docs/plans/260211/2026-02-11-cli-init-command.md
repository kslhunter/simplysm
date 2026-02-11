# CLI `init` Command Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `sd-cli init` 명령어를 추가하여 새 Simplysm 애플리케이션 프로젝트(모노레포 + SolidJS 클라이언트)를 스캐폴딩한다.

**Architecture:** Handlebars 템플릿 파일을 CLI 패키지의 `templates/init/` 디렉토리에 저장하고, 재사용 가능한 `renderTemplateDir()` 유틸리티로 렌더링한다. 대화형 프롬프트는 `@inquirer/prompts`를 사용한다.

**Tech Stack:** Handlebars, @inquirer/prompts, @simplysm/core-node (fs 유틸리티)

---

### Task 1: 의존성 추가

**Files:**
- Modify: `packages/cli/package.json`

**Step 1: 의존성 추가**

`packages/cli/package.json`의 `dependencies`에 추가:

```json
"handlebars": "^4.7.8",
"@inquirer/prompts": "^7.5.3"
```

**Step 2: 설치**

Run: `pnpm install`

**Step 3: Commit**

```bash
git add packages/cli/package.json pnpm-lock.yaml
git commit -m "feat(cli): add handlebars and @inquirer/prompts dependencies"
```

---

### Task 2: 템플릿 렌더링 유틸리티 작성

**Files:**
- Create: `packages/cli/src/utils/template.ts`
- Test: `packages/cli/tests/template.spec.ts`

**Step 1: 테스트 작성**

`packages/cli/tests/template.spec.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import os from "os";
import fs from "fs";
import { renderTemplateDir } from "../src/utils/template";

describe("renderTemplateDir", () => {
  let tmpDir: string;
  let srcDir: string;
  let destDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-template-test-"));
    srcDir = path.join(tmpDir, "src");
    destDir = path.join(tmpDir, "dest");
    fs.mkdirSync(srcDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test("renders .hbs files with context and removes .hbs extension", async () => {
    fs.writeFileSync(path.join(srcDir, "hello.txt.hbs"), "Hello, {{name}}!");
    await renderTemplateDir(srcDir, destDir, { name: "World" });
    expect(fs.readFileSync(path.join(destDir, "hello.txt"), "utf-8")).toBe("Hello, World!");
  });

  test("copies non-.hbs files as-is (binary safe)", async () => {
    const binaryData = Uint8Array.from([0x00, 0x01, 0xff, 0xfe]);
    fs.writeFileSync(path.join(srcDir, "icon.bin"), binaryData);
    await renderTemplateDir(srcDir, destDir, {});
    const copied = fs.readFileSync(path.join(destDir, "icon.bin"));
    expect(Buffer.from(copied)).toEqual(Buffer.from(binaryData));
  });

  test("replaces directory name placeholders", async () => {
    const subDir = path.join(srcDir, "__CLIENT__");
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, "file.txt.hbs"), "pkg: {{clientName}}");
    await renderTemplateDir(srcDir, destDir, { clientName: "client-admin" }, { __CLIENT__: "client-admin" });
    expect(fs.readFileSync(path.join(destDir, "client-admin", "file.txt"), "utf-8")).toBe("pkg: client-admin");
  });

  test("skips file when .hbs renders to empty/whitespace", async () => {
    fs.writeFileSync(path.join(srcDir, "optional.ts.hbs"), "{{#if enabled}}content{{/if}}");
    await renderTemplateDir(srcDir, destDir, { enabled: false });
    expect(fs.existsSync(path.join(destDir, "optional.ts"))).toBe(false);
  });

  test("handles nested directories", async () => {
    fs.mkdirSync(path.join(srcDir, "a", "b"), { recursive: true });
    fs.writeFileSync(path.join(srcDir, "a", "b", "deep.txt.hbs"), "{{value}}");
    await renderTemplateDir(srcDir, destDir, { value: "nested" });
    expect(fs.readFileSync(path.join(destDir, "a", "b", "deep.txt"), "utf-8")).toBe("nested");
  });

  test("preserves Handlebars {{#if}} conditional blocks", async () => {
    fs.writeFileSync(
      path.join(srcDir, "test.txt.hbs"),
      "start\n{{#if flag}}included\n{{/if}}end",
    );
    await renderTemplateDir(srcDir, destDir, { flag: true });
    expect(fs.readFileSync(path.join(destDir, "test.txt"), "utf-8")).toBe("start\nincluded\nend");
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `pnpm vitest packages/cli/tests/template.spec.ts --project=node --run`
Expected: FAIL (module not found)

**Step 3: 구현 작성**

`packages/cli/src/utils/template.ts`:

```typescript
import path from "path";
import Handlebars from "handlebars";
import { fsExists, fsMkdir, fsRead, fsWrite, fsReaddir, fsStat, fsCopy } from "@simplysm/core-node";

/**
 * 템플릿 디렉토리를 재귀적으로 순회하며 Handlebars 렌더링 후 파일을 생성한다.
 *
 * - `.hbs` 확장자 파일: Handlebars 컴파일 → `.hbs` 제거한 이름으로 저장
 * - `.hbs` 결과가 빈 문자열/공백만이면: 파일 생성 스킵
 * - 나머지 파일: 바이너리로 그대로 복사
 *
 * @param srcDir - 템플릿 소스 디렉토리
 * @param destDir - 출력 대상 디렉토리
 * @param context - Handlebars 템플릿 변수
 * @param dirReplacements - 디렉토리 이름 치환 맵 (예: `{ __CLIENT__: "client-admin" }`)
 */
export async function renderTemplateDir(
  srcDir: string,
  destDir: string,
  context: Record<string, unknown>,
  dirReplacements?: Record<string, string>,
): Promise<void> {
  await fsMkdir(destDir);

  const entries = await fsReaddir(srcDir);

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry);
    const stat = await fsStat(srcPath);

    if (stat.isDirectory()) {
      // 디렉토리 이름 치환 적용
      const destName = dirReplacements?.[entry] ?? entry;
      await renderTemplateDir(path.join(srcDir, entry), path.join(destDir, destName), context, dirReplacements);
    } else if (entry.endsWith(".hbs")) {
      // Handlebars 템플릿 렌더링
      const source = await fsRead(srcPath);
      const template = Handlebars.compile(source, { noEscape: true });
      const result = template(context);

      // 빈 결과면 파일 생성 스킵
      if (result.trim().length === 0) continue;

      const destFileName = entry.slice(0, -4); // .hbs 제거
      await fsWrite(path.join(destDir, destFileName), result);
    } else {
      // 바이너리 파일은 그대로 복사
      await fsCopy(srcPath, path.join(destDir, entry));
    }
  }
}
```

**Step 4: 테스트 통과 확인**

Run: `pnpm vitest packages/cli/tests/template.spec.ts --project=node --run`
Expected: PASS

**Step 5: index.ts에 export 추가**

`packages/cli/src/index.ts`에 추가:

```typescript
export { renderTemplateDir } from "./utils/template";
```

**Step 6: Commit**

```bash
git add packages/cli/src/utils/template.ts packages/cli/tests/template.spec.ts packages/cli/src/index.ts
git commit -m "feat(cli): add template rendering utility"
```

---

### Task 3: 루트 레벨 템플릿 파일 작성

**Files:**
- Create: `packages/cli/templates/init/package.json.hbs`
- Create: `packages/cli/templates/init/pnpm-workspace.yaml.hbs`
- Create: `packages/cli/templates/init/sd.config.ts.hbs`
- Create: `packages/cli/templates/init/tsconfig.json.hbs`
- Create: `packages/cli/templates/init/eslint.config.ts.hbs`
- Create: `packages/cli/templates/init/.prettierrc.yaml.hbs`
- Create: `packages/cli/templates/init/.prettierignore.hbs`
- Create: `packages/cli/templates/init/.gitignore.hbs`
- Create: `packages/cli/templates/init/mise.toml.hbs`

**Step 1: 루트 package.json 템플릿**

`packages/cli/templates/init/package.json.hbs`:

```hbs
{
  "name": "{{projectName}}",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "scripts": {
    "typecheck": "sd-cli typecheck",
    "lint": "sd-cli lint",
    "lint:fix": "sd-cli lint --fix",
    "dev": "sd-cli dev",
    "build": "sd-cli build"
  },
  "devDependencies": {
    "@simplysm/cli": "^13.0.0",
    "@simplysm/eslint-plugin": "^13.0.0",
    "@types/node": "^20.19.33",
    "eslint": "^9.39.2",
    "prettier": "^3.8.1",
    "solid-js": "^1.9.11",
    "tailwindcss": "^3.4.19",
    "typescript": "~5.9.3",
    "vite": "^7.3.1",
    "vite-plugin-solid": "^2.11.10",
    "vite-tsconfig-paths": "^6.1.0"
  }
}
```

**Step 2: pnpm-workspace.yaml 템플릿**

`packages/cli/templates/init/pnpm-workspace.yaml.hbs`:

```hbs
packages:
  - packages/*
```

**Step 3: sd.config.ts 템플릿**

`packages/cli/templates/init/sd.config.ts.hbs`:

```hbs
import type { SdConfigFn } from "@simplysm/cli";

const config: SdConfigFn = () => ({
  packages: {
    "{{clientName}}": { target: "client" },
  },
});

export default config;
```

**Step 4: tsconfig.json 템플릿**

`packages/cli/templates/init/tsconfig.json.hbs`:

```hbs
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",

    "jsx": "preserve",
    "jsxImportSource": "solid-js",

    "strict": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noImplicitAny": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "useDefineForClassFields": true,

    "esModuleInterop": true,
    "verbatimModuleSyntax": true,

    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "importHelpers": true,

    "baseUrl": ".",
    "paths": {
      "@{{projectName}}/*": ["packages/*/src/index.ts"]
    }
  },
  "include": [
    "*.ts",
    "packages/*/*.ts",
    "packages/*/src/**/*.ts",
    "packages/*/src/**/*.tsx"
  ]
}
```

**Step 5: eslint.config.ts 템플릿**

`packages/cli/templates/init/eslint.config.ts.hbs`:

```hbs
import simplysmPlugin from "@simplysm/eslint-plugin";

export default [
  ...simplysmPlugin.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    settings: {
      tailwindcss: {
        config: "packages/{{clientName}}/tailwind.config.ts",
      },
    },
  },
];
```

**Step 6: .prettierrc.yaml 템플릿**

`packages/cli/templates/init/.prettierrc.yaml.hbs`:

```hbs
printWidth: 120
tabWidth: 2
useTabs: false
semi: true
quoteProps: consistent
trailingComma: all
bracketSpacing: true
bracketSameLine: false
arrowParens: always
endOfLine: lf
htmlWhitespaceSensitivity: ignore
embeddedLanguageFormatting: auto
```

**Step 7: .prettierignore 템플릿**

`packages/cli/templates/init/.prettierignore.hbs`:

```hbs
*.md
```

**Step 8: .gitignore 템플릿**

`packages/cli/templates/init/.gitignore.hbs`:

```hbs
.cache
node_modules
packages/*/dist

packages/*/src/**/*.js
packages/*/src/**/*.js.map
packages/*/src/**/*.d.ts
packages/*/src/**/*.d.ts.map
```

**Step 9: mise.toml 템플릿**

`packages/cli/templates/init/mise.toml.hbs`:

```hbs
[tools]
node = "20"
```

**Step 10: Commit**

```bash
git add packages/cli/templates/init/
git commit -m "feat(cli): add root-level init template files"
```

---

### Task 4: 클라이언트 패키지 템플릿 파일 작성

**Files:**
- Create: `packages/cli/templates/init/packages/__CLIENT__/package.json.hbs`
- Create: `packages/cli/templates/init/packages/__CLIENT__/index.html.hbs`
- Create: `packages/cli/templates/init/packages/__CLIENT__/tailwind.config.ts.hbs`
- Create: `packages/cli/templates/init/packages/__CLIENT__/src/main.tsx.hbs`
- Create: `packages/cli/templates/init/packages/__CLIENT__/src/App.tsx.hbs`
- Create: `packages/cli/templates/init/packages/__CLIENT__/src/main.css.hbs`
- Create: `packages/cli/templates/init/packages/__CLIENT__/src/appStructure.ts.hbs`
- Create: `packages/cli/templates/init/packages/__CLIENT__/src/pages/HomePage.tsx.hbs`
- Copy: `packages/cli/templates/init/packages/__CLIENT__/public/favicon.ico` (solid-demo의 favicon.ico를 복사)

**Step 1: 클라이언트 package.json**

`packages/cli/templates/init/packages/__CLIENT__/package.json.hbs`:

```hbs
{
  "name": "@{{projectName}}/{{clientName}}",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "dependencies": {
    "@simplysm/solid": "^13.0.0",
{{#if router}}
    "@solidjs/router": "^0.15.4",
{{/if}}
    "solid-js": "^1.9.11"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.19"
  }
}
```

**Step 2: index.html**

`packages/cli/templates/init/packages/__CLIENT__/index.html.hbs`:

```hbs
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="favicon.ico" />
    <title>{{projectName}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="src/main.tsx"></script>
  </body>
</html>
```

**Step 3: tailwind.config.ts**

`packages/cli/templates/init/packages/__CLIENT__/tailwind.config.ts.hbs`:

```hbs
import simplysmPreset from "@simplysm/solid/tailwind.config";

const __dirname = new URL(".", import.meta.url).pathname
  .replace(/^\/[^/]+\/@fs/, "")
  .replace(/index\.ts$/, "");

export default {
  darkMode: "class",
  presets: [simplysmPreset],
  content: [`${__dirname}index.html`, `${__dirname}src/**/*.{ts,tsx}`, ...simplysmPreset.content],
};
```

**Step 4: main.tsx (라우터 조건 분기)**

`packages/cli/templates/init/packages/__CLIENT__/src/main.tsx.hbs`:

```hbs
{{#if router}}
import { render } from "solid-js/web";
import { HashRouter, Route } from "@solidjs/router";
import { App } from "./App";
import { HomePage } from "./pages/HomePage";
import "./main.css";

render(
  () => (
    <HashRouter>
      <Route path="/" component={App}>
        <Route path="/" component={HomePage} />
      </Route>
    </HashRouter>
  ),
  document.getElementById("root")!,
);
{{else}}
import { render } from "solid-js/web";
import { App } from "./App";
import "./main.css";

render(() => <App />, document.getElementById("root")!);
{{/if}}
```

**Step 5: App.tsx (라우터 조건 분기)**

`packages/cli/templates/init/packages/__CLIENT__/src/App.tsx.hbs`:

```hbs
{{#if router}}
import type { RouteSectionProps } from "@solidjs/router";
import {
  InitializeProvider,
  DialogProvider,
  NotificationBanner,
  NotificationProvider,
  ThemeProvider,
} from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  return (
    <InitializeProvider config=\{{ clientName: "{{clientName}}" }}>
      <ThemeProvider>
        <NotificationProvider>
          <NotificationBanner />
          <DialogProvider>{props.children}</DialogProvider>
        </NotificationProvider>
      </ThemeProvider>
    </InitializeProvider>
  );
}
{{else}}
import {
  InitializeProvider,
  DialogProvider,
  NotificationBanner,
  NotificationProvider,
  ThemeProvider,
} from "@simplysm/solid";
import { HomePage } from "./pages/HomePage";

export function App() {
  return (
    <InitializeProvider config=\{{ clientName: "{{clientName}}" }}>
      <ThemeProvider>
        <NotificationProvider>
          <NotificationBanner />
          <DialogProvider>
            <HomePage />
          </DialogProvider>
        </NotificationProvider>
      </ThemeProvider>
    </InitializeProvider>
  );
}
{{/if}}
```

> **주의:** JSX의 `config={{ clientName: "..." }}` 부분에서 `{{`는 Handlebars가 해석하려 한다. 이를 방지하기 위해 `\{{`로 이스케이프한다. 구현 시 이 이스케이프가 올바르게 작동하는지 확인할 것. Handlebars에서 `\{{`가 리터럴 `{{`를 출력하지 않는 경우, raw block `{{{{raw}}}}...{{{{/raw}}}}` 또는 Handlebars 설정으로 해결한다.

**Step 6: main.css**

`packages/cli/templates/init/packages/__CLIENT__/src/main.css.hbs`:

```hbs
@import "@simplysm/solid/src/base.css";
@tailwind components;
@tailwind utilities;
```

**Step 7: appStructure.ts (라우터 있을 때만 생성)**

`packages/cli/templates/init/packages/__CLIENT__/src/appStructure.ts.hbs`:

```hbs
{{#if router}}
import { createAppStructure } from "@simplysm/solid";
import { HomePage } from "./pages/HomePage";

export const appStructure = createAppStructure({
  items: [
    {
      code: "home",
      title: "홈",
      children: [
        {
          code: "main",
          title: "메인",
          component: HomePage,
        },
      ],
    },
  ],
});
{{/if}}
```

**Step 8: HomePage.tsx**

`packages/cli/templates/init/packages/__CLIENT__/src/pages/HomePage.tsx.hbs`:

```hbs
export function HomePage() {
  return (
    <div class="flex h-full items-center justify-center">
      <h1 class="text-2xl font-bold text-base-700 dark:text-base-200">
        {{projectName}}
      </h1>
    </div>
  );
}
```

**Step 9: favicon.ico 복사**

```bash
cp packages/solid-demo/public/favicon.ico packages/cli/templates/init/packages/__CLIENT__/public/favicon.ico
```

**Step 10: Commit**

```bash
git add packages/cli/templates/init/packages/
git commit -m "feat(cli): add client package init template files"
```

---

### Task 5: init 명령어 구현

**Files:**
- Create: `packages/cli/src/commands/init.ts`

**Step 1: init 명령어 작성**

`packages/cli/src/commands/init.ts`:

```typescript
import path from "path";
import fs from "fs";
import { input, confirm } from "@inquirer/prompts";
import { consola } from "consola";
import { renderTemplateDir } from "../utils/template";
import { spawn } from "../utils/spawn";
import { runInstall } from "./install";

//#region Types

/**
 * Init 명령 옵션
 */
export interface InitOptions {}

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

/**
 * npm 스코프 이름 유효성 검증
 */
function isValidScopeName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name);
}

//#endregion

//#region Main

/**
 * 새 Simplysm 프로젝트를 현재 디렉토리에 초기화한다.
 *
 * 1. 디렉토리 비어있는지 확인
 * 2. 프로젝트명(폴더명) 검증
 * 3. 대화형 프롬프트로 설정 수집
 * 4. Handlebars 템플릿 렌더링
 * 5. pnpm install + sd-cli install 실행
 */
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

  // 3. 대화형 프롬프트
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

  // 4. 템플릿 렌더링
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "init");

  const context = {
    projectName,
    clientSuffix,
    clientName,
    router: useRouter,
  };

  const dirReplacements = {
    __CLIENT__: clientName,
  };

  logger.info("프로젝트 파일 생성 중...");
  await renderTemplateDir(templateDir, cwd, context, dirReplacements);
  logger.success("프로젝트 파일 생성 완료");

  // 5. pnpm install
  logger.info("pnpm install 실행 중...");
  await spawn("pnpm", ["install"], { cwd });
  logger.success("pnpm install 완료");

  // 6. sd-cli install (Claude Code 스킬 설치)
  logger.info("sd-cli install 실행 중...");
  await runInstall({});
  logger.success("sd-cli install 완료");

  // 7. 완료 메시지
  consola.box(
    [
      `프로젝트가 생성되었습니다!`,
      "",
      `  pnpm dev ${clientName}    개발 서버 실행`,
    ].join("\n"),
  );
}

//#endregion
```

**Step 2: index.ts에 export 추가**

`packages/cli/src/index.ts`에 추가:

```typescript
export { runInit, type InitOptions } from "./commands/init";
```

**Step 3: Commit**

```bash
git add packages/cli/src/commands/init.ts packages/cli/src/index.ts
git commit -m "feat(cli): implement init command"
```

---

### Task 6: CLI 등록 및 패키지 배포 설정

**Files:**
- Modify: `packages/cli/src/sd-cli.ts`
- Modify: `packages/cli/package.json`

**Step 1: sd-cli.ts에 init 명령어 등록**

`packages/cli/src/sd-cli.ts`의 yargs 체인에 추가 (`.command("install", ...)` 앞에):

```typescript
    .command(
      "init",
      "새 프로젝트를 초기화한다.",
      (cmd) => cmd.version(false).hide("help"),
      async () => {
        const { runInit } = await import("./commands/init.js");
        await runInit({});
      },
    )
```

> **주의:** `runInit`을 dynamic import로 로드하여, init 명령어를 사용하지 않을 때 `@inquirer/prompts`와 `handlebars`가 로드되지 않도록 한다. 기존 `install`/`uninstall` 명령어의 패턴과 다르게 dynamic import를 사용하는 이유는 `@inquirer/prompts`가 무거운 의존성이기 때문이다. 상단의 static import (`import { runInstall } from "./commands/install"`) 패턴을 따르지 않는다.

**Step 2: package.json `files` 필드에 templates 추가**

`packages/cli/package.json`의 `files` 배열에 `"templates"` 추가:

```json
"files": [
  "src",
  "dist",
  "claude",
  "templates"
],
```

**Step 3: typecheck 실행**

Run: `pnpm typecheck packages/cli`
Expected: PASS (에러 없음)

**Step 4: lint 실행**

Run: `pnpm lint packages/cli --fix`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/cli/src/sd-cli.ts packages/cli/package.json
git commit -m "feat(cli): register init command and include templates in package"
```

---

### Task 7: E2E 검증

**Step 1: 빌드**

Run: `pnpm build cli`

> templates 디렉토리가 dist에 포함되지 않아도 됨 — `files` 필드로 npm 배포 시 포함되고, 로컬에서는 소스 경로로 접근.

**Step 2: 임시 디렉토리에서 init 테스트**

```bash
mkdir /tmp/test-init-project && cd /tmp/test-init-project
node /path/to/worktree/packages/cli/dist/sd-cli.js init
```

프롬프트 입력:
- 클라이언트 이름: `admin`
- 라우터 사용: `Y`

Expected:
- `/tmp/test-init-project/package.json` 생성됨
- `/tmp/test-init-project/packages/client-admin/` 디렉토리 생성됨
- `/tmp/test-init-project/packages/client-admin/src/main.tsx`에 `HashRouter` 포함
- `/tmp/test-init-project/packages/client-admin/src/appStructure.ts` 생성됨
- `pnpm install` 성공
- `sd-cli install` 성공 (`.claude/` 디렉토리 생성)

**Step 3: 라우터 없는 경우 테스트**

```bash
rm -rf /tmp/test-init-project && mkdir /tmp/test-init-project && cd /tmp/test-init-project
node /path/to/worktree/packages/cli/dist/sd-cli.js init
```

프롬프트 입력:
- 클라이언트 이름: `web`
- 라우터 사용: `N`

Expected:
- `packages/client-web/src/main.tsx`에 `HashRouter` 없음, `render(() => <App />` 형태
- `packages/client-web/src/appStructure.ts` 없음

**Step 4: 최종 Commit**

E2E 과정에서 발견된 수정 사항이 있으면 커밋:

```bash
git add -A
git commit -m "fix(cli): address issues found during init E2E testing"
```

---

## 참고: Handlebars `\{{` 이스케이프

JSX 코드에서 `config={{ clientName: "..." }}` 처럼 `{{`가 포함된 경우, Handlebars가 이를 표현식으로 해석하려 한다. 해결 방법:

1. **`\{{` 이스케이프** (Handlebars 기본 지원): `config=\{{ clientName: "..." }}`
2. **raw block**: `{{{{raw}}}}config={{ clientName: "..." }}{{{{/raw}}}}`

구현 시 App.tsx.hbs 템플릿에서 이 이슈를 확인하고 올바른 방법을 선택할 것. `\{{` 가 작동하지 않으면 raw block을 사용한다.

## 참고: findPackageRoot 중복

`install.ts`와 `init.ts` 모두 `findPackageRoot()` 함수를 가진다. Task 5에서 `init.ts`에 동일한 함수를 복사하는 대신, 공통 유틸리티(`utils/package-utils.ts` 등)로 추출하는 것을 고려할 수 있다. 단, 기존 `install.ts`의 수정을 최소화하기 위해 일단 복사하고, 추후 리팩토링에서 통합하는 것도 가능.
