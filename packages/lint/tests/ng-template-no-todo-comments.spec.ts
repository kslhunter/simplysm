import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { templateParser } from "angular-eslint";
import rule from "../src/rules/ng-template-no-todo-comments";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: templateParser as never,
  },
});

describe("ng-template-no-todo-comments rule", () => {
  describe("Scenario: HTML 주석에서 TODO를 감지한다", () => {
    describe("TODO 주석이 없으면 허용", () => {
      ruleTester.run("ng-template-no-todo-comments", rule, {
        valid: [
          {
            code: `<!-- This is a normal comment -->`,
          },
          {
            code: `<div>No comments here</div>`,
          },
        ],
        invalid: [],
      });
    });

    describe("TODO 주석이 있으면 경고", () => {
      ruleTester.run("ng-template-no-todo-comments", rule, {
        valid: [],
        invalid: [
          {
            code: `<!-- TODO: Fix this later -->`,
            errors: [{ messageId: "noTodo" as const, data: { content: "Fix this later" } }],
          },
        ],
      });
    });

    describe("여러 TODO 주석을 각각 감지", () => {
      ruleTester.run("ng-template-no-todo-comments", rule, {
        valid: [],
        invalid: [
          {
            code: `<!-- TODO: First --> <div></div> <!-- TODO: Second -->`,
            errors: [
              { messageId: "noTodo" as const, data: { content: "First" } },
              { messageId: "noTodo" as const, data: { content: "Second" } },
            ],
          },
        ],
      });
    });
  });
});
