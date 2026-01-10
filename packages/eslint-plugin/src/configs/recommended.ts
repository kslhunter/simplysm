import globals from "globals";
import tseslint from "typescript-eslint";
import plugin from "../plugin";
import ngeslint from "angular-eslint";
import importPlugin from "eslint-plugin-import";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import { globalIgnores } from "eslint/config";

//#region 공통 규칙 설정

const commonRules = {
  "no-console": ["warn"],
  "no-warning-comments": ["warn"],
  "eqeqeq": ["error", "always", { null: "ignore" }],
};

const simplysm = {
  // JS/TS 공통
  noSubpathImports: ["error"] as const,
  noHardPrivate: ["error"] as const,
  // TS 전용
  tsNoThrowNotImplementError: ["warn"] as const,
  tsNoUnusedInjects: ["error"] as const,
  tsNoUnusedProtectedReadonly: ["error"] as const,
  // Angular 템플릿
  ngTemplateNoTodoComments: ["warn"] as const,
  ngTemplateSdRequireBindingAttrs: ["error"] as const,
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
    "**/tests/**",
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
            "**/eslint.config.js",
            "**/simplysm.js",
            "**/vitest.config.js",
          ],
        },
      ],

      "@simplysm/no-subpath-imports-from-simplysm": simplysm.noSubpathImports,
      "@simplysm/no-hard-private": simplysm.noHardPrivate,
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "@simplysm": plugin,
      "@angular-eslint": ngeslint.tsPlugin,
      "import": importPlugin,
      "unused-imports": unusedImportsPlugin,
    },
    processor: ngeslint.processInlineTemplates,
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
      "@typescript-eslint/return-await": ["error", "always"],
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
      "@typescript-eslint/prefer-ts-expect-error": ["error"],
      "@typescript-eslint/prefer-readonly": ["error"],

      "@simplysm/no-subpath-imports-from-simplysm": simplysm.noSubpathImports,
      "@simplysm/no-hard-private": simplysm.noHardPrivate,
      "@simplysm/ts-no-throw-not-implement-error": simplysm.tsNoThrowNotImplementError,
      "@simplysm/ts-no-unused-injects": simplysm.tsNoUnusedInjects,
      "@simplysm/ts-no-unused-protected-readonly": simplysm.tsNoUnusedProtectedReadonly,

      ...unusedImportsRules,

      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/*.spec.ts",
            "**/lib/**",
            "**/eslint.config.ts",
            "**/simplysm.ts",
            "**/vitest.config.ts",
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    languageOptions: {
      parser: ngeslint.templateParser,
    },
    plugins: {
      "@simplysm": plugin,
    },
    rules: {
      "@simplysm/ng-template-no-todo-comments": simplysm.ngTemplateNoTodoComments,
      "@simplysm/ng-template-sd-require-binding-attrs": simplysm.ngTemplateSdRequireBindingAttrs,
    },
  },
];
