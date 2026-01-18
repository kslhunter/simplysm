import { afterAll, describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/no-subpath-imports-from-simplysm";

// vitest 훅 바인딩
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

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
  });

  describe("오류가 발생해야 하는 코드들 (invalid)", () => {
    describe("@simplysm/*/src import는 금지", () => {
      ruleTester.run("no-subpath-imports-from-simplysm", rule, {
        valid: [],
        invalid: [
          {
            code: `import { Something } from "@simplysm/sd-core-common/src";`,
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
  });
});
