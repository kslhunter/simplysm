import { afterAll, describe, it } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../src/rules/ts-no-exported-types.js';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*'],
      },
    },
  },
});

describe('ts-no-exported-types 규칙', () => {
  describe('허용되는 코드들 (valid)', () => {
    describe('제한된 타입을 내부 함수에서만 사용하는 경우', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [
          {
            code: `
              type Internal = string;
              function internalFunc(x: Internal) {}
            `,
            options: [{ types: [{ ban: 'Foo' }] }],
          },
        ],
        invalid: [],
      });
    });

    describe('export 함수가 안전한 타입만 사용하는 경우', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [
          {
            code: `
              export function safeFunc(x: string): number {
                return 1;
              }
            `,
            options: [{ types: [{ ban: 'Foo' }] }],
          },
        ],
        invalid: [],
      });
    });

    describe('제한된 타입을 private 속성으로만 사용하는 경우', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [
          {
            code: `
              class MyClass {
                private prop: Foo;
              }
            `,
            options: [{ types: [{ ban: 'Foo' }] }],
          },
        ],
        invalid: [],
      });
    });
  });

  describe('오류가 발생해야 하는 코드들 (invalid)', () => {
    describe('제한된 타입을 export 함수의 파라미터로 사용하는 경우', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [],
        invalid: [
          {
            code: `
              export function exposedFunc(x: Foo): number {
                return 1;
              }
            `,
            options: [{ types: [{ ban: 'Foo' }] }],
            errors: [
              {
                messageId: 'noExportedTypes',
                data: { typeName: 'Foo', safeSuggestion: '' },
              },
            ],
          },
        ],
      });
    });

    describe('제한된 타입을 반환값으로 사용하는 export 함수', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [],
        invalid: [
          {
            code: `
              export function anotherExposed(): Foo {
                return {} as Foo;
              }
            `,
            options: [{ types: [{ ban: 'Foo' }] }],
            errors: [
              {
                messageId: 'noExportedTypes',
                data: { typeName: 'Foo', safeSuggestion: '' },
              },
            ],
          },
        ],
      });
    });

    describe('제한된 타입을 public 속성으로 사용하는 export 클래스', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [],
        invalid: [
          {
            code: `
              export class MyClass {
                public prop: Foo;
              }
            `,
            options: [{ types: [{ ban: 'Foo' }] }],
            errors: [
              {
                messageId: 'noExportedTypes',
                data: { typeName: 'Foo', safeSuggestion: '' },
              },
            ],
          },
        ],
      });
    });

    describe('제한된 타입을 public 메서드의 파라미터로 사용하는 경우', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [],
        invalid: [
          {
            code: `
              export class MyClass {
                method(x: Foo): void {}
              }
            `,
            options: [{ types: [{ ban: 'Foo' }] }],
            errors: [
              {
                messageId: 'noExportedTypes',
                data: { typeName: 'Foo', safeSuggestion: '' },
              },
            ],
          },
        ],
      });
    });

    describe('제한된 타입을 사용하는 export const 선언', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [],
        invalid: [
          {
            code: `
              export const myValue: Foo = {} as Foo;
            `,
            options: [{ types: [{ ban: 'Foo' }] }],
            errors: [
              {
                messageId: 'noExportedTypes',
                data: { typeName: 'Foo', safeSuggestion: '' },
              },
            ],
          },
        ],
      });
    });

    describe('제한된 타입을 생성자의 파라미터로 사용하는 경우', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [],
        invalid: [
          {
            code: `
              export class ZipCache {
                constructor(arg?: Blob | Uint8Array) {}
              }
            `,
            options: [{ types: [{ ban: 'Uint8Array' }] }],
            errors: [{ messageId: 'noExportedTypes' }],
          },
        ],
      });
    });

    describe('유니언 타입 중 하나가 제한된 타입이면 오류 발생해야 함 (파라미터)', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [],
        invalid: [
          {
            code: `
              export function readData(x: Uint8Array | string): void {}
            `,
            options: [{ types: [{ ban: 'Uint8Array' }] }],
            errors: [{ messageId: 'noExportedTypes' }],
          },
        ],
      });
    });

    describe('유니언 타입 중 하나가 제한된 타입이면 오류 발생해야 함 (반환값)', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [],
        invalid: [
          {
            code: `
              export function getBuffer(): Uint8Array | null {
                return new Uint8Array();
              }
            `,
            options: [{ types: [{ ban: 'Uint8Array' }] }],
            errors: [{ messageId: 'noExportedTypes' }],
          },
        ],
      });
    });

    describe('유니언 타입 속성에서도 제한된 타입이면 오류 발생해야 함', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [],
        invalid: [
          {
            code: `
              export class MyClass {
                public buffer: string | Uint8Array;
              }
            `,
            options: [{ types: [{ ban: 'Uint8Array' }] }],
            errors: [
              {
                messageId: 'noExportedTypes',
                data: { typeName: 'Uint8Array', safeSuggestion: '' },
              },
            ],
          },
        ],
      });
    });

    describe('export const 선언에서도 유니언 타입 중 제한된 타입이 있으면 오류', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [],
        invalid: [
          {
            code: `
              export const data: Uint8Array | number = new Uint8Array();
            `,
            options: [{ types: [{ ban: 'Uint8Array', safe: 'Buffer' }] }],
            errors: [
              {
                messageId: 'noExportedTypes',
                data: {
                  typeName: 'Uint8Array',
                  safeSuggestion: ' 더 안전한 대체 타입 "Buffer"을(를) 사용하세요.',
                },
              },
            ],
          },
        ],
      });
    });

    describe('Generic 안쪽에도 없어야함', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [],
        invalid: [
          {
            code: `
              export const myValue: Foo<Bar> = {};
            `,
            options: [{ types: [{ ban: 'Bar' }] }],
            errors: [
              {
                messageId: 'noExportedTypes',
                data: { typeName: 'Bar', safeSuggestion: '' },
              },
            ],
          },
        ],
      });
    });

    describe('Generic 안쪽에 있어도 ignoreInGeneric 이면 허용됨', () => {
      ruleTester.run('ts-no-exported-types', rule, {
        valid: [
          {
            code: `
          export const myValue: Foo<Bar> = {};
        `,
            options: [{ types: [{ ban: 'Bar', ignoreInGeneric: true }] }],
          },
        ],
        invalid: [],
      });
    });
  });
});
