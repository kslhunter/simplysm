import { consola, type ConsolaInstance } from "consola";

/**
 * 모듈 레벨에서 사용해도 안전한 lazy logger.
 * consola.withTag() 직접 호출은 호출 시점의 consola.options(level/reporters)를 스냅샷으로 굳혀
 * 이후 setupConsola() 변경이 child 인스턴스에 반영되지 않는다.
 * createLogger 는 첫 메서드 접근 시점까지 withTag 생성을 지연한다.
 */
export function createLogger(tag: string): ConsolaInstance {
  let cached: ConsolaInstance | undefined;
  return new Proxy({} as ConsolaInstance, {
    get(_target, prop) {
      cached ??= consola.withTag(tag);
      const value: unknown = Reflect.get(cached, prop);
      return typeof value === "function" ? value.bind(cached) : value;
    },
  });
}
