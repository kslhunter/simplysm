import { RuleTester } from "eslint";
import type { Rule } from "eslint";
import rule from "../src/rules/ng-template-sd-require-binding-attrs";
import { describe } from "vitest";
import { templateParser } from "angular-eslint";

// ESLint RuleTester와 @typescript-eslint/utils의 RuleModule 타입 호환을 위한 캐스팅
const compatibleRule = rule as unknown as Rule.RuleModule;

describe("ng-template-sd-require-binding-attrs 규칙", () => {
  const ruleTester = new RuleTester({
    languageOptions: {
      parser: templateParser,
    },
  });

  describe("허용되는 코드들 (valid)", () => {
    describe("sd-* 컴포넌트에 바인딩 속성 사용", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [
          {
            code: `<sd-textfield [value]="name"></sd-textfield>`,
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });

    describe("sd-* 컴포넌트에 허용된 plain 속성 사용 (class, style, id 등)", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [
          {
            code: `<sd-textfield class="my-class" style="color:red" id="my-id"></sd-textfield>`,
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });

    describe("sd-* 컴포넌트에 aria-* 속성 허용", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [
          {
            code: `<sd-button aria-label="Click me" aria-disabled="false"></sd-button>`,
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });

    describe("sd-* 컴포넌트에 data-* 속성 허용", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [
          {
            code: `<sd-card data-testid="my-card" data-custom="value"></sd-card>`,
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });

    describe("sd-* 접두사 속성 허용", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [
          {
            code: `<sd-sheet sd-custom="value"></sd-sheet>`,
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });

    describe("일반 HTML 요소는 규칙 적용 안 함", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [
          {
            code: `<div custom-attr="value"></div>`,
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });

    describe("title, tabindex, role 속성 허용", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [
          {
            code: `<sd-button title="Click me" tabindex="0" role="button"></sd-button>`,
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });
  });

  describe("오류가 발생해야 하는 코드들 (invalid)", () => {
    describe("sd-* 컴포넌트에 허용되지 않은 plain 속성 사용", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: `<sd-textfield placeholder="Enter name"></sd-textfield>`,
            filename: "test.component.html",
            output: `<sd-textfield [placeholder]="'Enter name'"></sd-textfield>`,
            errors: [
              {
                messageId: "requireBindingForAttribute",
                data: {
                  attrName: "placeholder",
                  elementName: "sd-textfield",
                },
              },
            ],
          },
        ],
      });
    });

    describe("sd-* 컴포넌트에 여러 개의 허용되지 않은 속성 사용", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: `<sd-textfield placeholder="Enter" disabled="true"></sd-textfield>`,
            filename: "test.component.html",
            output: `<sd-textfield [placeholder]="'Enter'" [disabled]="'true'"></sd-textfield>`,
            errors: [
              { messageId: "requireBindingForAttribute" },
              { messageId: "requireBindingForAttribute" },
            ],
          },
        ],
      });
    });

    describe("값이 없는 plain 속성 사용", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: `<sd-button disabled></sd-button>`,
            filename: "test.component.html",
            output: `<sd-button [disabled]="true"></sd-button>`,
            errors: [
              {
                messageId: "requireBindingForAttribute",
                data: {
                  attrName: "disabled",
                  elementName: "sd-button",
                },
              },
            ],
          },
        ],
      });
    });
  });

  describe("autofix 테스트", () => {
    describe("plain 속성을 바인딩으로 변환", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: `<sd-textfield placeholder="Enter name"></sd-textfield>`,
            filename: "test.component.html",
            output: `<sd-textfield [placeholder]="'Enter name'"></sd-textfield>`,
            errors: [{ messageId: "requireBindingForAttribute" }],
          },
        ],
      });
    });

    describe("값이 없는 속성을 [attr]=\"true\"로 변환", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: `<sd-button disabled></sd-button>`,
            filename: "test.component.html",
            output: `<sd-button [disabled]="true"></sd-button>`,
            errors: [{ messageId: "requireBindingForAttribute" }],
          },
        ],
      });
    });

    describe("작은따옴표가 포함된 값 이스케이프", () => {
      ruleTester.run("ng-template-sd-require-binding-attrs", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: `<sd-textfield placeholder="It's a test"></sd-textfield>`,
            filename: "test.component.html",
            output: `<sd-textfield [placeholder]="'It\\'s a test'"></sd-textfield>`,
            errors: [{ messageId: "requireBindingForAttribute" }],
          },
        ],
      });
    });
  });
});
