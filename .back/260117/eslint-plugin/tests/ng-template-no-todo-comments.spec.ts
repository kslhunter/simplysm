import { RuleTester } from "eslint";
import type { Rule } from "eslint";
import rule from "../src/rules/ng-template-no-todo-comments";
import { describe } from "vitest";
import { templateParser } from "angular-eslint";

// ESLint RuleTester와 @typescript-eslint/utils의 RuleModule 타입 호환을 위한 캐스팅
const compatibleRule = rule as unknown as Rule.RuleModule;

describe("ng-template-no-todo-comments 규칙 테스트", () => {
  // ESLint 9 플랫 설정 형식 사용
  const ruleTester = new RuleTester({
    languageOptions: {
      parser: templateParser,
    },
  });

  // 기본 템플릿 테스트
  describe("기본 템플릿 테스트", () => {
    // 유효한 템플릿 테스트 (규칙 위반 없음)
    describe("정상적인 HTML 템플릿은 경고가 없어야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [
          {
            code: "<div>정상적인 HTML 템플릿</div>",
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });

    describe("일반 주석은 경고가 없어야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [
          {
            code: "<!-- 일반 주석 -->",
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });

    describe("NOTE 주석은 경고가 없어야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [
          {
            code: "<!-- NOTE: 이것은 메모입니다 -->",
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });

    describe("여러 줄의 일반 주석은 경고가 없어야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [
          {
            code: `<div>
              <!-- 여러 줄에 걸친
              일반 주석입니다 -->
            </div>`,
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });
  });

  describe("TODO 주석 테스트", () => {
    describe("단일 TODO 주석은 경고가 발생해야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: "<!-- TODO: 이 기능 구현 필요 -->",
            filename: "test.component.html",
            errors: [{ messageId: "noTodo" }],
          },
        ],
      });
    });

    describe("요소 내부의 TODO 주석은 경고가 발생해야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: `<div>
              <!-- TODO: 여기에 폼 추가하기 -->
              <span>임시 내용</span>
            </div>`,
            filename: "test.component.html",
            errors: [{ messageId: "noTodo" }],
          },
        ],
      });
    });

    describe("주석 텍스트 안에 TODO 키워드가 있으면 경고가 발생해야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: `<div>
              <!-- 이 부분은 TODO: 수정이 필요합니다 -->
            </div>`,
            filename: "test.component.html",
            errors: [{ messageId: "noTodo" }],
          },
        ],
      });
    });

    describe("여러 줄 주석 내의 TODO 키워드도 감지해야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: `<div>
              <!--
                여러 줄 주석에
                TODO: 이 부분 확인 필요
                가 포함된 케이스
              -->
            </div>`,
            filename: "test.component.html",
            errors: [{ messageId: "noTodo" }],
          },
        ],
      });
    });

    describe("여러 개의 TODO 주석은 각각 감지되어야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: `<!-- TODO: 첫 번째 할 일 -->
            <div>내용</div>
            <!-- TODO: 두 번째 할 일 -->`,
            filename: "test.component.html",
            errors: [{ messageId: "noTodo" }, { messageId: "noTodo" }],
          },
        ],
      });
    });
  });

  // ng-template 지시자 테스트
  describe("ng-template 지시자 테스트", () => {
    describe("ng-template 안의 TODO 주석을 감지해야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: "<ng-template><!-- TODO: 구현 필요 --></ng-template>",
            filename: "test.component.html",
            errors: [{ messageId: "noTodo" }],
          },
        ],
      });
    });

    describe("ng-template 지시자가 있는 경우에도 정상 작동해야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [
          {
            code: `<ng-template itemOf>
                    <!-- 일반 주석 -->
                    <div>콘텐츠</div>
                  </ng-template>`,
            filename: "test.component.html",
          },
        ],
        invalid: [],
      });
    });

    describe("ng-template 지시자가 있는 경우 TODO 주석을 감지해야 함", () => {
      ruleTester.run("ng-template-no-todo-comments", compatibleRule, {
        valid: [],
        invalid: [
          {
            code: `<ng-template itemOf>
                    <!-- TODO: 여기에 구현 필요 -->
                    <div>임시 콘텐츠</div>
                  </ng-template>`,
            filename: "test.component.html",
            errors: [{ messageId: "noTodo" }],
          },
        ],
      });
    });
  });

});
