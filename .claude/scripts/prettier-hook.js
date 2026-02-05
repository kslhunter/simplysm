#!/usr/bin/env node

const { execSync } = require("child_process");

// stdin에서 JSON 읽기
let input = "";
process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path;

    if (!filePath) {
      process.exit(0);
    }

    // prettier 지원 파일 확장자만 처리
    const supportedExtensions = [".ts", ".tsx", ".js", ".jsx", ".json", ".yaml", ".yml", ".css", ".scss", ".html", ".md"];
    const hasValidExtension = supportedExtensions.some((ext) => filePath.endsWith(ext));

    if (!hasValidExtension) {
      process.exit(0);
    }

    // prettier 실행
    execSync(`pnpm exec prettier --write "${filePath}"`, {
      stdio: "inherit",
      cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
    });
  } catch (e) {
    // JSON 파싱 실패 또는 prettier 실행 실패 시 조용히 종료
    process.exit(0);
  }
});
