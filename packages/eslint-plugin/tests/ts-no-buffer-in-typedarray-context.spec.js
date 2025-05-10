import { afterAll, describe, it } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../src/rules/ts-no-buffer-in-typedarray-context.js';

// vitest 훅 바인딩
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

describe('ts-no-buffer-in-typedarray-context 규칙', () => {
  describe('허용되는 코드들 (valid)', () => {
    describe('Buffer를 new TypedArray(buffer)로 감싸서 사용하는 경우', () => {
      ruleTester.run('ts-no-buffer-in-typedarray-context', rule, {
        valid: [
          {
            code: `
              const buf = Buffer.from('abc');
              const arr = new Uint8Array(buf);
            `,
          },
        ],
        invalid: [],
      });
    });

    describe('TypedArray를 반환할 때 Buffer를 변환해서 사용하는 경우', () => {
      ruleTester.run('ts-no-buffer-in-typedarray-context', rule, {
        valid: [
          {
            code: `
              const buf = Buffer.from('abc');
              function get(): Uint8Array {
                return new Uint8Array(buf);
              }
            `,
          },
        ],
        invalid: [],
      });
    });

    describe('TypedArray를 받는 함수에 Buffer가 아닌 TypedArray 인스턴스를 넘기는 경우', () => {
      ruleTester.run('ts-no-buffer-in-typedarray-context', rule, {
        valid: [
          {
            code: `
              const buf = Buffer.from('abc');
              function process(data: Uint8Array) {}
              process(new Uint8Array(buf));
            `,
          },
        ],
        invalid: [],
      });
    });
  });

  describe('오류가 발생해야 하는 코드들 (invalid)', () => {
    describe('Buffer를 TypedArray 타입 변수에 직접 할당하는 경우', () => {
      ruleTester.run('ts-no-buffer-in-typedarray-context', rule, {
        valid: [],
        invalid: [
          {
            code: `
              const buf = Buffer.from('abc');
              const arr: Uint8Array = buf;
            `,
            errors: [
              {
                messageId: 'directBuffer',
                data: { expected: 'Uint8Array' },
              },
            ],
          },
        ],
      });
    });

    describe('Buffer를 TypedArray를 기대하는 함수 인자에 직접 전달하는 경우', () => {
      ruleTester.run('ts-no-buffer-in-typedarray-context', rule, {
        valid: [],
        invalid: [
          {
            code: `
              const buf = Buffer.from('abc');
              function process(data: Float32Array) {}
              process(buf);
            `,
            errors: [
              {
                messageId: 'directBuffer',
                data: { expected: 'Float32Array' },
              },
            ],
          },
        ],
      });
    });

    describe('Buffer를 TypedArray를 반환해야 하는 함수에서 직접 반환하는 경우', () => {
      ruleTester.run('ts-no-buffer-in-typedarray-context', rule, {
        valid: [],
        invalid: [
          {
            code: `
              const buf = Buffer.from('abc');
              function give(): Int16Array {
                return buf;
              }
            `,
            errors: [
              {
                messageId: 'directBuffer',
                data: { expected: 'Int16Array' },
              },
            ],
          },
        ],
      });
    });

    describe('TypedArray 배열에 Buffer를 직접 넣는 경우', () => {
      ruleTester.run('ts-no-buffer-in-typedarray-context', rule, {
        valid: [],
        invalid: [
          {
            code: `
              const buf = Buffer.from('abc');
              const arr: Uint8Array[] = [buf];
            `,
            errors: [
              {
                messageId: 'directBuffer',
                data: { expected: 'Uint8Array' },
              },
            ],
          },
        ],
      });
    });

    describe('객체 속성에 TypedArray를 기대하는데 Buffer를 넣는 경우', () => {
      ruleTester.run('ts-no-buffer-in-typedarray-context', rule, {
        valid: [],
        invalid: [
          {
            code: `
              const buf = Buffer.from('abc');
              const obj: { x: Int32Array } = { x: buf };
            `,
            errors: [
              {
                messageId: 'directBuffer',
                data: { expected: 'Int32Array' },
              },
            ],
          },
        ],
      });
    });

    describe('조건부 표현식에서 Buffer가 TypedArray로 기대되는 경우', () => {
      ruleTester.run('ts-no-buffer-in-typedarray-context', rule, {
        valid: [],
        invalid: [
          {
            code: `
              const buf = Buffer.from('abc');
              const x: Uint8Array = Math.random() > 0.5 ? buf : new Uint8Array();
            `,
            errors: [
              {
                messageId: 'directBuffer',
                data: { expected: 'Uint8Array' },
              },
            ],
          },
        ],
      });
    });

    describe('Buffer 사용이 허용되어야 하는 Buffer.정적메서드 호출', () => {
      ruleTester.run('ts-no-buffer-in-typedarray-context', rule, {
        valid: [
          {
            code: `
            const list: Buffer[] = [Buffer.from("a"), Buffer.from("b")];
            Buffer.concat(list); // 허용
          `,
          },
          {
            code: `
            const buf = Buffer.from("a");
            Buffer.concat([buf]); // 허용
          `,
          },
        ],
        invalid: [],
      });
    });
  });
});
