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

//#region 공통 규칙 설정

/**
 * JS/TS 공통 규칙
 * - no-console: 프로덕션 코드에서 console 사용 금지 (성능 저하 방지)
 * - no-warning-comments: TODO/FIXME 주석 경고 (미완성 코드 확인용)
 * - eqeqeq: `===` 사용 강제 (null 체크는 `== null` 허용)
 * - no-self-compare: `x === x` 같은 오타 방지
 * - array-callback-return: map/filter 등에서 return 빠뜨림 방지
 */
const commonRules: FlatConfig.Rules = {
  "no-console": "error",
  "no-warning-comments": "warn",
  "eqeqeq": ["error", "always", { null: "ignore" }],
  "no-self-compare": "error",
  "array-callback-return": "error",
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
        {
          name: "child_process",
          message: "execa를 사용하세요.",
        },
        {
          name: "node:child_process",
          message: "execa를 사용하세요.",
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

      // 실수 방지: void 콜백에 async 함수 전달 (에러 누락 방지)
      // - arguments: false → socket.on("event", async () => {}) 허용 (내부 try-catch로 처리)
      // - attributes: false → JSX 이벤트 핸들러 허용 (SolidJS 호환)
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],
      // 실수 방지: Error 아닌 것을 throw (스택 트레이스 손실 방지)
      "@typescript-eslint/only-throw-error": "error",
      // 실수 방지: 배열에 delete 사용 (희소 배열 버그 방지)
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
    files: ["**/tests/**/*.ts", "**/tests/**/*.tsx"],
    rules: {
      "no-console": "off",
      "import/no-extraneous-dependencies": "off",
      "@simplysm/ts-no-throw-not-implemented-error": "off",
    },
  },
  // SolidJS TSX 파일: 모든 규칙 명시적으로 설정 (error)
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      solid: solidPlugin as unknown as ESLint.Plugin,
      tailwindcss: tailwindcssPlugin as unknown as ESLint.Plugin,
    },
    settings: {
      tailwindcss: {
        // 템플릿 리터럴 태그 지원: clsx`py-0.5 px-1.5` 형태 인식
        tags: ["clsx"],
      },
    },
    rules: {
      // ─── 실수 방지 ───
      "solid/reactivity": "error", // 반응성 손실 (가장 중요!)
      "solid/no-destructure": "error", // props 구조분해 → 반응성 손실
      "solid/components-return-once": "error", // early return → 버그
      "solid/jsx-no-duplicate-props": "error", // 중복 props
      "solid/jsx-no-undef": ["error", { typescriptEnabled: true }], // 정의 안 된 변수
      "solid/no-react-deps": "error", // React 의존성 배열 실수
      "solid/no-react-specific-props": "error", // React props 실수 (className 등)

      // ─── 보안 ───
      "solid/no-innerhtml": "error", // XSS 방지
      "solid/jsx-no-script-url": "error", // javascript: URL 방지

      // ─── 도구 지원 ───
      "solid/jsx-uses-vars": "error", // unused import 오탐 방지

      // ─── 컨벤션 ───
      "solid/prefer-for": "error", // For 컴포넌트 권장
      "solid/event-handlers": "error", // 이벤트 핸들러 네이밍
      "solid/imports": "error", // import 일관성
      "solid/style-prop": "error", // style prop 형식
      "solid/self-closing-comp": "error", // 자체 닫기 태그

      // ─── Tailwind CSS ───
      "tailwindcss/classnames-order": "warn", // 클래스 순서 자동 정렬
      "tailwindcss/enforces-negative-arbitrary-values": "error", // 음수 임의값 형식 통일
      "tailwindcss/enforces-shorthand": "error", // 축약형 사용 권장
      "tailwindcss/no-contradicting-classname": "error", // 충돌하는 클래스 금지 (p-2 p-4 등)
      "tailwindcss/no-custom-classname": "error", // Tailwind에 없는 커스텀 클래스 금지
      "tailwindcss/no-unnecessary-arbitrary-value": "error", // 불필요한 임의값 금지
    },
  },
  // 테스트 폴더: solid/reactivity 비활성화
  {
    files: ["**/tests/**/*.ts", "**/tests/**/*.tsx"],
    rules: {
      // 테스트에서는 waitFor 등 비동기 콜백 내 signal 접근이 의도된 동작
      "solid/reactivity": "off",
    },
  },
]);
