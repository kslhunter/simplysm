import globals from "globals";
import tseslint, { type FlatConfig } from "typescript-eslint";
import plugin from "../plugin";
import importPlugin from "eslint-plugin-import";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import solidPlugin from "eslint-plugin-solid";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import { defineConfig, globalIgnores } from "eslint/config";
import { ESLint } from "eslint";

//#region 공통 규칙 설정

/**
 * JS/TS 공통 규칙
 * - no-console: 프로덕션 코드에서 console 사용 금지
 * - no-warning-comments: TODO/FIXME 주석 경고
 * - eqeqeq: `===` 사용 강제 (null 체크는 `== null` 허용)
 */
const commonRules: FlatConfig.Rules = {
  "no-console": "error",
  "no-warning-comments": "error",
  "eqeqeq": ["error", "always", { null: "ignore" }],
};

/**
 * 모든 패키지에서 Node.js 전용 API 사용 금지 (코드 통일)
 * - Buffer → Uint8Array, bytesToHex/bytesFromHex/bytesConcat 사용
 * - EventEmitter → SdEventEmitter 사용
 */
const noNodeBuiltinsRules: FlatConfig.Rules = {
  "no-restricted-globals": [
    "error",
    {
      name: "Buffer",
      message:
        "Uint8Array를 사용하세요. 복잡한 연산은 @simplysm/core-common의 BytesUtils를 사용하세요.",
    },
  ],
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "buffer",
          message:
            "Uint8Array를 사용하세요. 복잡한 연산은 @simplysm/core-common의 BytesUtils를 사용하세요.",
        },
        {
          name: "events",
          message: "@simplysm/core-common의 SdEventEmitter를 사용하세요.",
        },
        {
          name: "eventemitter3",
          message: "@simplysm/core-common의 SdEventEmitter를 사용하세요.",
        },
      ],
    },
  ],
};

/**
 * 미사용 import 처리 규칙
 * - 미사용 import 자동 제거
 * - `_` 접두사 변수/인자는 미사용 허용 (예: `_unused`)
 */
const unusedImportsRules: FlatConfig.Rules = {
  "unused-imports/no-unused-imports": "error",
  "unused-imports/no-unused-vars": [
    "error",
    {
      vars: "all",
      varsIgnorePattern: "^_",
      args: "after-used",
      argsIgnorePattern: "^_",
    },
  ],
};

//#endregion

export default defineConfig([
  globalIgnores([
    // directory/** 형태로 순회 자체를 건너뜀
    "**/node_modules/**",
    "**/dist/**",
    "**/.legacy-packages/**",
    "**/.*/**",
    "**/_*/**",
  ]),
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024,
        ...globals.browser,
      },
      ecmaVersion: 2024,
      sourceType: "module",
    },
  },
  {
    files: ["**/*.js", "**/*.jsx"],
    plugins: {
      "import": importPlugin,
      "@simplysm": plugin as unknown as ESLint.Plugin,
      "unused-imports": unusedImportsPlugin,
    },
    rules: {
      ...commonRules,

      "require-await": "error",
      "no-shadow": "error",
      "no-duplicate-imports": "error",
      "no-unused-expressions": "error",
      "no-undef": "error",

      ...unusedImportsRules,

      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/lib/**",
            "**/eslint.config.js",
            "**/simplysm.js",
            "**/vitest.config.js",
          ],
        },
      ],

      // JS/TS 공통
      "@simplysm/no-subpath-imports-from-simplysm": "error",
      "@simplysm/no-hard-private": "error",

      ...noNodeBuiltinsRules,
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "@simplysm": plugin as unknown as ESLint.Plugin,
      "import": importPlugin,
      "unused-imports": unusedImportsPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
    },
    rules: {
      ...commonRules,

      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/return-await": ["error", "in-try-catch"],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        { allowConstantLoopConditions: true },
      ],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      // "@typescript-eslint/non-nullable-type-assertion-style": "error",
      "@typescript-eslint/prefer-reduce-type-parameter": "error",
      "@typescript-eslint/prefer-return-this-type": "error",
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowNullableBoolean: true,
          allowNullableObject: true,
        },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "minimumDescriptionLength": 3,
        },
      ],
      "@typescript-eslint/prefer-readonly": "error",

      "@simplysm/no-hard-private": "error",
      "@simplysm/no-subpath-imports-from-simplysm": "error",
      "@simplysm/ts-no-throw-not-implemented-error": "warn",

      ...unusedImportsRules,
      ...noNodeBuiltinsRules,

      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/lib/**",
            "**/eslint.config.ts",
            "**/simplysm.ts",
            "**/vitest.config.ts",
            "**/vitest.setup.ts",
          ],
        },
      ],
    },
  },
  // 테스트 폴더: 루트 devDependencies(vitest 등) 사용 허용
  {
    files: ["**/tests/**/*.ts", "**/tests/**/*.tsx", "**/tests/**/*.js", "**/tests/**/*.jsx"],
    rules: {
      "import/no-extraneous-dependencies": "off",
      "@simplysm/ts-no-throw-not-implemented-error": "off",
    },
  },
  // SolidJS TSX 파일: use:directive import가 unused로 처리되지 않도록
  {
    files: ["**/*.tsx"],
    plugins: {
      "solid": solidPlugin as unknown as ESLint.Plugin,
      "better-tailwindcss": betterTailwindcss,
    },
    rules: {
      ...solidPlugin.configs["flat/typescript"].rules,
      // Tailwind CSS 클래스 검증
      ...betterTailwindcss.configs["recommended-error"].rules,
    },
  },
  // 테스트 폴더: Tailwind CSS 검증 및 solid/reactivity 비활성화
  {
    files: ["**/tests/**/*.tsx"],
    rules: {
      "better-tailwindcss/no-unknown-classes": "off",
      "better-tailwindcss/no-conflicting-classes": "off",
      "better-tailwindcss/no-duplicate-classes": "off",
      // 테스트에서는 waitFor 등 비동기 콜백 내 signal 접근이 의도된 동작
      "solid/reactivity": "off",
    },
  },
]);
