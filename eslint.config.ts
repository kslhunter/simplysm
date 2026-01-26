import simplysmRootConfigs from "./packages/eslint-plugin/src/configs/recommended";

export default [
  ...simplysmRootConfigs,
  // Tailwind CSS v4: CSS 기반 설정 진입점 지정
  {
    files: ["**/*.tsx"],
    settings: {
      "better-tailwindcss": {
        entryPoint: "packages/solid/styles.css",
      },
    },
  },
];
