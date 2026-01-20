import fs from "fs";
import path from "path";
import pino from "pino";
import { fileURLToPath } from "url";

const logger = pino({ name: "@simplysm/claude" });

/**
 * 디렉토리를 재귀적으로 복사한다.
 * @param {string} src - 소스 디렉토리 경로
 * @param {string} dest - 대상 디렉토리 경로
 * @throws {Error} 복사 실패 시
 */
function copyDir(src, dest) {
  try {
    fs.cpSync(src, dest, { recursive: true });
  } catch (err) {
    logger.error({ err, src, dest }, "copyDir 실패");
    throw err;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.resolve(__dirname, "..");
const distDir = path.join(pkgDir, "dist");

/**
 * @simplysm/claude가 devDependencies에 포함된 프로젝트 루트를 찾음
 * 현재 작업 디렉토리부터 상위 디렉토리로 탐색
 * @returns {string | undefined} 프로젝트 루트 경로 또는 찾지 못한 경우 undefined
 */
function findProjectRoot() {
  let currentDir = process.cwd();

  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, "package.json");

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        const devDeps = packageJson.devDependencies ?? {};

        if ("@simplysm/claude" in devDeps) {
          return currentDir;
        }
      } catch {
        // 파싱 실패 시 해당 디렉토리 건너뜀
      }
    }

    currentDir = path.dirname(currentDir);
  }

  return undefined;
}

/**
 * dist 디렉토리 내용을 대상 디렉토리로 복사
 * - 하위 디렉토리는 재귀적으로 복사
 * - 루트 레벨 파일 중 settings.json만 복사 (다른 파일 무시)
 * @param {string} srcDir - 소스 디렉토리 (dist)
 * @param {string} destDir - 대상 디렉토리 (.claude)
 */
function copyDistToTarget(srcDir, destDir) {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.name === "settings.json") {
      // settings.json 파일도 복사
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** 메인 실행 */
function main() {
  const projectRoot = findProjectRoot();

  if (projectRoot == null) {
    // devDependencies에 없으면 조용히 종료 (다른 프로젝트에서 간접 설치된 경우)
    process.exit(0);
  }

  if (!fs.existsSync(distDir)) {
    // dist 폴더가 없으면 종료 (개발 환경에서 직접 설치 시)
    process.exit(0);
  }

  const targetDir = path.join(projectRoot, ".claude");
  copyDistToTarget(distDir, targetDir);

  logger.info("postinstall: dist -> .claude 복사 완료");
}

// 직접 실행 시에만 main 호출
const isDirectRun = path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main();
}

// 테스트용 내보내기
export { main, findProjectRoot, copyDistToTarget, copyDir };
