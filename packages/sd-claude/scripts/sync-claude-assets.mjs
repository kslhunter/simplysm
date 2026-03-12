/**
 * publish/pack 전에 실행되어 .claude/sd-* 에셋을 packages/claude/claude/에 복사한다.
 * package.json의 prepack 스크립트로 등록하여 사용.
 */
import fs from "fs";
import path from "path";
import { collectSdEntries } from "./sd-entries.mjs";

const cliDir = process.cwd();
const projectRoot = path.resolve(cliDir, "../..");
const claudeDir = path.join(projectRoot, ".claude");
const targetDir = path.join(cliDir, "claude");

// 기존 claude/ 삭제
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true });
}

// sd-* 항목 탐색 및 복사
const allEntries = collectSdEntries(claudeDir);

for (const entry of allEntries) {
  const src = path.join(claudeDir, entry);
  const dest = path.join(targetDir, entry);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

console.log(`Synchronized ${allEntries.length} sd-* assets.`);
