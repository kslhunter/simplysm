/**
 * publish/pack 전 또는 watch hook에서 실행되어 .claude/sd-* 에셋을 packages/sd-claude/claude/에 복사한다.
 *
 * 동기화 전략 (증분):
 *  - 동일 콘텐츠(mtime+size 일치) 파일은 건드리지 않는다.
 *  - 변경된 파일만 unlink 후 copy.
 *  - src에 없는 dest 항목만 삭제.
 *
 * 통삭제(rmSync recursive) 방식은 소비앱의 chokidar watcher가 watch 중인 핸들을
 * 일제히 잃게 만들어 Windows에서 EPERM이 발생한다. 그래서 사용하지 않는다.
 */
import fs from "fs";
import path from "path";
import { collectSdEntries } from "./sd-entries.mjs";

const cliDir = process.cwd();
const projectRoot = path.resolve(cliDir, "../..");
const claudeDir = path.join(projectRoot, ".claude");
const targetDir = path.join(cliDir, "claude");

const allEntries = collectSdEntries(claudeDir).filter(
  (rel) => !rel.replace(/\\/g, "/").startsWith("evals/"),
);
if (fs.existsSync(path.join(claudeDir, "settings.json"))) {
  allEntries.push("settings.json");
}

function filter(source) {
  const name = path.basename(source);
  return name !== "SKILL.eval.md" && !name.startsWith("eval_");
}

function isSameFile(srcPath, destPath) {
  try {
    const ss = fs.statSync(srcPath);
    const ds = fs.statSync(destPath);
    return ss.size === ds.size && ss.mtimeMs === ds.mtimeMs;
  } catch {
    return false;
  }
}

/**
 * src 트리(filter 통과)의 모든 상대경로 + 부모 디렉토리들을 expected에 수집.
 */
function collectExpected(srcPath, srcRoot, expected) {
  if (!filter(srcPath)) return;
  let stat;
  try {
    stat = fs.statSync(srcPath);
  } catch {
    return;
  }
  const rel = path.relative(srcRoot, srcPath);
  if (rel !== "") {
    expected.add(rel);
    let parent = path.dirname(rel);
    while (parent !== "" && parent !== ".") {
      expected.add(parent);
      parent = path.dirname(parent);
    }
  }
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(srcPath)) {
      collectExpected(path.join(srcPath, name), srcRoot, expected);
    }
  }
}

/**
 * dest 트리에서 expected에 없는 항목만 삭제(고아 정리).
 */
function pruneDest(destPath, destRoot, expected) {
  if (!fs.existsSync(destPath)) return;
  for (const dirent of fs.readdirSync(destPath, { withFileTypes: true })) {
    const childPath = path.join(destPath, dirent.name);
    const rel = path.relative(destRoot, childPath);
    if (!expected.has(rel)) {
      fs.rmSync(childPath, { recursive: true, force: true });
    } else if (dirent.isDirectory()) {
      pruneDest(childPath, destRoot, expected);
    }
  }
}

/**
 * src → dest 동기화. 동일 콘텐츠 파일은 건드리지 않는다.
 * 갱신된 파일 수 반환.
 */
function syncTree(srcPath, destPath) {
  if (!filter(srcPath)) return 0;
  let stat;
  try {
    stat = fs.statSync(srcPath);
  } catch {
    return 0;
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(destPath, { recursive: true });
    let n = 0;
    for (const name of fs.readdirSync(srcPath)) {
      n += syncTree(path.join(srcPath, name), path.join(destPath, name));
    }
    return n;
  }
  if (isSameFile(srcPath, destPath)) return 0;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  try {
    fs.unlinkSync(destPath);
  } catch {
    // 없으면 무시
  }
  fs.copyFileSync(srcPath, destPath);
  // src의 mtime을 dest에 그대로 적용 → 다음 동기화에서 동일로 판정되어 재복사 방지.
  fs.utimesSync(destPath, stat.atime, stat.mtime);
  return 1;
}

const expected = new Set();
for (const entry of allEntries) {
  collectExpected(path.join(claudeDir, entry), claudeDir, expected);
}

fs.mkdirSync(targetDir, { recursive: true });
pruneDest(targetDir, targetDir, expected);

let copiedFiles = 0;
for (const entry of allEntries) {
  copiedFiles += syncTree(path.join(claudeDir, entry), path.join(targetDir, entry));
}

console.log(`Synchronized ${allEntries.length} sd-* assets (${copiedFiles} files updated).`);
