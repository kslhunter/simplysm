/**
 * publish/pack 전에 실행되어 .claude/sd-* 에셋을 packages/sd-claude/claude/에 복사한다.
 * package.json의 prepack 스크립트로 등록하여 사용.
 */
import fs from "fs";
import path from "path";

const cliDir = process.cwd();
const projectRoot = path.resolve(cliDir, "../..");
const claudeDir = path.join(projectRoot, ".claude");
const targetDir = path.join(cliDir, "claude");

// 기존 claude/ 삭제
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true });
}

// sd-* 항목 탐색
const allEntries = [];

// 루트 레벨: sd-*
for (const name of fs.readdirSync(claudeDir)) {
  if (name.startsWith("sd-")) {
    allEntries.push(name);
  }
}

// 서브 디렉토리: */sd-*
for (const dirent of fs.readdirSync(claudeDir, { withFileTypes: true })) {
  if (!dirent.isDirectory() || dirent.name.startsWith("sd-")) continue;
  const subPath = path.join(claudeDir, dirent.name);
  for (const name of fs.readdirSync(subPath)) {
    if (name.startsWith("sd-")) {
      allEntries.push(path.join(dirent.name, name));
    }
  }
}

// 복사
for (const entry of allEntries) {
  const src = path.join(claudeDir, entry);
  const dest = path.join(targetDir, entry);
  fs.cpSync(src, dest, { recursive: true });
}

console.log(`${allEntries.length}개의 sd-* 에셋을 동기화했습니다.`);
