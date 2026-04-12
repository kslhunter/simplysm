/**
 * Angular Build Adapter (Library)
 *
 * @angular/build 및 @angular/compiler-cli API를 단일 모듈에 격리한다.
 * Angular 버전 변경 시 이 파일만 수정하면 된다.
 *
 * Client/Library 빌드 모두 src/angular/angular-compiler.ts의 AngularCompiler를 사용한다.
 */

// ── Re-exports: Angular Compiler (Library) ──
export { NgtscProgram, OptimizeFor } from "@angular/compiler-cli";

// ── Angular Library Host Extensions ──
// NgtscProgram은 ts.CompilerHost를 받지만, 아래 메서드가 있으면 duck-typing으로 호출한다.
// @angular/build/src/tools/angular/angular-host의 AngularCompilerHost에서 추출한 인터페이스.
// 내부 경로가 exports 필드에 의해 차단되므로 자체 정의한다.

export interface AngularLibraryHostExtensions {
  /** 템플릿/스타일 파일을 읽는다 */
  readResource(fileName: string): string | Promise<string>;
  /** 인라인 스타일을 변환한다 (SCSS → CSS 등) */
  transformResource(
    data: string,
    context: {
      type: string;
      containingFile: string;
      resourceFile: string | null;
    },
  ): Promise<{ content: string } | null>;
  /** 변경된 리소스 파일 목록을 반환한다 (incremental compilation용) */
  getModifiedResourceFiles?(): Set<string> | undefined;
}
