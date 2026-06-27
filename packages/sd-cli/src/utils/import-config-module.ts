import { pathToFileURL } from "node:url";

/**
 * 워크스페이스 TS 설정 파일(`sd.config.ts`·`eslint.config.ts` 등)을 동적 import 한다.
 *
 * - `.ts` 로딩은 실행 런타임(개발: tsx, 프로덕션: Node 의 native type-stripping)에 위임한다.
 *   별도 트랜스파일러(jiti)를 직접 의존하지 않는다 — jiti 는 워크스페이스(루트 / init 템플릿)가 제공.
 * - 테스트에서 이 함수만 mock 하면 동적 import 결과를 주입할 수 있다.
 */
export function importConfigModule(absPath: string): Promise<unknown> {
  return import(pathToFileURL(absPath).href);
}
