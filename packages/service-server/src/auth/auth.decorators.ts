// WeakMap 기반 메타데이터 저장 (reflect-metadata 미사용)
const classAuthMap = new WeakMap<Function, string[]>();
const methodAuthMap = new WeakMap<Function, Map<string, string[]>>();

/**
 * 인증 권한을 설정하는 데코레이터
 * - 클래스 레벨: 모든 메소드에 기본 권한 적용
 * - 메소드 레벨: 해당 메소드에만 권한 적용 (클래스 레벨 오버라이드)
 *
 * @param permissions 필요한 권한 목록 (빈 배열: 로그인만 필요)
 */
export function Authorize(permissions: string[] = []) {
  return function (target: unknown, propertyKey?: string) {
    if (propertyKey == null) {
      // 클래스 레벨
      classAuthMap.set(target as Function, permissions);
    } else {
      // 메소드 레벨
      const ctor = (target as object).constructor;
      let methodMap = methodAuthMap.get(ctor);
      if (methodMap == null) {
        methodMap = new Map();
        methodAuthMap.set(ctor, methodMap);
      }
      methodMap.set(propertyKey, permissions);
    }
  };
}

/**
 * 인증 권한 조회
 * - 메소드 레벨 권한 우선
 * - 없으면 클래스 레벨 권한 반환
 *
 * @param ctor 서비스 클래스 생성자
 * @param methodName 메소드 이름 (선택)
 * @returns 권한 목록 또는 undefined (Public API)
 */
export function getAuthPermissions(ctor: Function, methodName?: string): string[] | undefined {
  if (methodName != null) {
    const perms = methodAuthMap.get(ctor)?.get(methodName);
    if (perms != null) return perms;
  }
  return classAuthMap.get(ctor);
}
