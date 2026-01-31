export const SD_SERVICE_AUTH_META = Symbol("sd-service:authorize");

export function Authorize(permissions: string[] = []) {
  return function (target: any, propertyKey?: string) {
    // 클래스 레벨
    if (propertyKey == null) {
      Reflect.defineMetadata(SD_SERVICE_AUTH_META, permissions, target);
    }
    // 메소드 레벨
    else {
      Reflect.defineMetadata(SD_SERVICE_AUTH_META, permissions, target, propertyKey);
    }
  };
}
