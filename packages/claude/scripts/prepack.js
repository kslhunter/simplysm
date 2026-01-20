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
const sourceDir = path.resolve(pkgDir, "../../.claude");
const distDir = path.join(pkgDir, "dist");

/**
 * .claude 디렉토리 내용을 dist로 복사
 * - 기존 dist 폴더 삭제 후 새로 생성
 * - 하위 디렉토리만 복사 (루트 레벨 파일 중 settings.json만 복사)
 * - settings.local.json은 복사하지 않음
 * @param {string} srcDir - 소스 디렉토리 (.claude)
 * @param {string} destDir - 대상 디렉토리 (dist)
 * @throws {Error} 소스 디렉토리가 존재하지 않을 경우
 */
function copyClaudeToDist(srcDir, destDir) {
  // dist 폴더 초기화
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  // .claude 하위 디렉토리 복사
  for (const item of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, item);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, path.join(destDir, item));
    }
  }

  // settings.json 파일 복사 (settings.local.json은 제외)
  const settingsPath = path.join(srcDir, "settings.json");
  if (fs.existsSync(settingsPath)) {
    fs.copyFileSync(settingsPath, path.join(destDir, "settings.json"));
  }
}

/** 메인 실행 */
function main() {
  copyClaudeToDist(sourceDir, distDir);
  logger.info("prepack: .claude -> dist 복사 완료");
}

// 직접 실행 시에만 main 호출
const isDirectRun = path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main();
}

// 테스트용 내보내기
export { main, copyClaudeToDist };
