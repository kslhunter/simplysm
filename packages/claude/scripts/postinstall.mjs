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

  // INIT_CWD: pnpm/npm 명령이 실행된 원래 디렉토리 (프로젝트 루트)
  const projectRoot = process.env.INIT_CWD;
  if (!projectRoot) {
    console.log("[sd-claude] INIT_CWD가 설정되지 않아 건너뜁니다.");
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

  console.log(`[@simplysm/claude] ${sourceEntries.length}개의 sd-* 항목을 설치했습니다.`);
} catch (err) {
  // postinstall 실패가 pnpm install 전체를 막지 않도록 에러 무시
  console.warn("[@simplysm/claude] postinstall 경고:", err.message);
}
