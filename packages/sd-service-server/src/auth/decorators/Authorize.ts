export function Authorize() {
  return function (target: any, propertyKey?: string) {
    // 클래스 레벨
    if (propertyKey == null) {
      Reflect.defineMetadata("sd-service:authorize", true, target);
    }
    // 메소드 레벨
    else {
      Reflect.defineMetadata("sd-service:authorize", true, target, propertyKey);
    }
  };
}
