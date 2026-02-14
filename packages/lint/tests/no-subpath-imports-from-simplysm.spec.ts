import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/no-subpath-imports-from-simplysm";

const ruleTester = new RuleTester();

describe("no-subpath-imports-from-simplysm 규칙", () => {
  describe("허용되는 코드들 (valid)", () => {
    describe("패키지 루트 import는 허용", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [
          {
            code: `import { Something } from "@simplysm/sd-core-common";`,
          },
        ],
        invalid: [],
      });
    });

    describe("src가 아닌 서브경로 import는 허용", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [
          {
            code: `import { Something } from "@simplysm/sd-core-common/utils";`,
          },
          {
            code: `import { Something } from "@simplysm/sd-core-common/types/DateOnly";`,
          },
        ],
        invalid: [],
      });
    });

    describe("@simplysm이 아닌 패키지는 허용", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [
          {
            code: `import { Something } from "@angular/core";`,
          },
          {
            code: `import { Something } from "lodash/src/utils";`,
          },
        ],
        invalid: [],
      });
    });

    describe("동적 import - src가 아닌 경로는 허용", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [
          {
            code: `const mod = await import("@simplysm/sd-core-common");`,
          },
          {
            code: `const mod = await import("@simplysm/sd-core-common/utils");`,
          },
        ],
        invalid: [],
      });
    });

    describe("re-export - src가 아닌 경로는 허용", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [
          {
            code: `export { Something } from "@simplysm/sd-core-common";`,
          },
          {
            code: `export * from "@simplysm/sd-core-common/utils";`,
          },
        ],
        invalid: [],
      });
    });
  });

  describe("오류가 발생해야 하는 코드들 (invalid)", () => {
    describe("@simplysm/*/src import는 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `import { Something } from "@simplysm/sd-core-common/src";`,
            output: `import { Something } from "@simplysm/sd-core-common";`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src",
                },
              },
            ],
          },
        ],
      });
    });

    describe("@simplysm/*/src/xxx import는 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `import { DateOnly } from "@simplysm/sd-core-common/src/types/DateOnly";`,
            output: `import { DateOnly } from "@simplysm/sd-core-common";`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src/types/DateOnly",
                },
              },
            ],
          },
        ],
      });
    });

    describe("여러 패키지에서 src import 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `import { SdServiceClient } from "@simplysm/sd-service-client/src/SdServiceClient";`,
            output: `import { SdServiceClient } from "@simplysm/sd-service-client";`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-service-client",
                  importPath: "@simplysm/sd-service-client/src/SdServiceClient",
                },
              },
            ],
          },
        ],
      });
    });

    describe("동적 import에서 src 경로 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `const mod = await import("@simplysm/sd-core-common/src/utils");`,
            output: `const mod = await import("@simplysm/sd-core-common");`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src/utils",
                },
              },
            ],
          },
        ],
      });
    });

    describe("re-export에서 src 경로 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `export { Something } from "@simplysm/sd-core-common/src/types";`,
            output: `export { Something } from "@simplysm/sd-core-common";`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src/types",
                },
              },
            ],
          },
        ],
      });
    });

    describe("export * from에서 src 경로 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `export * from "@simplysm/sd-core-common/src/types";`,
            output: `export * from "@simplysm/sd-core-common";`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src/types",
                },
              },
            ],
          },
        ],
      });
    });

    describe("작은따옴표 사용 시 따옴표 스타일 보존", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `import { Something } from '@simplysm/sd-core-common/src';`,
            output: `import { Something } from '@simplysm/sd-core-common';`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src",
                },
              },
            ],
          },
        ],
      });
    });

    describe("type-only import에서 src 경로 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `import type { DateOnly } from "@simplysm/sd-core-common/src/types";`,
            output: `import type { DateOnly } from "@simplysm/sd-core-common";`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src/types",
                },
              },
            ],
          },
        ],
      });
    });

    describe("export type에서 src 경로 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `export type { DateOnly } from "@simplysm/sd-core-common/src/types";`,
            output: `export type { DateOnly } from "@simplysm/sd-core-common";`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src/types",
                },
              },
            ],
          },
        ],
      });
    });

    describe("namespace import에서 src 경로 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `import * as CoreCommon from "@simplysm/sd-core-common/src";`,
            output: `import * as CoreCommon from "@simplysm/sd-core-common";`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src",
                },
              },
            ],
          },
        ],
      });
    });

    describe("side-effect import에서 src 경로 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `import "@simplysm/sd-core-common/src/polyfills";`,
            output: `import "@simplysm/sd-core-common";`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src/polyfills",
                },
              },
            ],
          },
        ],
      });
    });

    describe("default import에서 src 경로 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `import SomeDefault from "@simplysm/sd-core-common/src/default";`,
            output: `import SomeDefault from "@simplysm/sd-core-common";`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src/default",
                },
              },
            ],
          },
        ],
      });
    });

    describe("mixed import (default + named)에서 src 경로 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `import SomeDefault, { Something } from "@simplysm/sd-core-common/src";`,
            output: `import SomeDefault, { Something } from "@simplysm/sd-core-common";`,
            errors: [
              {
                messageId: "noSubpathImport",
                data: {
                  pkg: "sd-core-common",
                  importPath: "@simplysm/sd-core-common/src",
                },
              },
            ],
          },
        ],
      });
    });
  });
});
