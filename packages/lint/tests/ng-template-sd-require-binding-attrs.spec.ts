import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { templateParser } from "angular-eslint";
import rule from "../src/rules/ng-template-sd-require-binding-attrs";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: templateParser as never,
  },
});

describe("ng-template-sd-require-binding-attrs rule", () => {
  describe("Scenario: sd-* 컴포넌트의 plain attribute를 감지하고 autofix한다", () => {
    describe("비 sd-* 요소의 plain attribute는 허용", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", rule, {
        valid: [
          {
            code: `<div myattr="val"></div>`,
          },
        ],
        invalid: [],
      });
    });

    describe("sd-* 요소의 허용된 attribute는 허용", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", rule, {
        valid: [
          {
            code: `<sd-button id="btn1" class="primary" style="color:red" title="hi" tabindex="0" role="button"></sd-button>`,
          },
        ],
        invalid: [],
      });
    });

    describe("sd-* 접두사 attribute는 허용", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", rule, {
        valid: [
          {
            code: `<sd-button aria-label="test" data-id="1" sd-custom="val"></sd-button>`,
          },
        ],
        invalid: [],
      });
    });

    describe("sd-* 요소의 비허용 plain attribute를 감지하고 autofix", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", rule, {
        valid: [],
        invalid: [
          {
            code: `<sd-button myattr="hello"></sd-button>`,
            output: `<sd-button [myattr]="'hello'"></sd-button>`,
            errors: [
              {
                messageId: "requireBindingForAttribute",
                data: { attrName: "myattr", elementName: "sd-button" },
              },
            ],
          },
        ],
      });
    });

    describe("값 없는 plain attribute는 [attr]=\"true\"로 autofix", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", rule, {
        valid: [],
        invalid: [
          {
            code: `<sd-button disabled></sd-button>`,
            output: `<sd-button [disabled]="true"></sd-button>`,
            errors: [
              {
                messageId: "requireBindingForAttribute",
                data: { attrName: "disabled", elementName: "sd-button" },
              },
            ],
          },
        ],
      });
    });
  });
});
