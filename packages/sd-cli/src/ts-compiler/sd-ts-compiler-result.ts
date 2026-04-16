import type ts from "typescript";
import type { SerializedDiagnostic } from "../typecheck/typecheck-serialization";
import type { EmitResult } from "../angular/angular-compiler";
import type { LintWithProgramResult } from "../lint/lint-with-program";
import type { NgtscProgram } from "../angular/angular-build";

export interface ISdTsCompilerResult {
  /** TypeScript Program 참조 (lint, 외부 도구용) */
  program: ts.Program;
  /** Builder Program 참조 */
  builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram;
  /** Angular 패키지 여부 */
  isForAngular: boolean;
  /** 이 빌드에서 영향받은 파일 (posix 경로). undefined = 전역 변경 (전체 리빌드) */
  affectedFiles: ReadonlySet<string> | undefined;
  /** 직렬화된 진단 정보 (Worker 경계 통과용) */
  diagnostics: SerializedDiagnostic[];
  /** Error 카테고리 진단 수 */
  errorCount: number;
  /** Warning 카테고리 진단 수 */
  warningCount: number;
  /** Error 카테고리 진단을 "파일:줄:열: TS코드: 메시지" 형식으로 포맷한 배열 */
  errors?: string[];
  /** NgtscProgram 참조 (Angular only, HMR용). Non-Angular이면 undefined */
  ngtscProgram?: NgtscProgram;
  /** Angular emit 결과 (Non-Angular이면 undefined — writeFile 훅으로 디스크 직접 쓰기) */
  emitResults?: EmitResult[];
  /** lint 결과 (lint 옵션 활성 시) */
  lint?: LintWithProgramResult;
  /** SCSS 에러 목록 */
  scssErrors: string[];
  /** SCSS 의존성 맵 (소유자 파일 → 의존 SCSS 경로 집합). watch 역방향 탐색용 */
  scssDependencies: ReadonlyMap<string, ReadonlySet<string>>;
}
