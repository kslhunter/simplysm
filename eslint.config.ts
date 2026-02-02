import simplysmRootConfigs from "./packages/eslint-plugin/src/configs/recommended";

export default [
  ...simplysmRootConfigs,
  // Tailwind CSS v3: 설정 파일 경로 지정
  {
    files: ["**/*.{ts,tsx}"],
    settings: {
      tailwindcss: {
        config: "packages/solid-demo/tailwind.config.ts",
      },
    },
  },
];
