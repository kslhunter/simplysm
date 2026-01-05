import { afterAll, describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/ts-no-throw-not-implement-error";

// vitest 훅 바인딩
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ["*.ts*"],
      },
    },
  },
});

describe("ts-no-throw-not-implement-error 규칙", () => {
  describe("허용되는 코드들 (valid)", () => {
    describe("일반 Error throw는 허용", () => {
      ruleTester.run("ts-no-throw-not-implement-error", rule, {
        valid: [
          {
            code: `throw new Error("일반 에러");`,
          },
        ],
        invalid: [],
      });
    });

    describe("다른 커스텀 에러 throw는 허용", () => {
      ruleTester.run("ts-no-throw-not-implement-error", rule, {
        valid: [
          {
            code: `
              class CustomError extends Error {}
              throw new CustomError("커스텀 에러");
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("await/yield expression은 무시", () => {
      ruleTester.run("ts-no-throw-not-implement-error", rule, {
        valid: [
          {
            code: `
              async function test() {
                throw await Promise.resolve(new Error("test"));
              }
            `,
          },
        ],
        invalid: [],
      });
    });
  });

  describe("오류가 발생해야 하는 코드들 (invalid)", () => {
    describe("NotImplementError를 직접 throw하는 경우", () => {
      ruleTester.run("ts-no-throw-not-implement-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class NotImplementError extends Error {
                constructor(message?: string) {
                  super(message);
                }
              }
              throw new NotImplementError();
            `,
            errors: [
              {
                messageId: "noThrowNotImplementError",
              },
            ],
          },
        ],
      });
    });

    describe("NotImplementError를 메시지와 함께 throw하는 경우", () => {
      ruleTester.run("ts-no-throw-not-implement-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class NotImplementError extends Error {
                constructor(message?: string) {
                  super(message);
                }
              }
              throw new NotImplementError("이 기능은 아직 구현되지 않았습니다");
            `,
            errors: [
              {
                messageId: "noThrowNotImplementError",
                data: { text: "이 기능은 아직 구현되지 않았습니다" },
              },
            ],
          },
        ],
      });
    });

    describe("조건부 표현식에서 NotImplementError throw", () => {
      ruleTester.run("ts-no-throw-not-implement-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class NotImplementError extends Error {
                constructor(message?: string) {
                  super(message);
                }
              }
              const err = new NotImplementError();
              throw Math.random() > 0.5 ? err : new Error("other");
            `,
            errors: [
              {
                messageId: "noThrowNotImplementError",
              },
            ],
          },
        ],
      });
    });

    describe("논리 표현식에서 NotImplementError throw", () => {
      ruleTester.run("ts-no-throw-not-implement-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class NotImplementError extends Error {
                constructor(message?: string) {
                  super(message);
                }
              }
              const err = new NotImplementError();
              throw err || new Error("fallback");
            `,
            errors: [
              {
                messageId: "noThrowNotImplementError",
              },
            ],
          },
        ],
      });
    });
  });
});
