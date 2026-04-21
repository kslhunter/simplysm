import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/ng-no-async-effect";

const ruleTester = new RuleTester();

describe("ng-no-async-effect rule", () => {
  describe("allowed code (valid)", () => {
    describe("동기 effect는 허용됨", () => {
      ruleTester.run("ng-no-async-effect", rule, {
        valid: [
          {
            code: `
              import { effect } from "@angular/core";
              effect(() => {});
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("effect 내부에서 untracked로 감싼 async는 허용됨", () => {
      ruleTester.run("ng-no-async-effect", rule, {
        valid: [
          {
            code: `
              import { effect, untracked } from "@angular/core";
              effect(() => {
                void untracked(async () => {});
              });
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("effect의 두 번째 이후 인자가 async인 경우는 무시됨", () => {
      ruleTester.run("ng-no-async-effect", rule, {
        valid: [
          {
            code: `
              import { effect } from "@angular/core";
              effect(() => {}, { allowSignalWrites: true } as any);
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("@angular/core가 아닌 모듈의 effect는 무시됨", () => {
      ruleTester.run("ng-no-async-effect", rule, {
        valid: [
          {
            code: `
              import { effect } from "some-other-lib";
              effect(async () => {});
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("로컬에 정의된 effect 함수는 무시됨", () => {
      ruleTester.run("ng-no-async-effect", rule, {
        valid: [
          {
            code: `
              function effect(fn: any) {}
              effect(async () => {});
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("namespace import로 가져온 다른 모듈의 effect는 무시됨", () => {
      ruleTester.run("ng-no-async-effect", rule, {
        valid: [
          {
            code: `
              import * as other from "other-package";
              other.effect(async () => {});
            `,
          },
        ],
        invalid: [],
      });
    });
  });

  describe("code that should cause errors (invalid)", () => {
    describe("named import된 effect에 async arrow function 전달", () => {
      ruleTester.run("ng-no-async-effect", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { effect } from "@angular/core";
              effect(async () => {});
            `,
            errors: [{ messageId: "noAsyncEffect" }],
          },
        ],
      });
    });

    describe("async function expression도 감지됨", () => {
      ruleTester.run("ng-no-async-effect", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { effect } from "@angular/core";
              effect(async function () {});
            `,
            errors: [{ messageId: "noAsyncEffect" }],
          },
        ],
      });
    });

    describe("alias import된 effect도 감지됨", () => {
      ruleTester.run("ng-no-async-effect", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { effect as ngEffect } from "@angular/core";
              ngEffect(async () => {});
            `,
            errors: [{ messageId: "noAsyncEffect" }],
          },
        ],
      });
    });

    describe("namespace import된 effect도 감지됨", () => {
      ruleTester.run("ng-no-async-effect", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import * as ng from "@angular/core";
              ng.effect(async () => {});
            `,
            errors: [{ messageId: "noAsyncEffect" }],
          },
        ],
      });
    });

    describe("여러 호출이 있으면 각각 보고됨", () => {
      ruleTester.run("ng-no-async-effect", rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { effect } from "@angular/core";
              effect(async () => {});
              effect(async () => {});
            `,
            errors: [
              { messageId: "noAsyncEffect" },
              { messageId: "noAsyncEffect" },
            ],
          },
        ],
      });
    });
  });
});
