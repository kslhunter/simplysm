import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/no-subpath-imports-from-simplysm";

const ruleTester = new RuleTester();

describe("no-subpath-imports-from-simplysm rule", () => {
  describe("allowed code (valid)", () => {
    describe("package root import is allowed", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [
          {
            code: `import { Something } from "@simplysm/sd-core-common";`,
          },
        ],
        invalid: [],
      });
    });

    describe("subpath import other than src is allowed", () => {
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

    describe("packages other than @simplysm are allowed", () => {
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

    describe("dynamic import - path other than src is allowed", () => {
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

    describe("re-export - path other than src is allowed", () => {
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

  describe("code that should cause errors (invalid)", () => {
    describe("@simplysm/*/src import is prohibited", () => {
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

    describe("@simplysm/*/src/xxx import is prohibited", () => {
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

    describe("src import prohibited from multiple packages", () => {
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

    describe("src path prohibited in dynamic import", () => {
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

    describe("src path prohibited in re-export", () => {
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

    describe("src path prohibited in export * from", () => {
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

    describe("preserve quote style when using single quotes", () => {
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

    describe("src path prohibited in type-only import", () => {
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

    describe("src path prohibited in export type", () => {
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

    describe("src path prohibited in namespace import", () => {
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

    describe("src path prohibited in side-effect import", () => {
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

    describe("src path prohibited in default import", () => {
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

    describe("src path prohibited in mixed import (default + named)", () => {
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
