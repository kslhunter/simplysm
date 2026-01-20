import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/ts-no-throw-not-implemented-error";

const ruleTester = new RuleTester();

describe("ts-no-throw-not-implemented-error 규칙", () => {
  describe("허용되는 코드들 (valid)", () => {
    describe("다른 모듈의 NotImplementedError는 허용", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [
          {
            code: `
              class NotImplementedError extends Error {}
              throw new NotImplementedError();
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("@simplysm/core-common 외 패키지의 NotImplementedError는 허용", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [
          {
            code: `
              import { NotImplementedError } from "other-package";
              throw new NotImplementedError();
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("import 없이 사용하는 경우는 허용", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [
          {
            code: `
              declare const NotImplementedError: new (msg?: string) => Error;
              new NotImplementedError();
            `,
          },
        ],
        invalid: [],
      });
    });
  });

  describe("오류가 발생해야 하는 코드들 (invalid)", () => {
    describe("@simplysm/core-common에서 import된 NotImplementedError를 new로 생성", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              new NotImplementedError();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("throw와 함께 사용", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              throw new NotImplementedError();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("메시지와 함께 사용", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              throw new NotImplementedError("이 기능은 아직 구현되지 않았습니다");
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
                data: { text: "이 기능은 아직 구현되지 않았습니다" },
              },
            ],
          },
        ],
      });
    });

    describe("alias로 import된 경우도 감지", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError as NIE } from "@simplysm/core-common";
              new NIE();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("변수에 할당하는 경우도 감지", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              const err = new NotImplementedError();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("함수 인자로 전달하는 경우도 감지", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { NotImplementedError } from "@simplysm/core-common";
              function handleError(err: Error) {}
              handleError(new NotImplementedError());
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("다른 import와 함께 사용", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { SdError, NotImplementedError } from "@simplysm/core-common";
              throw new NotImplementedError();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("namespace import로 사용", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import * as CoreCommon from "@simplysm/core-common";
              throw new CoreCommon.NotImplementedError();
            `,
            errors: [{ messageId: "noThrowNotImplementedError" }],
          },
        ],
      });
    });

    describe("namespace import로 메시지와 함께 사용", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import * as CC from "@simplysm/core-common";
              new CC.NotImplementedError("아직 구현 안됨");
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
                data: { text: "아직 구현 안됨" },
              },
            ],
          },
        ],
      });
    });
  });

  describe("namespace import는 다른 패키지면 허용", () => {
    ruleTester.run("ts-no-throw-not-implemented-error", rule, {
      valid: [
        {
          code: `
            import * as OtherPkg from "other-package";
            new OtherPkg.NotImplementedError();
          `,
        },
      ],
      invalid: [],
    });
  });
});
