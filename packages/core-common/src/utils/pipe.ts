/**
 * 비동기 파이프라인 - 동기/비동기 함수를 순차적으로 연결
 *
 * @remarks
 * - 동기 함수와 비동기 함수를 혼합하여 사용 가능
 * - 항상 Promise를 반환
 * - Remeda의 pipe와 함께 사용 가능
 *
 * @example
 * ```typescript
 * // 동기 함수만
 * await pipeAsync([1, 2, 3], arr => arr.map(x => x * 2)); // [2, 4, 6]
 *
 * // 비동기 함수
 * await pipeAsync([1, 2, 3], mapAsync(async x => x * 2)); // [2, 4, 6]
 *
 * // 혼합 사용
 * await pipeAsync(
 *   items,
 *   filterAsync(async x => await checkAsync(x)),
 *   toMap(x => x.id)
 * );
 * ```
 */
export function pipeAsync<A, B>(value: A, fn1: (a: A) => B | Promise<B>): Promise<Awaited<B>>;
export function pipeAsync<A, B, C>(
  value: A,
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: Awaited<B>) => C | Promise<C>,
): Promise<Awaited<C>>;
export function pipeAsync<A, B, C, D>(
  value: A,
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: Awaited<B>) => C | Promise<C>,
  fn3: (c: Awaited<C>) => D | Promise<D>,
): Promise<Awaited<D>>;
export function pipeAsync<A, B, C, D, E>(
  value: A,
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: Awaited<B>) => C | Promise<C>,
  fn3: (c: Awaited<C>) => D | Promise<D>,
  fn4: (d: Awaited<D>) => E | Promise<E>,
): Promise<Awaited<E>>;
export function pipeAsync<A, B, C, D, E, F>(
  value: A,
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: Awaited<B>) => C | Promise<C>,
  fn3: (c: Awaited<C>) => D | Promise<D>,
  fn4: (d: Awaited<D>) => E | Promise<E>,
  fn5: (e: Awaited<E>) => F | Promise<F>,
): Promise<Awaited<F>>;
export function pipeAsync<A, B, C, D, E, F, G>(
  value: A,
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: Awaited<B>) => C | Promise<C>,
  fn3: (c: Awaited<C>) => D | Promise<D>,
  fn4: (d: Awaited<D>) => E | Promise<E>,
  fn5: (e: Awaited<E>) => F | Promise<F>,
  fn6: (f: Awaited<F>) => G | Promise<G>,
): Promise<Awaited<G>>;
export function pipeAsync<A, B, C, D, E, F, G, H>(
  value: A,
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: Awaited<B>) => C | Promise<C>,
  fn3: (c: Awaited<C>) => D | Promise<D>,
  fn4: (d: Awaited<D>) => E | Promise<E>,
  fn5: (e: Awaited<E>) => F | Promise<F>,
  fn6: (f: Awaited<F>) => G | Promise<G>,
  fn7: (g: Awaited<G>) => H | Promise<H>,
): Promise<Awaited<H>>;
export function pipeAsync<A, B, C, D, E, F, G, H, I>(
  value: A,
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: Awaited<B>) => C | Promise<C>,
  fn3: (c: Awaited<C>) => D | Promise<D>,
  fn4: (d: Awaited<D>) => E | Promise<E>,
  fn5: (e: Awaited<E>) => F | Promise<F>,
  fn6: (f: Awaited<F>) => G | Promise<G>,
  fn7: (g: Awaited<G>) => H | Promise<H>,
  fn8: (h: Awaited<H>) => I | Promise<I>,
): Promise<Awaited<I>>;
export function pipeAsync<A, B, C, D, E, F, G, H, I, J>(
  value: A,
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: Awaited<B>) => C | Promise<C>,
  fn3: (c: Awaited<C>) => D | Promise<D>,
  fn4: (d: Awaited<D>) => E | Promise<E>,
  fn5: (e: Awaited<E>) => F | Promise<F>,
  fn6: (f: Awaited<F>) => G | Promise<G>,
  fn7: (g: Awaited<G>) => H | Promise<H>,
  fn8: (h: Awaited<H>) => I | Promise<I>,
  fn9: (i: Awaited<I>) => J | Promise<J>,
): Promise<Awaited<J>>;
export async function pipeAsync(
  value: unknown,
  ...fns: ((arg: unknown) => unknown | Promise<unknown>)[]
): Promise<unknown> {
  let result = value;
  for (const fn of fns) {
    result = await fn(result);
  }
  return result;
}
