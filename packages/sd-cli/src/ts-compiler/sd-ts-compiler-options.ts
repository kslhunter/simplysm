import type ts from "typescript";
import type { AngularSourceFileCache } from "../angular/angular-compiler";
import type { TypecheckEnv } from "../utils/tsconfig";

export interface ISdTsCompilerEmitOptions {
  /** emit 대상 소스 필터 (Angular only, 지정 시 해당 파일만 EmitResult에 포함) */
  sourceFilter?: (fileName: string) => boolean;
  /** Angular transformers 외 추가 transformers (Angular only) */
  additionalTransformers?: {
    before?: ts.TransformerFactory<ts.SourceFile>[];
    after?: ts.TransformerFactory<ts.SourceFile>[];
  };
}

export interface ISdTsCompilerOptions {
  /** 패키지 디렉토리 */
  pkgDir: string;
  /** workspace 루트 (diagnostics 필터링 등에 사용) */
  cwd: string;
  /** 출력 제어 플래그 */
  output: { js: boolean; dts: boolean };
  /** tests/ 파일을 rootNames에 포함할지 여부. 기본값 false */
  includeTests?: boolean;
  /** 타입체크 환경. 설정 시 getCompilerOptionsForEnv()를 적용 */
  env?: TypecheckEnv;

  // === Angular 전용 (선택적, isForAngular 시 활성화) ===
  /** SourceFile 캐시 (Angular 증분 빌드용). 미제공 시 내부 생성 */
  sourceFileCache?: AngularSourceFileCache;
  /** 스타일시트 변환 콜백 (Feature 1.3에서 활용) */
  transformStylesheet?: (
    data: string,
    containingFile: string,
    stylesheetFile?: string,
  ) => Promise<string | null>;
  /** 외부 스타일시트 맵 (클라이언트 빌드용, resourceNameToFileName에서 사용) */
  externalStylesheets?: Map<string, string>;
  /** compilerOptions 후처리 (클라이언트의 target/module 강제 등) */
  compilerOptionsTransformer?: (options: ts.CompilerOptions) => ts.CompilerOptions;

  // === SCSS/lint 통합 (Feature 1.3) ===
  /** lint 실행 여부. true이면 compileAsync 결과에 lint 결과 포함 */
  lint?: boolean;
  /** 글로벌 SCSS 컴파일 여부. true이면 scss/styles.scss → styles.css(패키지 루트) 생성 */
  globalScss?: boolean;
}
