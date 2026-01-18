import globals from "globals";
import tseslint from "typescript-eslint";
import plugin from "../plugin";
import importPlugin from "eslint-plugin-import";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import { globalIgnores } from "eslint/config";

//#region 공통 규칙 설정

const commonRules = {
  "no-console": ["error"],
  "no-warning-comments": ["warn"],
  "eqeqeq": ["error", "always", { null: "ignore" }],
};

/**
 * browser/neutral 패키지에서 Node.js 전용 API 사용 금지
 * - Buffer → Uint8Array, BytesUtils 사용
 * - EventEmitter → SdEventEmitter 사용
 */
const noNodeBuiltinsRules = {
  "no-restricted-globals": [
    "error",
    {
      name: "Buffer",
      message:
        "Use Uint8Array instead. For complex operations, use BytesUtils from @simplysm/core-common.",
    },
  ],
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "buffer",
          message:
            "Use Uint8Array instead. For complex operations, use BytesUtils from @simplysm/core-common.",
        },
        {
          name: "events",
          message: "Use SdEventEmitter from @simplysm/core-common instead.",
        },
        {
          name: "eventemitter3",
          message: "Use SdEventEmitter from @simplysm/core-common instead.",
        },
      ],
    },
  ],
};

const unusedImportsRules = {
  "unused-imports/no-unused-imports": ["error"],
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

export default [
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
        ...globals.es2022,
        ...globals.browser,
      },
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
  {
    files: ["**/*.js", "**/*.jsx"],
    plugins: {
      "import": importPlugin,
      "@simplysm": plugin,
      "unused-imports": unusedImportsPlugin,
    },
    rules: {
      ...commonRules,

      "require-await": ["error"],
      "no-shadow": ["error"],
      "no-duplicate-imports": ["error"],
      "no-unused-expressions": ["error"],
      "no-undef": ["error"],

      ...unusedImportsRules,

      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/*.spec.js",
            "**/lib/**",
            "**/tests/**",
            "**/eslint.config.js",
            "**/simplysm.js",
            "**/vitest.config.js",
          ],
        },
      ],

      // JS/TS 공통
      "@simplysm/no-subpath-imports-from-simplysm": ["error"],
      "@simplysm/no-hard-private": ["error"],

      ...noNodeBuiltinsRules,
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "@simplysm": plugin,
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

      "@typescript-eslint/require-await": ["error"],
      "@typescript-eslint/await-thenable": ["error"],
      "@typescript-eslint/return-await": ["error", "in-try-catch"],
      "@typescript-eslint/no-floating-promises": ["error"],
      "@typescript-eslint/no-shadow": ["error"],
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        { allowConstantLoopConditions: true },
      ],
      "@typescript-eslint/no-unnecessary-type-assertion": ["error"],
      "@typescript-eslint/non-nullable-type-assertion-style": ["error"],
      "@typescript-eslint/prefer-reduce-type-parameter": ["error"],
      "@typescript-eslint/prefer-return-this-type": ["error"],
      "@typescript-eslint/typedef": ["error"],
      "@typescript-eslint/no-unused-expressions": ["error"],
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
          minimumDescriptionLength: 3,
        },
      ],
      "@typescript-eslint/prefer-readonly": ["error"],

      "@simplysm/no-hard-private": ["error"],
      "@simplysm/no-subpath-imports-from-simplysm": ["error"],
      "@simplysm/ts-no-throw-not-implemented-error": ["warn"],

      ...unusedImportsRules,
      ...noNodeBuiltinsRules,

      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/*.spec.ts",
            "**/lib/**",
            "**/tests/**",
            "**/eslint.config.ts",
            "**/simplysm.ts",
            "**/vitest.config.ts",
            "**/vitest.setup.ts",
          ],
        },
      ],
    },
  },
  // 테스트 파일: 루트 devDependencies(vitest 등) 사용 허용
  {
    files: ["**/*.spec.ts", "**/*.spec.js"],
    rules: {
      "import/no-extraneous-dependencies": "off",
    },
  },
];
