import "./vitest.setup";
import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/no-hard-private";

const ruleTester = new RuleTester();

describe("no-hard-private rule", () => {
  describe("allowed code (valid)", () => {
    describe("using TypeScript private keyword", () => {
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

    describe("using TypeScript private method", () => {
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

    describe("public/protected fields are allowed", () => {
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

  describe("code that should cause errors (invalid)", () => {
    describe("ECMAScript # private field declaration", () => {
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

    describe("ECMAScript # private method declaration", () => {
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

    describe("# private field usage (this.#field)", () => {
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

    describe("# private field usage in arrow function field", () => {
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

  describe("autofix tests", () => {
    describe("convert # private field to private _ style", () => {
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

    describe("convert # private method to private _ style", () => {
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

    describe("convert this.#field to this._field in usage", () => {
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

    describe("convert static # private field", () => {
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

    describe("convert static # private method", () => {
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

    describe("convert readonly # private field", () => {
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

    describe("convert static readonly # private field", () => {
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

    describe("convert # private getter to private _ style", () => {
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

    describe("convert # private setter to private _ style", () => {
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

    describe("convert # private getter/setter pair", () => {
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

    describe("convert multiple adjacent # private fields/methods", () => {
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

    describe("convert # private field with decorator", () => {
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

    describe("convert # private method with decorator", () => {
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

    describe("convert # private accessor field", () => {
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

    describe("# private accessor field usage (this.#value)", () => {
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

    describe("convert static # private accessor field", () => {
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

    describe("convert async # private method", () => {
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

    describe("convert static async # private method", () => {
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

    describe("convert generator # private method", () => {
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

    describe("convert # private field with multiple decorators", () => {
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

    describe("convert # private field in class expression", () => {
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

    describe("convert # private field in nested class", () => {
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

    describe("convert # private field with type annotation", () => {
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

    describe("convert # private field with optional type", () => {
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

    describe("convert # private field access from other instance", () => {
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

    describe("convert # private field comparison between same class instances", () => {
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

    describe("convert # private field with existing accessibility (no duplicate private)", () => {
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

    describe("convert # private method with existing accessibility", () => {
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

    describe("convert # private field in inherited class", () => {
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

    describe("no autofix when name conflict", () => {
      // When converting #field to _field, if existing _field exists, show conflict warning only without autofix.
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
            // no output = no autofix applied
            errors: [{ messageId: "nameConflict", data: { name: "field" } }],
          },
        ],
      });
    });

    describe("name conflict - method", () => {
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

    describe("static # private field usage (MyClass.#staticField)", () => {
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
