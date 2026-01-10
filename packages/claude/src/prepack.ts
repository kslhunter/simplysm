import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const sourceDir = path.join(rootDir, ".claude");
const distDir = path.join(__dirname, "claude-files");
const docsDistDir = path.join(__dirname, "claude-docs");

// claude-files 폴더 초기화
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 디렉토리 재귀 복사
// NOTE: postinstall.ts와 동일한 함수. 독립 실행 스크립트이므로 의도적 중복.
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

// .claude 하위 디렉토리만 복사 (루트 레벨 파일 제외)
for (const item of fs.readdirSync(sourceDir)) {
  const srcPath = path.join(sourceDir, item);
  if (fs.statSync(srcPath).isDirectory()) {
    copyDir(srcPath, path.join(distDir, item));
  }
}

console.log("[@simplysm/claude] prepack: .claude/*/** -> dist/claude-files 복사 완료");

// claude-docs 폴더 초기화 및 문서 복사
if (fs.existsSync(docsDistDir)) {
  fs.rmSync(docsDistDir, { recursive: true });
}
fs.mkdirSync(docsDistDir, { recursive: true });

// 루트 CLAUDE.md, README.md 복사
for (const docFile of ["CLAUDE.md", "README.md"]) {
  const srcPath = path.join(rootDir, docFile);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(docsDistDir, docFile));
  }
}

// 패키지별 CLAUDE.md, README.md 복사
const packagesDir = path.join(rootDir, "packages");
for (const pkgName of fs.readdirSync(packagesDir)) {
  const pkgDir = path.join(packagesDir, pkgName);
  if (!fs.statSync(pkgDir).isDirectory()) continue;

  for (const docFile of ["CLAUDE.md", "README.md"]) {
    const srcPath = path.join(pkgDir, docFile);
    if (fs.existsSync(srcPath)) {
      const destDir = path.join(docsDistDir, "packages", pkgName);
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcPath, path.join(destDir, docFile));
    }
  }
}

console.log("[@simplysm/claude] prepack: CLAUDE.md, README.md -> dist/claude-docs 복사 완료");
