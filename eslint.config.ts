import simplysmRootConfigs from "./packages/eslint-plugin/src/configs/recommended";

export default [
  ...simplysmRootConfigs,
  // Tailwind CSS v3: 설정 파일 경로 지정
  {
    files: ["**/*.tsx"],
    settings: {
      tailwindcss: {
        config: "packages/solid/tailwind.config.ts",
      },
    },
  },
];
