import type ts from "typescript";

/**
 * TypeScript 타입 캐시를 생성하고 캐시된 타입을 반환하는 헬퍼를 제공합니다.
 */
export function createTypeCacheHelper(checker: ts.TypeChecker) {
  const cache = new WeakMap<ts.Node, ts.Type>();

  return {
    getCachedType(tsNode: ts.Node): ts.Type {
      const cached = cache.get(tsNode);
      if (cached !== undefined) return cached;
      const type = checker.getTypeAtLocation(tsNode);
      cache.set(tsNode, type);
      return type;
    },
  };
}
