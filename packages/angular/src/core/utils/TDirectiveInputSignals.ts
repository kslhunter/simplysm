import type { InputSignal } from "@angular/core";

/**
 * undefined를 포함하는 프로퍼티를 optional로 변환하는 유틸리티 타입
 *
 * `{ name: string; age: number | undefined }` -> `{ name: string; age?: number }`
 */
export type TUndefToOptional<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};

/**
 * 컴포넌트/디렉티브의 InputSignal 프로퍼티에서 값 타입을 추출하는 유틸리티 타입
 *
 * InputSignal이 아닌 프로퍼티는 제외되며, undefined를 포함하는 필드는 optional로 변환된다.
 *
 * @example
 * ```typescript
 * class MyComponent {
 *   name = input.required<string>();
 *   age = input(0);
 * }
 * // TDirectiveInputSignals<MyComponent> = { name: string; age: number }
 * ```
 */
export type TDirectiveInputSignals<T> = TUndefToOptional<{
  [P in keyof T as T[P] extends InputSignal<any> ? P : never]: T[P] extends InputSignal<
    infer V
  >
    ? V
    : never;
}>;
