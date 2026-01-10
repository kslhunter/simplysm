import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const claudeFilesDir = path.join(__dirname, "claude-files");

// 프로젝트 루트 탐색: devDependencies에 @simplysm/claude가 있는 package.json 찾기
// process.cwd()부터 시작하여 npm/yarn 호이스팅 환경에서도 안정적으로 동작
function findProjectRoot(): string | undefined {
  let currentDir = process.cwd();

  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, "package.json");

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as {
          devDependencies?: Record<string, string>;
        };
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

// 디렉토리 재귀 복사 (덮어쓰기)
// NOTE: prepack.ts와 동일한 함수. 독립 실행 스크립트이므로 의도적 중복.
function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 메인 실행
const projectRoot = findProjectRoot();

if (projectRoot == null) {
  // devDependencies에 없으면 조용히 종료 (다른 프로젝트에서 간접 설치된 경우)
  process.exit(0);
}

if (!fs.existsSync(claudeFilesDir)) {
  // claude-files 폴더가 없으면 종료 (개발 환경에서 직접 설치 시)
  process.exit(0);
}

const targetDir = path.join(projectRoot, ".claude");

// claude-files 내용을 프로젝트 .claude로 복사
for (const item of fs.readdirSync(claudeFilesDir)) {
  const srcPath = path.join(claudeFilesDir, item);
  const destPath = path.join(targetDir, item);

  if (fs.statSync(srcPath).isDirectory()) {
    copyDir(srcPath, destPath);
  }
}

console.log("[@simplysm/claude] postinstall: dist/claude-files -> .claude 복사 완료");
