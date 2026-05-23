import { consola, type ConsolaInstance } from "consola";

/**
 * 모듈 레벨에서 사용해도 안전한 lazy logger.
 * consola.withTag() 직접 호출은 호출 시점의 consola.options(level/reporters)를 스냅샷으로 굳혀
 * 이후 setupConsola() 변경이 child 인스턴스에 반영되지 않는다.
 * createLogger 는 첫 메서드 접근 시점까지 withTag 생성을 지연한다.
 *
 * Proxy trap 보강 — vi.spyOn 호환을 위해 has/getOwnPropertyDescriptor 처리하고
 * target 에 직접 설치된 property(=spy)를 cached 보다 우선 반환한다.
 */
export function createLogger(tag: string): ConsolaInstance {
  let cached: ConsolaInstance | undefined;
  const ensure = (): ConsolaInstance => (cached ??= consola.withTag(tag));
  return new Proxy({} as ConsolaInstance, {
    get(target, prop, receiver) {
      if (Reflect.has(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }
      const c = ensure();
      const value: unknown = Reflect.get(c, prop);
      return typeof value === "function" ? value.bind(c) : value;
    },
    has(target, prop) {
      return Reflect.has(target, prop) || Reflect.has(ensure(), prop);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (Reflect.has(target, prop)) {
        return Reflect.getOwnPropertyDescriptor(target, prop);
      }
      const desc = Reflect.getOwnPropertyDescriptor(ensure(), prop);
      return desc != null ? { ...desc, configurable: true } : undefined;
    },
  });
}
