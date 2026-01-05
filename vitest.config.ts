import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

function needsSequential() {
  const args = process.argv.join(" ");
  // orm-node가 포함된 경우만 순차 실행 필요 (DB 연결 공유)
  if (/packages[\\/]/.test(args)) {
    return args.includes("orm-node");
  }
  // 전체 테스트 시 순차 실행 필요 (orm-node 포함)
  return true;
}

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ["./tsconfig.base.json"],
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.spec.ts"],
    globalSetup: "./vitest.setup.ts",
    fileParallelism: !needsSequential(),
    coverage: {
      reportsDirectory: "./.coverage",
    },
  },
});
