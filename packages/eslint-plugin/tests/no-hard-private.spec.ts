import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/no-hard-private";

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
            errors: [{ messageId: "preferSoftPrivate" }, { messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("화살표 함수 필드 내 # private 필드 사용", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
              class MyClass {
                #value = 1;
                getValue = () => this.#value;
              }
            `,
            output: `
              class MyClass {
                private _value = 1;
                getValue = () => this._value;
              }
            `,
            errors: [{ messageId: "preferSoftPrivate" }, { messageId: "preferSoftPrivate" }],
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
            errors: [{ messageId: "preferSoftPrivate" }, { messageId: "preferSoftPrivate" }],
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

    describe("static # private 메서드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  static #staticMethod() {
    return 1;
  }
}
            `.trim(),
            output: `
class MyClass {
  private static _staticMethod() {
    return 1;
  }
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("readonly # private 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  readonly #field = 1;
}
            `.trim(),
            output: `
class MyClass {
  private readonly _field = 1;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("static readonly # private 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  static readonly #staticReadonlyField = 1;
}
            `.trim(),
            output: `
class MyClass {
  private static readonly _staticReadonlyField = 1;
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
            errors: [{ messageId: "preferSoftPrivate" }, { messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("여러 인접한 # private 필드/메서드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  #a;
  #b;
  #method1() {}
  #method2() {}
}
            `.trim(),
            output: `
class MyClass {
  private _a;
  private _b;
  private _method1() {}
  private _method2() {}
}
            `.trim(),
            errors: [
              { messageId: "preferSoftPrivate" },
              { messageId: "preferSoftPrivate" },
              { messageId: "preferSoftPrivate" },
              { messageId: "preferSoftPrivate" },
            ],
          },
        ],
      });
    });

    describe("데코레이터가 있는 # private 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  @Decorator
  #field = 1;
}
            `.trim(),
            output: `
class MyClass {
  @Decorator
  private _field = 1;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("데코레이터가 있는 # private 메서드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  @MethodDecorator
  #method() {
    return 1;
  }
}
            `.trim(),
            output: `
class MyClass {
  @MethodDecorator
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

    describe("# private accessor 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  accessor #value = 1;
}
            `.trim(),
            output: `
class MyClass {
  private accessor _value = 1;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("# private accessor 필드 사용 (this.#value)", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  accessor #value = 1;
  method() {
    return this.#value;
  }
}
            `.trim(),
            output: `
class MyClass {
  private accessor _value = 1;
  method() {
    return this._value;
  }
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }, { messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("static # private accessor 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  static accessor #staticValue = 1;
}
            `.trim(),
            output: `
class MyClass {
  private static accessor _staticValue = 1;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("async # private 메서드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  async #asyncMethod() {
    return await fetch("/api");
  }
}
            `.trim(),
            output: `
class MyClass {
  private async _asyncMethod() {
    return await fetch("/api");
  }
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("static async # private 메서드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  static async #staticAsyncMethod() {
    return await fetch("/api");
  }
}
            `.trim(),
            output: `
class MyClass {
  private static async _staticAsyncMethod() {
    return await fetch("/api");
  }
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("generator # private 메서드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  *#generatorMethod() {
    yield 1;
    yield 2;
  }
}
            `.trim(),
            output: `
class MyClass {
  private *_generatorMethod() {
    yield 1;
    yield 2;
  }
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("복수 데코레이터가 있는 # private 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  @Decorator1
  @Decorator2
  #field = 1;
}
            `.trim(),
            output: `
class MyClass {
  @Decorator1
  @Decorator2
  private _field = 1;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("클래스 표현식에서 # private 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
const MyClass = class {
  #field = 1;
};
            `.trim(),
            output: `
const MyClass = class {
  private _field = 1;
};
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("중첩 클래스에서 # private 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class Outer {
  Inner = class {
    #innerField = 1;
  };
}
            `.trim(),
            output: `
class Outer {
  Inner = class {
    private _innerField = 1;
  };
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("타입 어노테이션이 있는 # private 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  #count: number = 0;
}
            `.trim(),
            output: `
class MyClass {
  private _count: number = 0;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("optional 타입의 # private 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  #name?: string;
}
            `.trim(),
            output: `
class MyClass {
  private _name?: string;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("다른 인스턴스의 # private 필드 접근 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  #value = 1;
  compare(other: MyClass) {
    return other.#value;
  }
}
            `.trim(),
            output: `
class MyClass {
  private _value = 1;
  compare(other: MyClass) {
    return other._value;
  }
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }, { messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("같은 클래스 인스턴스 간 # private 필드 비교 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  #id = 1;
  equals(other: MyClass) {
    return this.#id === other.#id;
  }
}
            `.trim(),
            output: `
class MyClass {
  private _id = 1;
  equals(other: MyClass) {
    return this._id === other._id;
  }
}
            `.trim(),
            errors: [
              { messageId: "preferSoftPrivate" },
              { messageId: "preferSoftPrivate" },
              { messageId: "preferSoftPrivate" },
            ],
          },
        ],
      });
    });

    describe("이미 accessibility가 있는 # private 필드 변환 (private 중복 추가 안 함)", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  private #field = 1;
}
            `.trim(),
            output: `
class MyClass {
  private _field = 1;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
          {
            code: `
class MyClass {
  public #field = 1;
}
            `.trim(),
            output: `
class MyClass {
  public _field = 1;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
          {
            code: `
class MyClass {
  protected #field = 1;
}
            `.trim(),
            output: `
class MyClass {
  protected _field = 1;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("이미 accessibility가 있는 # private 메서드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  private #method() {
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

    describe("상속 클래스에서 # private 필드 변환", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class Parent {
  #parentField = 1;
}
class Child extends Parent {
  #childField = 2;
}
            `.trim(),
            output: `
class Parent {
  private _parentField = 1;
}
class Child extends Parent {
  private _childField = 2;
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }, { messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });

    describe("이름 충돌 시 autofix 미적용", () => {
      // #field를 _field로 변환할 때 기존 _field가 있으면 충돌 경고만 표시하고 autofix는 적용하지 않는다.
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  _field = 1;
  #field = 2;
}
            `.trim(),
            // output이 없음 = autofix 미적용
            errors: [{ messageId: "nameConflict", data: { name: "field" } }],
          },
        ],
      });
    });

    describe("이름 충돌 - 메서드", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  _method() {}
  #method() {}
}
            `.trim(),
            errors: [{ messageId: "nameConflict", data: { name: "method" } }],
          },
        ],
      });
    });

    describe("static # private 필드 사용 (MyClass.#staticField)", () => {
      ruleTester.run("no-hard-private", rule, {
        valid: [],
        invalid: [
          {
            code: `
class MyClass {
  static #staticValue = 1;
  static getStatic() {
    return MyClass.#staticValue;
  }
}
            `.trim(),
            output: `
class MyClass {
  private static _staticValue = 1;
  static getStatic() {
    return MyClass._staticValue;
  }
}
            `.trim(),
            errors: [{ messageId: "preferSoftPrivate" }, { messageId: "preferSoftPrivate" }],
          },
        ],
      });
    });
  });
});
