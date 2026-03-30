import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/ts-no-unused-protected-readonly";

const ruleTester = new RuleTester();

describe("ts-no-unused-protected-readonly rule", () => {
  describe("Scenario: @Component 내 미사용 protected readonly 필드를 감지하고 autofix한다", () => {
    describe("템플릿에서 사용된 필드는 허용", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
@Component({
  template: \`<div>{{ myField }}</div>\`
})
class MyComponent {
  protected readonly myField = "hello";
}
            `.trim(),
          },
        ],
        invalid: [],
      });
    });

    describe("클래스 메서드에서 사용된 필드는 허용", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
@Component({
  template: \`<div></div>\`
})
class MyComponent {
  protected readonly myField = "hello";
  method() { return this.myField; }
}
            `.trim(),
          },
        ],
        invalid: [],
      });
    });

    describe("미사용 protected readonly 필드를 감지하고 autofix로 제거", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [],
        invalid: [
          {
            code: `
@Component({
  template: \`<div></div>\`
})
class MyComponent {
  protected readonly unusedField = "hello";
}
            `.trim(),
            output: `
@Component({
  template: \`<div></div>\`
})
class MyComponent {
}
            `.trim(),
            errors: [{ messageId: "unusedField", data: { name: "unusedField" } }],
          },
        ],
      });
    });

    describe("@Component 데코레이터가 없으면 무시", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
class MyService {
  protected readonly unusedField = "hello";
}
            `.trim(),
          },
        ],
        invalid: [],
      });
    });
  });
});
