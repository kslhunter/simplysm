/**
 * devDependency 설치 시 자동 실행되어 .claude/sd-* 에셋을 프로젝트에 복사한다.
 * package.json의 postinstall 스크립트로 등록하여 사용.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(__dirname, "..");
  const sourceDir = path.join(pkgRoot, "claude");

  // INIT_CWD: npm/yarn이 설정하는 프로젝트 루트 경로
  // pnpm은 INIT_CWD를 설정하지 않으므로 (https://github.com/pnpm/pnpm/issues/7042)
  // 스크립트 경로에서 첫 번째 node_modules 이전 경로를 프로젝트 루트로 사용
  const projectRoot =
    process.env.INIT_CWD ||
    (() => {
      const sep = path.sep;
      const marker = sep + "node_modules" + sep;
      const idx = __dirname.indexOf(marker);
      return idx !== -1 ? __dirname.substring(0, idx) : null;
    })();
  if (!projectRoot) {
    console.log("[@simplysm/claude] 프로젝트 루트를 찾을 수 없어 건너뜁니다.");
    process.exit(0);
  }

  // 소스 디렉토리가 없으면 건너뜀 (모노레포 개발 환경에서는 claude/ 미존재)
  if (!fs.existsSync(sourceDir)) {
    process.exit(0);
  }

  // sd-* 항목 탐색
  const sourceEntries = [];

  // 루트 레벨: sd-*
  for (const name of fs.readdirSync(sourceDir)) {
    if (name.startsWith("sd-")) {
      sourceEntries.push(name);
    }
  }

  // 서브 디렉토리: */sd-*
  for (const dirent of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!dirent.isDirectory() || dirent.name.startsWith("sd-")) continue;
    const subPath = path.join(sourceDir, dirent.name);
    for (const name of fs.readdirSync(subPath)) {
      if (name.startsWith("sd-")) {
        sourceEntries.push(path.join(dirent.name, name));
      }
    }
  }

  if (sourceEntries.length === 0) {
    process.exit(0);
  }

  const targetDir = path.join(projectRoot, ".claude");

  // 기존 sd-* 삭제
  if (fs.existsSync(targetDir)) {
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

  // 복사
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of sourceEntries) {
    const src = path.join(sourceDir, entry);
    const dest = path.join(targetDir, entry);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }

  // settings.json에 statusLine 설정
  const settingsPath = path.join(targetDir, "settings.json");
  const sdStatusLineCommand = "node .claude/sd-statusline.js";
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  }

  if (settings.statusLine == null) {
    settings.statusLine = { type: "command", command: sdStatusLineCommand };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  }

  // .mcp.json에 MCP 서버 설정 (없는 항목만 추가)
  const mcpPath = path.join(projectRoot, ".mcp.json");
  let mcpConfig = { mcpServers: {} };
  if (fs.existsSync(mcpPath)) {
    mcpConfig = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
    mcpConfig.mcpServers ??= {};
  }

  let mcpChanged = false;

  if (!mcpConfig.mcpServers.context7) {
    mcpConfig.mcpServers.context7 = {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
    };
    mcpChanged = true;
  }

  if (!mcpConfig.mcpServers.playwright) {
    mcpConfig.mcpServers.playwright = {
      command: "npx",
      args: ["@anthropic-ai/mcp-server-playwright@latest"],
      env: {
        PLAYWRIGHT_OUTPUT_DIR: ".playwright-mcp",
      },
    };
    mcpChanged = true;
  }

  if (mcpChanged) {
    fs.writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2) + "\n");
  }

  console.log(`[@simplysm/claude] ${sourceEntries.length}개의 sd-* 항목을 설치했습니다.`);
} catch (err) {
  // postinstall 실패가 pnpm install 전체를 막지 않도록 에러 무시
  console.warn("[@simplysm/claude] postinstall 경고:", err.message);
}
