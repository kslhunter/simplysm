import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { templateParser } from "angular-eslint";
import rule from "../src/rules/ng-template-no-strict-null-check";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: templateParser as never,
  },
});

describe("ng-template-no-strict-null-check rule", () => {
  describe("== null / != null은 허용", () => {
    ruleTester.run("ng-template-no-strict-null-check", rule, {
      valid: [
        { code: `{{ value == null ? 'empty' : value }}` },
        { code: `{{ value != null ? value : 'empty' }}` },
      ],
      invalid: [],
    });
  });

  describe("=== / !== 비교 중 null/undefined가 아닌 경우는 허용", () => {
    ruleTester.run("ng-template-no-strict-null-check", rule, {
      valid: [
        { code: `{{ value === 'hello' ? 'yes' : 'no' }}` },
        { code: `{{ value !== 0 ? 'yes' : 'no' }}` },
        { code: `{{ a === b ? 'eq' : 'ne' }}` },
      ],
      invalid: [],
    });
  });

  describe("=== null을 감지", () => {
    ruleTester.run("ng-template-no-strict-null-check", rule, {
      valid: [],
      invalid: [
        {
          code: `{{ value === null ? 'empty' : value }}`,
          errors: [{ messageId: "noStrictNullCheck" }],
        },
      ],
    });
  });

  describe("!== null을 감지", () => {
    ruleTester.run("ng-template-no-strict-null-check", rule, {
      valid: [],
      invalid: [
        {
          code: `{{ value !== null ? value : 'empty' }}`,
          errors: [{ messageId: "noStrictNullCheck" }],
        },
      ],
    });
  });

  describe("=== undefined를 감지", () => {
    ruleTester.run("ng-template-no-strict-null-check", rule, {
      valid: [],
      invalid: [
        {
          code: `{{ value === undefined ? 'empty' : value }}`,
          errors: [{ messageId: "noStrictNullCheck" }],
        },
      ],
    });
  });

  describe("!== undefined를 감지", () => {
    ruleTester.run("ng-template-no-strict-null-check", rule, {
      valid: [],
      invalid: [
        {
          code: `{{ value !== undefined ? value : 'empty' }}`,
          errors: [{ messageId: "noStrictNullCheck" }],
        },
      ],
    });
  });
});
