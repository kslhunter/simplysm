/* eslint-disable no-restricted-properties -- 독립 스크립트 */
/**
 * Installs Claude Code assets to the project's .claude/ directory.
 * postinstall hook — 실패해도 pnpm install을 차단하지 않는다.
 *
 * 동기화 전략 (증분, sync.mjs와 동일):
 *  - 동일 콘텐츠(mtime+size 일치) 파일은 건드리지 않는다.
 *  - 변경된 파일만 unlink 후 copy. utimesSync로 src mtime을 보존해 다음 설치에서 동일로 판정.
 *  - 소스에서 사라진 sd-* 엔트리(고아)만 제거하고, .claude의 다른 파일은 보존한다.
 *
 * 통삭제(전체 rm 후 전체 copy) 방식은 삭제~복사 사이에 파일이 잠시 존재하지 않는 창을
 * 만든다. 그 순간 Claude Code의 PreToolUse 훅(python .claude/sd-check-*.py)이 실행되면
 * "No such file"로 도구 호출이 차단된다(특히 dev/watch 중 잦은 재설치 시 빈번). 그래서
 * sync.mjs와 동일한 증분 방식을 쓴다.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { collectSdEntries, forEachSdEntry } from "./sd-entries.mjs";

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // scripts/ → package root
  const pkgRoot = path.resolve(__dirname, "..");
  const sourceDir = path.join(pkgRoot, "claude");

  const projectRoot = findProjectRoot(__dirname);
  if (projectRoot == null) {
    console.log("[@simplysm/sd-claude] Could not find project root, skipping installation.");
    process.exit(0);
  }

  // Skip execution if this is the simplysm monorepo with the same major version
  if (isSimplysmMonorepoSameMajor(projectRoot, pkgRoot)) {
    process.exit(0);
  }

  // Skip if the source directory doesn't exist (claude/ may not exist in monorepo dev environment)
  if (!fs.existsSync(sourceDir)) {
    process.exit(0);
  }

  // 버전별 references(`references/sd-simplysm<major>`)는 프로젝트가 선언한
  // @simplysm/sd-cli major가 일치할 때만 설치한다. sd-cli 미선언·범위 파싱 불가 시 전부 제외.
  const cliMajor = getSimplysmCliMajor(projectRoot);
  const sourceEntries = collectSdEntries(sourceDir).filter((rel) => {
    const matched = rel.replace(/\\/g, "/").match(/^references\/sd-simplysm(\d+)$/);
    if (matched == null) return true;
    return cliMajor != null && Number(matched[1]) === cliMajor;
  });
  // settings.json도 함께 복사
  if (fs.existsSync(path.join(sourceDir, "settings.json"))) {
    sourceEntries.push("settings.json");
  }
  if (fs.existsSync(path.join(sourceDir, "simplysm.json"))) {
    sourceEntries.push("simplysm.json");
  }
  if (sourceEntries.length === 0) {
    process.exit(0);
  }

  const targetDir = path.join(projectRoot, ".claude");
  fs.mkdirSync(targetDir, { recursive: true });

  // 관리 대상(sd-* 엔트리 + settings.json/simplysm.json) 하위의 모든 상대경로 + 부모 수집.
  const expected = new Set();
  for (const entry of sourceEntries) {
    collectExpected(path.join(sourceDir, entry), sourceDir, expected);
  }

  // 소스에서 사라진 sd-* 엔트리(고아)만 제거. .claude의 다른(사용자) 파일은 건드리지 않는다.
  forEachSdEntry(targetDir, (rel) => {
    if (!expected.has(rel)) {
      fs.rmSync(path.join(targetDir, rel), { recursive: true, force: true });
    }
  });

  // 증분 복사. 동일 파일은 건드리지 않으므로 삭제 창이 생기지 않는다.
  let copiedFiles = 0;
  for (const entry of sourceEntries) {
    const src = path.join(sourceDir, entry);
    const dest = path.join(targetDir, entry);
    // 관리 디렉토리 엔트리 내부에서 소스에 없어진 파일(고아) 정리.
    if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
      pruneDest(dest, targetDir, expected);
    }
    copiedFiles += syncTree(src, dest);
  }

  console.log(
    `[@simplysm/sd-claude] Installed ${sourceEntries.length} entries (${copiedFiles} files updated).`,
  );
} catch (err) {
  // Ignore errors to prevent postinstall failure from blocking the entire pnpm install
  console.warn("[@simplysm/sd-claude] postinstall warning:", err.message);
}

/** Finds the project root from INIT_CWD, node_modules path, or cwd. */
function findProjectRoot(dirname) {
  if (process.env["INIT_CWD"] != null) {
    return process.env["INIT_CWD"];
  }

  const sep = path.sep;
  const marker = sep + "node_modules" + sep;
  const idx = dirname.indexOf(marker);
  if (idx !== -1) {
    return dirname.substring(0, idx);
  }

  // Fallback to cwd for manual CLI invocation (e.g., npx sd-claude postinstall)
  return process.cwd();
}

/** Checks if this is the simplysm monorepo with the same major version. */
function isSimplysmMonorepoSameMajor(projectRoot, pkgRoot) {
  const projectPkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(projectPkgPath)) return false;

  const projectPkg = JSON.parse(fs.readFileSync(projectPkgPath, "utf-8"));
  if (projectPkg.name !== "simplysm") return false;

  const sdClaudePkgPath = path.join(pkgRoot, "package.json");
  if (!fs.existsSync(sdClaudePkgPath)) return false;

  const sdClaudePkg = JSON.parse(fs.readFileSync(sdClaudePkgPath, "utf-8"));

  const projectMajor = projectPkg.version?.split(".")[0];
  const sdClaudeMajor = sdClaudePkg.version?.split(".")[0];
  return projectMajor != null && projectMajor === sdClaudeMajor;
}

/**
 * 소비 프로젝트가 선언한 @simplysm/sd-cli 의존성의 major 버전을 반환한다.
 * dependencies/devDependencies 범위 문자열의 첫 숫자를 major로 본다(예: "^14.0.91" → 14).
 * 미선언이거나 숫자가 없는 값(workspace:* 등)이면 null.
 */
function getSimplysmCliMajor(projectRoot) {
  const projectPkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(projectPkgPath)) return null;

  let projectPkg;
  try {
    projectPkg = JSON.parse(fs.readFileSync(projectPkgPath, "utf-8"));
  } catch {
    return null;
  }

  const range =
    projectPkg.dependencies?.["@simplysm/sd-cli"] ?? projectPkg.devDependencies?.["@simplysm/sd-cli"];
  if (range == null) return null;

  const matched = String(range).match(/\d+/);
  return matched == null ? null : Number(matched[0]);
}

/** eval 자산은 소비처에 설치하지 않는다. */
function filter(source) {
  const sdName = path.basename(source);
  return sdName !== "SKILL.eval.md" && !sdName.startsWith("eval_");
}

/** src/dest가 동일 콘텐츠(size+mtime 일치)인지. */
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
    for (const sdName of fs.readdirSync(srcPath)) {
      collectExpected(path.join(srcPath, sdName), srcRoot, expected);
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
 * src → dest 증분 동기화. 동일 콘텐츠 파일은 건드리지 않는다.
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
    for (const sdName of fs.readdirSync(srcPath)) {
      n += syncTree(path.join(srcPath, sdName), path.join(destPath, sdName));
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
