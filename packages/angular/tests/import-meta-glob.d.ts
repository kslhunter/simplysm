// vite 의 import.meta.glob 타입 (vitest browser 프로젝트에서 사용).
// vite/client 전체를 끌어오지 않고 필요한 시그니처만 선언한다.
interface ImportMeta {
  glob(pattern: string | string[]): Record<string, () => Promise<unknown>>;
}
