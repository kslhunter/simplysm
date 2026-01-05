import { afterAll, describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/ts-no-unused-protected-readonly";

// vitest 훅 바인딩
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

describe("ts-no-unused-protected-readonly 규칙", () => {
  describe("허용되는 코드들 (valid)", () => {
    describe("@Component 데코레이터가 없는 클래스", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
              class MyClass {
                protected readonly unusedField = 1;
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("protected readonly 필드가 템플릿에서 사용됨", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
              @Component({
                template: '<div>{{ title }}</div>'
              })
              class MyComponent {
                protected readonly title = 'Hello';
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("protected readonly 필드가 클래스 메서드에서 사용됨", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
              @Component({
                template: '<div></div>'
              })
              class MyComponent {
                protected readonly service = inject(MyService);

                doSomething() {
                  this.service.call();
                }
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("private/public readonly 필드는 규칙 적용 안 함", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
              @Component({
                template: '<div></div>'
              })
              class MyComponent {
                private readonly privateField = 1;
                public readonly publicField = 2;
                readonly defaultField = 3;
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("protected non-readonly 필드는 규칙 적용 안 함", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
              @Component({
                template: '<div></div>'
              })
              class MyComponent {
                protected mutableField = 1;
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("static protected readonly 필드는 규칙 적용 안 함", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
              @Component({
                template: '<div></div>'
              })
              class MyComponent {
                protected static readonly CONSTANT = 1;
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("$ 접두사 필드가 템플릿에서 사용됨", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
              @Component({
                template: '<div>{{ $state }}</div>'
              })
              class MyComponent {
                protected readonly $state = signal(0);
              }
            `,
          },
        ],
        invalid: [],
      });
    });
  });

  describe("오류가 발생해야 하는 코드들 (invalid)", () => {
    describe("사용되지 않는 protected readonly 필드", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [],
        invalid: [
          {
            code: `
              @Component({
                template: '<div></div>'
              })
              class MyComponent {
                protected readonly unusedField = 1;
              }
            `,
            output: `
              @Component({
                template: '<div></div>'
              })
              class MyComponent {
              }
            `,
            errors: [
              {
                messageId: "unusedField",
                data: { name: "unusedField" },
              },
            ],
          },
        ],
      });
    });

    describe("템플릿에도 클래스에도 사용되지 않는 필드", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [],
        invalid: [
          {
            code: `
              @Component({
                template: '<div>Hello</div>'
              })
              class MyComponent {
                protected readonly service = inject(MyService);
              }
            `,
            output: `
              @Component({
                template: '<div>Hello</div>'
              })
              class MyComponent {
              }
            `,
            errors: [
              {
                messageId: "unusedField",
                data: { name: "service" },
              },
            ],
          },
        ],
      });
    });

    describe("여러 개의 사용되지 않는 필드", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [],
        invalid: [
          {
            code: `
              @Component({
                template: '<div></div>'
              })
              class MyComponent {
                protected readonly field1 = 1;
                protected readonly field2 = 2;
              }
            `,
            output: [
              `
              @Component({
                template: '<div></div>'
              })
              class MyComponent {
                protected readonly field2 = 2;
              }
            `,
              `
              @Component({
                template: '<div></div>'
              })
              class MyComponent {
              }
            `,
            ],
            errors: [
              { messageId: "unusedField", data: { name: "field1" } },
              { messageId: "unusedField", data: { name: "field2" } },
            ],
          },
        ],
      });
    });

    describe("일부만 사용된 필드들", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [],
        invalid: [
          {
            code: `
              @Component({
                template: '<div>{{ usedField }}</div>'
              })
              class MyComponent {
                protected readonly usedField = 'used';
                protected readonly unusedField = 'unused';
              }
            `,
            output: `
              @Component({
                template: '<div>{{ usedField }}</div>'
              })
              class MyComponent {
                protected readonly usedField = 'used';
              }
            `,
            errors: [
              { messageId: "unusedField", data: { name: "unusedField" } },
            ],
          },
        ],
      });
    });
  });

  describe("TemplateLiteral 템플릿 테스트", () => {
    describe("백틱 템플릿에서 필드 사용", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
              @Component({
                template: \`
                  <div>{{ title }}</div>
                  <span>{{ subtitle }}</span>
                \`
              })
              class MyComponent {
                protected readonly title = 'Title';
                protected readonly subtitle = 'Subtitle';
              }
            `,
          },
        ],
        invalid: [],
      });
    });
  });
});
