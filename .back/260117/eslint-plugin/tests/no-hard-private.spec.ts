import { afterAll, describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/no-hard-private";

// vitest 훅 바인딩
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

describe("no-hard-private 규칙", () => {
  describe("허용되는 코드들 (valid)", () => {
    describe("TypeScript private 키워드 사용", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [
          {
            code: `
              class MyClass {
                private _field = 1;
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("TypeScript private 메서드 사용", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [
          {
            code: `
              class MyClass {
                private _method() {
                  return 1;
                }
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe("public/protected 필드는 허용", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [
          {
            code: `
              class MyClass {
                public field = 1;
                protected _protectedField = 2;
              }
            `,
          },
        ],
        invalid: [],
      });
    });
  });

  describe("오류가 발생해야 하는 코드들 (invalid)", () => {
    describe("ECMAScript # private 필드 선언", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class MyClass {
                #field = 1;
              }
            `,
            output: `
              class MyClass {
                private _field = 1;
              }
            `,
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("ECMAScript # private 메서드 선언", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class MyClass {
                #method() {
                  return 1;
                }
              }
            `,
            output: `
              class MyClass {
                private _method() {
                  return 1;
                }
              }
            `,
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("# private 필드 사용 (this.#field)", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class MyClass {
                #field = 1;
                method() {
                  return this.#field;
                }
              }
            `,
            output: `
              class MyClass {
                private _field = 1;
                method() {
                  return this._field;
                }
              }
            `,
            errors: [
              { messageId: "preferSoftPrivate" },
              { messageId: "preferSoftPrivate" },
            ],
          },
        ],
      });
    });
  });

  describe("autofix 테스트", () => {
    describe("# private 필드를 private _ 스타일로 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  #field = 1;
}
            `.trim(),
            output: `
class MyClass {
  private _field = 1;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("# private 메서드를 private _ 스타일로 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  #method() {
    return 1;
  }
}
            `.trim(),
            output: `
class MyClass {
  private _method() {
    return 1;
  }
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("사용부의 this.#field를 this._field로 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  #value = 1;
  get() {
    return this.#value;
  }
}
            `.trim(),
            output: `
class MyClass {
  private _value = 1;
  get() {
    return this._value;
  }
}
            `.trim(),
            errors: [
              { messageId: "preferSoftPrivate" },
              { messageId: "preferSoftPrivate" },
            ],
          },
        ],
      });
    });

    describe("static # private 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  static #staticField = 1;
}
            `.trim(),
            output: `
class MyClass {
  private static _staticField = 1;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("# private getter를 private _ 스타일로 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  get #value() {
    return 1;
  }
}
            `.trim(),
            output: `
class MyClass {
  private get _value() {
    return 1;
  }
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("# private setter를 private _ 스타일로 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  set #value(v) {
    this._internal = v;
  }
}
            `.trim(),
            output: `
class MyClass {
  private set _value(v) {
    this._internal = v;
  }
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("# private getter/setter 쌍 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  get #prop() {
    return this._internal;
  }
  set #prop(v) {
    this._internal = v;
  }
}
            `.trim(),
            output: `
class MyClass {
  private get _prop() {
    return this._internal;
  }
  private set _prop(v) {
    this._internal = v;
  }
}
            `.trim(),
            errors: [
              { messageId: "preferSoftPrivate" },
              { messageId: "preferSoftPrivate" },
            ],
          },
        ],
      });
    });
  });
});
