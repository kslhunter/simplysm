import { RuleTester } from 'eslint';
import rule from '../src/rules/ng-template-no-todo-comments';
import { describe, expect, it } from "vitest";
import { templateParser } from "angular-eslint";

describe('ng-template-no-todo-comments 규칙 테스트', () => {
  // 인라인 템플릿을 가진 Angular 컴포넌트 생성을 위한 헬퍼 함수
  const createComponentWithTemplate = (template) => `
    import { Component } from '@angular/core';
    
    @Component({
      selector: 'app-test',
      template: \`${template}\`,
      standalone: true
    })
    export class TestComponent {}
  `;

  // ESLint 9 플랫 설정 형식 사용
  const ruleTester = new RuleTester({
    languageOptions: {
      parser: templateParser
    }
  });

  // 기본 템플릿 테스트
  describe('기본 템플릿 테스트', () => {
    // 유효한 템플릿 테스트 (규칙 위반 없음)
    it('정상적인 HTML 템플릿은 경고가 없어야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [
          {
            code: createComponentWithTemplate('<div>정상적인 HTML 템플릿</div>'),
            filename: 'test.component.ts'
          }
        ],
        invalid: []
      });
    });

    it('일반 주석은 경고가 없어야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [
          {
            code: createComponentWithTemplate('<!-- 일반 주석 -->'),
            filename: 'test.component.ts'
          }
        ],
        invalid: []
      });
    });

    it('NOTE 주석은 경고가 없어야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [
          {
            code: createComponentWithTemplate('<!-- NOTE: 이것은 메모입니다 -->'),
            filename: 'test.component.ts'
          }
        ],
        invalid: []
      });
    });

    it('여러 줄의 일반 주석은 경고가 없어야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [
          {
            code: createComponentWithTemplate(`<div>
              <!-- 여러 줄에 걸친 
              일반 주석입니다 -->
            </div>`),
            filename: 'test.component.ts'
          }
        ],
        invalid: []
      });
    });
  });

  // TODO 주석 테스트
  describe('TODO 주석 테스트', () => {
    it('단일 TODO 주석은 경고가 발생해야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [],
        invalid: [
          {
            code: createComponentWithTemplate('<!-- TODO: 이 기능 구현 필요 -->'),
            filename: 'test.component.ts',
            errors: [{ messageId: 'noTodo' }]
          }
        ]
      });
    });

    it('요소 내부의 TODO 주석은 경고가 발생해야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [],
        invalid: [
          {
            code: createComponentWithTemplate(`<div>
              <!-- TODO: 여기에 폼 추가하기 -->
              <span>임시 내용</span>
            </div>`),
            filename: 'test.component.ts',
            errors: [{ messageId: 'noTodo' }]
          }
        ]
      });
    });

    it('주석 텍스트 안에 TODO 키워드가 있으면 경고가 발생해야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [],
        invalid: [
          {
            code: createComponentWithTemplate(`<div>
              <!-- 이 부분은 TODO: 수정이 필요합니다 -->
            </div>`),
            filename: 'test.component.ts',
            errors: [{ messageId: 'noTodo' }]
          }
        ]
      });
    });

    it('여러 줄 주석 내의 TODO 키워드도 감지해야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [],
        invalid: [
          {
            code: createComponentWithTemplate(`<div>
              <!-- 
                여러 줄 주석에
                TODO: 이 부분 확인 필요
                가 포함된 케이스
              -->
            </div>`),
            filename: 'test.component.ts',
            errors: [{ messageId: 'noTodo' }]
          }
        ]
      });
    });

    it('여러 개의 TODO 주석은 각각 감지되어야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [],
        invalid: [
          {
            code: createComponentWithTemplate(`<!-- TODO: 첫 번째 할 일 -->
            <div>내용</div>
            <!-- TODO: 두 번째 할 일 -->`),
            filename: 'test.component.ts',
            errors: [
              { messageId: 'noTodo' },
              { messageId: 'noTodo' }
            ]
          }
        ]
      });
    });
  });

  // ng-template 지시자 테스트
  describe('ng-template 지시자 테스트', () => {
    it('ng-template 안의 TODO 주석을 감지해야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { Component } from '@angular/core';
              
              @Component({
                selector: 'app-test',
                template: \`<ng-template><!-- TODO: 구현 필요 --></ng-template>\`,
                standalone: true
              })
              export class TestComponent {}
            `,
            filename: 'test.component.ts',
            errors: [{ messageId: 'noTodo' }]
          }
        ]
      });
    });

    it('ng-template 지시자가 있는 경우에도 정상 작동해야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [
          {
            code: `
              import { Component } from '@angular/core';
              
              @Component({
                selector: 'app-test',
                template: \`
                  <ng-template itemOf>
                    <!-- 일반 주석 -->
                    <div>콘텐츠</div>
                  </ng-template>
                \`,
                standalone: true
              })
              export class TestComponent {}
            `,
            filename: 'test.component.ts'
          }
        ],
        invalid: []
      });
    });

    it('ng-template 지시자가 있는 경우 TODO 주석을 감지해야 함', () => {
      ruleTester.run('ng-template-no-todo-comments', rule, {
        valid: [],
        invalid: [
          {
            code: `
              import { Component } from '@angular/core';
              
              @Component({
                selector: 'app-test',
                template: \`
                  <ng-template itemOf>
                    <!-- TODO: 여기에 구현 필요 -->
                    <div>임시 콘텐츠</div>
                  </ng-template>
                \`,
                standalone: true
              })
              export class TestComponent {}
            `,
            filename: 'test.component.ts',
            errors: [{ messageId: 'noTodo' }]
          }
        ]
      });
    });
  });

  // 정규식 테스트
  describe('정규식 패턴 테스트', () => {
    it('정규식이 올바르게 TODO 주석을 감지해야 함', () => {
      const testHtml = `
        <!-- 일반 주석 -->
        <!-- TODO: 할 일 항목 -->
        <!-- todo: 소문자로 된 할 일 -->
        <!-- To-Do: 하이픈이 있는 할 일 -->
      `;

      // 정규식 테스트
      const commentRegex = /<!--[\s\S]*?-->/g;
      const matches = [...testHtml.matchAll(commentRegex)];

      // 매칭된 주석 중 'TODO:'가 포함된 주석 수 확인
      const todoComments = matches.filter(match => match[0].includes('TODO:'));
      expect(todoComments.length).toBe(1);
    });
  });
});
