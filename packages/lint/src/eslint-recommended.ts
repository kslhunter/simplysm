import globals from "globals";
import tseslint, { type FlatConfig } from "typescript-eslint";
import plugin from "./eslint-plugin";
import importPlugin from "eslint-plugin-import";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import solidPlugin from "eslint-plugin-solid";
import tailwindcssPlugin from "eslint-plugin-tailwindcss";
import { defineConfig, globalIgnores } from "eslint/config";
import { ESLint } from "eslint";
import { fileURLToPath } from "url";

//#region Common rules configuration

/**
 * Common rules for JS/TS
 * - no-console: Prohibit console usage in production code (prevent performance degradation)
 * - no-warning-comments: Warn about TODO/FIXME comments (to check for incomplete code)
 * - eqeqeq: Enforce `===` usage (allow `== null` for null checks)
 * - no-self-compare: Prevent typos like `x === x`
 * - array-callback-return: Prevent missing return in map/filter, etc.
 */
const commonRules: FlatConfig.Rules = {
  "no-console": "error",
  "no-warning-comments": "warn",
  "eqeqeq": ["error", "always", { null: "ignore" }],
  "no-self-compare": "error",
  "array-callback-return": "error",
};

/**
 * Prohibit Node.js-specific API usage across all packages (unified codebase)
 * - Buffer → Uint8Array, bytesToHex/bytesFromHex/bytesConcat
 * - EventEmitter → SdEventEmitter
 */
const noNodeBuiltinsRules: FlatConfig.Rules = {
  "no-restricted-globals": [
    "error",
    {
      name: "Buffer",
      message:
        "Use Uint8Array. For complex operations, use BytesUtils from @simplysm/core-common.",
    },
  ],
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "buffer",
          message:
            "Use Uint8Array. For complex operations, use BytesUtils from @simplysm/core-common.",
        },
        {
          name: "events",
          message: "Use SdEventEmitter from @simplysm/core-common.",
        },
        {
          name: "eventemitter3",
          message: "Use SdEventEmitter from @simplysm/core-common.",
        },
      ],
    },
  ],
};

/**
 * Unused import handling rules
 * - Auto-remove unused imports
 * - Allow unused variables/parameters with `_` prefix (e.g., `_unused`)
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
    // Skip traversal itself in directory/** form
    "**/node_modules/**",
    "**/dist/**",
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
            "**/eslint.config.{js,cjs,mjs}",
            "**/stylelint.config.{js,cjs,mjs}",
            "**/simplysm.{js,cjs,mjs}",
            "**/vitest.config.{js,cjs,mjs}",
          ],
        },
      ],

      // Common rules for JS/TS
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
    settings: {
      "import/resolver": {
        [fileURLToPath(import.meta.resolve("eslint-import-resolver-typescript"))]: {
          alwaysTryTypes: true,
        },
      },
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

      // Prevent mistakes: passing async function to void callback (prevent error loss)
      // - arguments: false → allow socket.on("event", async () => {}) (handled with internal try-catch)
      // - attributes: false → allow JSX event handlers (SolidJS compatible)
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],
      // Prevent mistakes: throwing non-Error objects (prevent stack trace loss)
      "@typescript-eslint/only-throw-error": "error",
      // Prevent mistakes: using delete on arrays (prevent sparse array bugs)
      "@typescript-eslint/no-array-delete": "error",

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
            "**/stylelint.config.ts",
            "**/simplysm.ts",
            "**/vitest.config.ts",
            "**/vitest.setup.ts",
          ],
        },
      ],
    },
  },
  // Test folders: allow root devDependencies (vitest, etc.)
  {
    files: ["**/tests/**/*.ts", "**/tests/**/*.tsx"],
    rules: {
      "no-console": "off",
      "import/no-extraneous-dependencies": "off",
      "@simplysm/ts-no-throw-not-implemented-error": "off",
    },
  },
  // SolidJS TSX files: explicitly configure all rules (error)
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      solid: solidPlugin as unknown as ESLint.Plugin,
      tailwindcss: tailwindcssPlugin as unknown as ESLint.Plugin,
    },
    settings: {
      tailwindcss: {
        // Support template literal tags: recognize clsx`py-0.5 px-1.5` form
        tags: ["clsx"],
      },
    },
    rules: {
      // ─── Prevent mistakes ───
      "solid/reactivity": "error", // Reactivity loss (most important!)
      "solid/no-destructure": "error", // Props destructuring → reactivity loss
      "solid/components-return-once": "error", // early return → bugs
      "solid/jsx-no-duplicate-props": "error", // Duplicate props
      "solid/jsx-no-undef": ["error", { typescriptEnabled: true }], // Undefined variables
      "solid/no-react-deps": "error", // React dependency array mistakes
      "solid/no-react-specific-props": "error", // React props mistakes (className, etc.)

      // ─── Security ───
      "solid/no-innerhtml": "error", // Prevent XSS
      "solid/jsx-no-script-url": "error", // Prevent javascript: URLs

      // ─── Tooling support ───
      "solid/jsx-uses-vars": "error", // Prevent false positives in unused import detection

      // ─── Conventions ───
      "solid/prefer-for": "error", // Recommend For component
      "solid/event-handlers": "error", // Event handler naming
      "solid/imports": "error", // Import consistency
      "solid/style-prop": "error", // style prop format
      "solid/self-closing-comp": "error", // Self-closing tags

      // ─── Tailwind CSS ───
      "tailwindcss/classnames-order": "warn", // Auto-sort class order
      "tailwindcss/enforces-negative-arbitrary-values": "error", // Unify negative arbitrary value format
      "tailwindcss/enforces-shorthand": "error", // Recommend shorthand usage
      "tailwindcss/no-contradicting-classname": "error", // Prohibit conflicting classes (p-2 p-4, etc.)
      "tailwindcss/no-custom-classname": "error", // Prohibit custom classes not in Tailwind
      "tailwindcss/no-unnecessary-arbitrary-value": "error", // Prohibit unnecessary arbitrary values
    },
  },
  // Test folders: disable solid/reactivity
  {
    files: ["**/tests/**/*.ts", "**/tests/**/*.tsx"],
    rules: {
      // In tests, signal access within async callbacks like waitFor is intended behavior
      "solid/reactivity": "off",
    },
  },
]);
