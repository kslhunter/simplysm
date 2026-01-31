// WeakMap 기반 메타데이터 저장 (reflect-metadata 미사용)
const classAuthMap = new WeakMap<Function, string[]>();
const methodAuthMap = new WeakMap<Function, Map<string, string[]>>();

// 메소드 데코레이터에서 클래스 생성자를 나중에 연결하기 위한 임시 저장소
const pendingMethodAuth = new Map<string, { permissions: string[]; methodName: string }[]>();

/**
 * 인증 권한을 설정하는 데코레이터 (Stage 3 Decorators)
 * - 클래스 레벨: 모든 메소드에 기본 권한 적용
 * - 메소드 레벨: 해당 메소드에만 권한 적용 (클래스 레벨 오버라이드)
 *
 * @param permissions 필요한 권한 목록 (빈 배열: 로그인만 필요)
 */
export function Authorize(permissions: string[] = []) {
  return function <T extends Function | ((...args: unknown[]) => unknown)>(
    target: T,
    context: ClassDecoratorContext | ClassMethodDecoratorContext,
  ): T | void {
    if (context.kind === "class") {
      // 클래스 레벨
      classAuthMap.set(target as Function, permissions);

      // 대기 중인 메소드 권한 연결
      const className = context.name ?? "";
      const pending = pendingMethodAuth.get(className);
      if (pending != null) {
        let methodMap = methodAuthMap.get(target as Function);
        if (methodMap == null) {
          methodMap = new Map();
          methodAuthMap.set(target as Function, methodMap);
        }
        for (const { permissions: perms, methodName } of pending) {
          methodMap.set(methodName, perms);
        }
        pendingMethodAuth.delete(className);
      }
    } else {
      // 메소드 레벨 - 클래스 데코레이터가 나중에 실행되므로 임시 저장
      const methodName = String(context.name);

      // addInitializer를 통해 클래스 생성자에 접근
      context.addInitializer(function (this: unknown) {
        const ctor = (this as object).constructor;
        let methodMap = methodAuthMap.get(ctor);
        if (methodMap == null) {
          methodMap = new Map();
          methodAuthMap.set(ctor, methodMap);
        }
        methodMap.set(methodName, permissions);
      });
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
