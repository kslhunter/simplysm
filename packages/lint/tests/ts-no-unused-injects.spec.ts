import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/ts-no-unused-injects";

const ruleTester = new RuleTester();

describe("ts-no-unused-injects rule", () => {
  describe("Scenario: 미사용 inject() 필드를 감지하고 autofix한다", () => {
    describe("사용된 inject 필드는 허용", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [
          {
            code: `
class MyComponent {
  private svc = inject(MyService);
  method() { this.svc.doSomething(); }
}
            `.trim(),
          },
        ],
        invalid: [],
      });
    });

    describe("미사용 inject 필드를 감지하고 autofix로 제거", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyComponent {
  private svc = inject(MyService);
}
            `.trim(),
            output: `
class MyComponent {
}
            `.trim(),
            errors: [{ messageId: "unusedInject", data: { name: "svc" } }],
          },
        ],
      });
    });

    describe("여러 inject 중 미사용만 감지하고 autofix", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyComponent {
  private usedSvc = inject(UsedService);
  private unusedSvc = inject(UnusedService);
  method() { this.usedSvc.call(); }
}
            `.trim(),
            output: `
class MyComponent {
  private usedSvc = inject(UsedService);
  method() { this.usedSvc.call(); }
}
            `.trim(),
            errors: [{ messageId: "unusedInject", data: { name: "unusedSvc" } }],
          },
        ],
      });
    });
  });
});
