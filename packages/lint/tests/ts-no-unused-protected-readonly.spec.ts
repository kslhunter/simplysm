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

    describe("*ngFor 로컬 변수와 동명의 필드는 미사용으로 감지", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [],
        invalid: [
          {
            code: `
@Component({
  template: \`<div *ngFor="let item of items">{{ item.name }}</div>\`
})
class MyComponent {
  protected readonly items: string[] = [];
  protected readonly item = "should-be-unused";
}
            `.trim(),
            output: `
@Component({
  template: \`<div *ngFor="let item of items">{{ item.name }}</div>\`
})
class MyComponent {
  protected readonly items: string[] = [];
}
            `.trim(),
            errors: [{ messageId: "unusedField", data: { name: "item" } }],
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

    describe("this.field 형태(ThisReceiver 경로)로 참조된 필드는 허용", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
@Component({
  template: \`<div>{{ this.myField }}</div>\`
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

    describe("@if 조건 표현식 내 필드는 허용", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
@Component({
  template: \`@if (isEnabled) { <span>on</span> } @else { <span>off</span> }\`
})
class MyComponent {
  protected readonly isEnabled = true;
}
            `.trim(),
          },
        ],
        invalid: [],
      });
    });

    describe("@if expressionAlias 로컬 변수와 동명의 필드는 미사용으로 감지", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [],
        invalid: [
          {
            code: `
@Component({
  template: \`@if (cond; as alias) { {{ alias }} }\`
})
class MyComponent {
  protected readonly cond = true;
  protected readonly alias = "shadowed";
}
            `.trim(),
            output: `
@Component({
  template: \`@if (cond; as alias) { {{ alias }} }\`
})
class MyComponent {
  protected readonly cond = true;
}
            `.trim(),
            errors: [{ messageId: "unusedField", data: { name: "alias" } }],
          },
        ],
      });
    });

    describe("@switch 표현식 및 @case 표현식 내 필드는 허용", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
@Component({
  template: \`@switch (currentCase) { @case (firstCase) { <span>a</span> } @default { <span>d</span> } }\`
})
class MyComponent {
  protected readonly currentCase = "a";
  protected readonly firstCase = "a";
}
            `.trim(),
          },
        ],
        invalid: [],
      });
    });

    describe("@for iterable 표현식 내 필드는 허용", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
@Component({
  template: \`@for (item of items; track item.id) { {{ item.name }} }\`
})
class MyComponent {
  protected readonly items: { id: number; name: string }[] = [];
}
            `.trim(),
          },
        ],
        invalid: [],
      });
    });

    describe("@for item 로컬과 동명의 필드는 미사용으로 감지", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [],
        invalid: [
          {
            code: `
@Component({
  template: \`@for (item of items; track item.id) { {{ item.name }} }\`
})
class MyComponent {
  protected readonly items: { id: number; name: string }[] = [];
  protected readonly item = "shadowed";
}
            `.trim(),
            output: `
@Component({
  template: \`@for (item of items; track item.id) { {{ item.name }} }\`
})
class MyComponent {
  protected readonly items: { id: number; name: string }[] = [];
}
            `.trim(),
            errors: [{ messageId: "unusedField", data: { name: "item" } }],
          },
        ],
      });
    });

    describe("@for trackBy 표현식 내 필드는 허용", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
@Component({
  template: \`@for (x of xs; track trackKey(x)) { {{ x }} }\`
})
class MyComponent {
  protected readonly xs: string[] = [];
  protected readonly trackKey = (v: string) => v;
}
            `.trim(),
          },
        ],
        invalid: [],
      });
    });

    describe("@for contextVariable 로컬과 동명의 필드는 미사용으로 감지", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [],
        invalid: [
          {
            code: `
@Component({
  template: \`@for (it of list; track it; let idx = $index) { {{ idx }}:{{ it }} }\`
})
class MyComponent {
  protected readonly list: string[] = [];
  protected readonly idx = 0;
}
            `.trim(),
            output: `
@Component({
  template: \`@for (it of list; track it; let idx = $index) { {{ idx }}:{{ it }} }\`
})
class MyComponent {
  protected readonly list: string[] = [];
}
            `.trim(),
            errors: [{ messageId: "unusedField", data: { name: "idx" } }],
          },
        ],
      });
    });

    describe("@for @empty 블록 내 필드는 허용", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
@Component({
  template: \`@for (x of xs; track x) { {{ x }} } @empty { {{ emptyMsg }} }\`
})
class MyComponent {
  protected readonly xs: string[] = [];
  protected readonly emptyMsg = "none";
}
            `.trim(),
          },
        ],
        invalid: [],
      });
    });

    describe("@defer 트리거와 placeholder 내 필드는 허용", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [
          {
            code: `
@Component({
  template: \`@defer (when isReady) { {{ mainContent }} } @placeholder { {{ phText }} }\`
})
class MyComponent {
  protected readonly isReady = false;
  protected readonly mainContent = "body";
  protected readonly phText = "loading";
}
            `.trim(),
          },
        ],
        invalid: [],
      });
    });

    describe("@let 로컬 변수와 동명의 필드는 미사용으로 감지", () => {
      ruleTester.run("ts-no-unused-protected-readonly", rule, {
        valid: [],
        invalid: [
          {
            code: `
@Component({
  template: \`@let total = items.length; {{ total }}\`
})
class MyComponent {
  protected readonly items: number[] = [];
  protected readonly total = 0;
}
            `.trim(),
            output: `
@Component({
  template: \`@let total = items.length; {{ total }}\`
})
class MyComponent {
  protected readonly items: number[] = [];
}
            `.trim(),
            errors: [{ messageId: "unusedField", data: { name: "total" } }],
          },
        ],
      });
    });
  });
});
