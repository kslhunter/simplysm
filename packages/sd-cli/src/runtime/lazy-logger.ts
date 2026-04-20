import { consola, type ConsolaInstance } from "consola";

/**
 * 모듈 레벨에서 선언해도 안전한 lazy logger 프록시.
 *
 * consola.withTag()는 호출 시점의 consola.options(level/reporters)를
 * 스냅샷 복사한 새 인스턴스를 반환한다. 모듈 import 시점에 호출하면
 * setupConsola 이전의 기본 level(info) 상태가 고정되어 이후 setupConsola가
 * level을 debug로 올려도 반영되지 않는다.
 *
 * createLazyLogger는 실제 ConsolaInstance 생성을 첫 접근 시점까지 미뤄
 * setupConsola 이후의 설정이 반영된 스냅샷을 갖도록 한다.
 */
export function createLazyLogger(tag: string): ConsolaInstance {
  let cached: ConsolaInstance | undefined;
  return new Proxy({} as ConsolaInstance, {
    get(_target, prop) {
      cached ??= consola.withTag(tag);
      const value: unknown = Reflect.get(cached, prop);
      return typeof value === "function" ? value.bind(cached) : value;
    },
  });
}
