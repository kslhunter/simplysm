import fs from "fs";
import path from "path";
import pino from "pino";
import { fileURLToPath } from "url";
import { copyDir } from "./utils/copy-dir.js";

const logger = pino({ name: "@simplysm/claude" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.resolve(__dirname, "..");
const distDir = path.join(pkgDir, "dist");

/** @returns {string | undefined} */
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
 * @param {string} srcDir - 소스 디렉토리 (dist)
 * @param {string} destDir - 대상 디렉토리 (.claude)
 */
function copyDistToTarget(srcDir, destDir) {
  for (const item of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (item === "settings.json") {
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
export { main, findProjectRoot, copyDistToTarget };
