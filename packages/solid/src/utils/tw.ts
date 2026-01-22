/**
 * Tailwind CSS IntelliSense를 위한 태그 함수
 * 런타임에는 문자열을 그대로 반환
 */
export const tw = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  String.raw({ raw: strings }, ...values);
