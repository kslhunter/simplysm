/**
 * Claude Code 에셋을 프로젝트의 .claude/ 에 설치한다.
 * postinstall 스크립트 또는 `sd-claude install`로 실행.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function runInstall(): void {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    // dist/commands/ → 패키지 루트
    const pkgRoot = path.resolve(__dirname, "../..");
    const sourceDir = path.join(pkgRoot, "claude");

    const projectRoot = findProjectRoot(__dirname);
    if (projectRoot == null) {
      // eslint-disable-next-line no-console
      console.log("[@simplysm/sd-claude] 프로젝트 루트를 찾을 수 없어 건너뜁니다.");
      return;
    }

    // simplysm 모노레포 자체에서는 실행하지 않음
    if (isSimplysmMonorepo(projectRoot)) {
      return;
    }

    // 소스 디렉토리가 없으면 건너뜀 (모노레포 개발 환경에서는 claude/ 미존재)
    if (!fs.existsSync(sourceDir)) {
      return;
    }

    const sourceEntries = collectSdEntries(sourceDir);
    if (sourceEntries.length === 0) {
      return;
    }

    const targetDir = path.join(projectRoot, ".claude");

    cleanSdEntries(targetDir);
    copySdEntries(sourceDir, targetDir, sourceEntries);
    setupStatusLine(targetDir);
    setupMcpConfig(projectRoot);

    // eslint-disable-next-line no-console
    console.log(`[@simplysm/sd-claude] ${sourceEntries.length}개의 sd-* 항목을 설치했습니다.`);
  } catch (err) {
    // postinstall 실패가 pnpm install 전체를 막지 않도록 에러 무시
    // eslint-disable-next-line no-console
    console.warn("[@simplysm/sd-claude] postinstall 경고:", (err as Error).message);
  }
}

/** INIT_CWD 또는 node_modules 경로에서 프로젝트 루트를 찾는다. */
function findProjectRoot(dirname: string): string | undefined {
  if (process.env["INIT_CWD"] != null) {
    return process.env["INIT_CWD"];
  }

  const sep = path.sep;
  const marker = sep + "node_modules" + sep;
  const idx = dirname.indexOf(marker);
  return idx !== -1 ? dirname.substring(0, idx) : undefined;
}

/** simplysm 모노레포인지 확인한다. */
function isSimplysmMonorepo(projectRoot: string): boolean {
  const projectPkgPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(projectPkgPath)) {
    const projectPkg = JSON.parse(fs.readFileSync(projectPkgPath, "utf-8")) as { name?: string };
    return projectPkg.name === "simplysm";
  }
  return false;
}

/** sd-* 항목을 재귀적으로 수집한다. */
function collectSdEntries(sourceDir: string): string[] {
  const entries: string[] = [];

  // 루트 레벨: sd-*
  for (const name of fs.readdirSync(sourceDir)) {
    if (name.startsWith("sd-")) {
      entries.push(name);
    }
  }

  // 서브 디렉토리: */sd-*
  for (const dirent of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!dirent.isDirectory() || dirent.name.startsWith("sd-")) continue;
    const subPath = path.join(sourceDir, dirent.name);
    for (const name of fs.readdirSync(subPath)) {
      if (name.startsWith("sd-")) {
        entries.push(path.join(dirent.name, name));
      }
    }
  }

  return entries;
}

/** 기존 sd-* 항목을 삭제한다. */
function cleanSdEntries(targetDir: string): void {
  if (!fs.existsSync(targetDir)) return;

  // 루트 레벨 sd-*
  for (const name of fs.readdirSync(targetDir)) {
    if (name.startsWith("sd-")) {
      fs.rmSync(path.join(targetDir, name), { recursive: true });
    }
  }

  // 서브 디렉토리 */sd-*
  for (const dirent of fs.readdirSync(targetDir, { withFileTypes: true })) {
    if (!dirent.isDirectory() || dirent.name.startsWith("sd-")) continue;
    const subPath = path.join(targetDir, dirent.name);
    for (const name of fs.readdirSync(subPath)) {
      if (name.startsWith("sd-")) {
        fs.rmSync(path.join(subPath, name), { recursive: true });
      }
    }
  }
}

/** sd-* 항목을 복사한다. */
function copySdEntries(sourceDir: string, targetDir: string, entries: string[]): void {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of entries) {
    const src = path.join(sourceDir, entry);
    const dest = path.join(targetDir, entry);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }
}

/** settings.json에 statusLine 설정을 추가한다. */
function setupStatusLine(targetDir: string): void {
  const settingsPath = path.join(targetDir, "settings.json");
  const sdStatusLineCommand = "node .claude/sd-statusline.js";

  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
  }

  if (settings["statusLine"] == null) {
    settings["statusLine"] = { type: "command", command: sdStatusLineCommand };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  }
}

/** .mcp.json에 MCP 서버 설정을 추가한다. sd-claude npx를 사용하여 크로스플랫폼 지원. */
function setupMcpConfig(projectRoot: string): void {
  const mcpPath = path.join(projectRoot, ".mcp.json");

  let mcpConfig = { mcpServers: {} as Record<string, unknown> };
  if (fs.existsSync(mcpPath)) {
    const parsed = JSON.parse(fs.readFileSync(mcpPath, "utf-8")) as {
      mcpServers?: Record<string, unknown>;
    };
    mcpConfig.mcpServers = parsed.mcpServers ?? {};
  }

  const sdClaudeBin = "node_modules/@simplysm/sd-claude/dist/sd-claude.js";
  let changed = false;

  if (mcpConfig.mcpServers["context7"] == null) {
    mcpConfig.mcpServers["context7"] = {
      command: "node",
      args: [sdClaudeBin, "npx", "-y", "@upstash/context7-mcp"],
    };
    changed = true;
  }

  if (mcpConfig.mcpServers["playwright"] == null) {
    mcpConfig.mcpServers["playwright"] = {
      command: "node",
      args: [sdClaudeBin, "npx", "@playwright/mcp@latest", "--headless"],
      env: {
        PLAYWRIGHT_OUTPUT_DIR: ".playwright-mcp",
      },
    };
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2) + "\n");
  }
}
