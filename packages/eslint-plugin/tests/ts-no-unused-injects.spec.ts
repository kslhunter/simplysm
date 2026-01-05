import { afterAll, describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/ts-no-unused-injects";

// vitest 훅 바인딩
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

describe("ts-no-unused-injects 규칙", () => {
  describe("허용되는 코드들 (valid)", () => {
    describe("inject() 필드가 클래스 내에서 사용됨", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [
          {
            code: `
              class MyComponent {
                private service = inject(MyService);

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

    describe("inject() 필드가 메서드에서 참조됨", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [
          {
            code: `
              class MyComponent {
                router = inject(Router);

                navigate() {
                  this.router.navigate(['/home']);
                }
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("inject()가 아닌 필드는 규칙 적용 안 함", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [
          {
            code: `
              class MyComponent {
                private unusedField = "unused";
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("inject() 필드가 getter에서 사용됨", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [
          {
            code: `
              class MyComponent {
                private http = inject(HttpClient);

                get client() {
                  return this.http;
                }
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("inject() 필드가 다른 필드 초기화에 사용됨", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [
          {
            code: `
              class MyComponent {
                private config = inject(ConfigService);
                private baseUrl = this.config.getBaseUrl();
              }
            `,
          },
        ],
        invalid: [],
      });
    });
  });

  describe("오류가 발생해야 하는 코드들 (invalid)", () => {
    describe("사용되지 않는 inject() 필드", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class MyComponent {
                private service = inject(MyService);
              }
            `,
            output: `
              class MyComponent {
              }
            `,
            errors: [
              {
                messageId: "unusedInject",
                data: { name: "service" },
              },
            ],
          },
        ],
      });
    });

    describe("여러 개의 사용되지 않는 inject() 필드", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class MyComponent {
                private service1 = inject(Service1);
                private service2 = inject(Service2);
              }
            `,
            output: [
              `
              class MyComponent {
                private service2 = inject(Service2);
              }
            `,
              `
              class MyComponent {
              }
            `,
            ],
            errors: [
              { messageId: "unusedInject", data: { name: "service1" } },
              { messageId: "unusedInject", data: { name: "service2" } },
            ],
          },
        ],
      });
    });

    describe("일부만 사용된 inject() 필드들", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class MyComponent {
                private usedService = inject(UsedService);
                private unusedService = inject(UnusedService);

                doSomething() {
                  this.usedService.call();
                }
              }
            `,
            output: `
              class MyComponent {
                private usedService = inject(UsedService);

                doSomething() {
                  this.usedService.call();
                }
              }
            `,
            errors: [
              { messageId: "unusedInject", data: { name: "unusedService" } },
            ],
          },
        ],
      });
    });

    describe("public inject() 필드도 사용 안 되면 에러", () => {
      ruleTester.run("ts-no-unused-injects", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class MyComponent {
                service = inject(MyService);
              }
            `,
            output: `
              class MyComponent {
              }
            `,
            errors: [
              { messageId: "unusedInject", data: { name: "service" } },
            ],
          },
        ],
      });
    });
  });
});
