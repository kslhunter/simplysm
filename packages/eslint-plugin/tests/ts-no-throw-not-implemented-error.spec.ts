import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/ts-no-throw-not-implemented-error";

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ["*.ts*"],
      },
    },
  },
});

describe("ts-no-throw-not-implemented-error 규칙", () => {
  describe("허용되는 코드들 (valid)", () => {
    describe("일반 Error throw는 허용", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [
          {
            code: `throw new Error("일반 에러");`,
          },
        ],
        invalid: [],
      });
    });

    describe("다른 커스텀 에러 throw는 허용", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
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

    describe("await expression은 무시", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
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

    describe("yield expression은 무시", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [
          {
            code: `
              function* gen() {
                throw yield new Error("test");
              }
            `,
          },
        ],
        invalid: [],
      });
    });
  });

  describe("오류가 발생해야 하는 코드들 (invalid)", () => {
    describe("NotImplementedError를 직접 throw하는 경우", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class NotImplementedError extends Error {
                constructor(message?: string) {
                  super(message);
                }
              }
              throw new NotImplementedError();
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
              },
            ],
          },
        ],
      });
    });

    describe("NotImplementedError를 메시지와 함께 throw하는 경우", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class NotImplementedError extends Error {
                constructor(message?: string) {
                  super(message);
                }
              }
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

    describe("조건부 표현식에서 NotImplementedError throw", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class NotImplementedError extends Error {
                constructor(message?: string) {
                  super(message);
                }
              }
              const err = new NotImplementedError();
              throw Math.random() > 0.5 ? err : new Error("other");
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
              },
            ],
          },
        ],
      });
    });

    describe("논리 표현식에서 NotImplementedError throw", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class NotImplementedError extends Error {
                constructor(message?: string) {
                  super(message);
                }
              }
              const err = new NotImplementedError();
              throw err || new Error("fallback");
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
              },
            ],
          },
        ],
      });
    });

    describe("AssignmentExpression에서 NotImplementedError throw", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class NotImplementedError extends Error {
                constructor(message?: string) {
                  super(message);
                }
              }
              let err: Error;
              throw (err = new NotImplementedError());
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
              },
            ],
          },
        ],
      });
    });

    describe("SequenceExpression에서 NotImplementedError throw", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class NotImplementedError extends Error {
                constructor(message?: string) {
                  super(message);
                }
              }
              let x: number;
              throw (x = 1, new NotImplementedError());
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
              },
            ],
          },
        ],
      });
    });

    describe("MemberExpression에서 NotImplementedError throw", () => {
      ruleTester.run("ts-no-throw-not-implemented-error", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class NotImplementedError extends Error {
                constructor(message?: string) {
                  super(message);
                }
              }
              const obj = { notImpl: new NotImplementedError() };
              throw obj.notImpl;
            `,
            errors: [
              {
                messageId: "noThrowNotImplementedError",
              },
            ],
          },
        ],
      });
    });
  });
});
