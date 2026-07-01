# @simplysm/sd-cli — SdTsCompiler

패키지 단위 TypeScript 및 Angular AOT 컴파일. 증분 컴파일, SCSS 처리, lint 통합, 진단/emit 결과 반환. tsconfig.json 의 angularCompilerOptions 존재 여부로 Angular 모드 자동 판별. 호출 간 상태(builderProgram, sourceFileCache, packageJsonCache) 재사용해 증분 빌드 최적화.

## SdTsCompiler

패키지 단위 컴파일러 클래스. 생성자는 옵션만 저장, 컴파일은 compileAsync 에서 수행.

```typescript
class SdTsCompiler {
  constructor(options: ISdTsCompilerOptions);
  async compileAsync(
    modifiedFiles?: ReadonlySet<string>,
    emitOptions?: ISdTsCompilerEmitOptions,
  ): Promise<ISdTsCompilerResult>;
  compileSideEffectScss(): void;
  findAffectedByScss(scssPath: string): string[];
  get sideEffectScssRegistry(): Map<string, SideEffectScssEntry>;
}
```

### constructor(options: ISdTsCompilerOptions)

생성자. 옵션만 저장. Angular 여부, 캐시 등 파생 상태는 첫 compileAsync 에서 결정.

### async compileAsync(modifiedFiles?, emitOptions?): Promise<ISdTsCompilerResult>

TS/Angular 컴파일 실행.

- `modifiedFiles?: ReadonlySet<string>` — 변경된 파일 경로 집합. undefined 또는 비어있으면 전체 리빌드. 지정 시:
  - Angular SourceFile 캐시 무효화.
  - node_modules 변경 감지 시 packageJsonCache 클리어 (stale 모듈 해석 방지).
- `emitOptions?: ISdTsCompilerEmitOptions` — emit 추가 옵션 (Angular only).
- 반환: ISdTsCompilerResult. 컴파일 결과, 진단, emit 파일 포함.

### compileSideEffectScss(): void

Side-effect SCSS 레지스트리의 모든 항목을 CSS 로 컴파일.

- emit 코드에서 등록한 항목 처리.
- 에러는 scssErrors 에, 의존성은 scssDependencies 에 누적.

### findAffectedByScss(scssPath: string): string[]

SCSS 역방향 의존성 탐색. scssPath 에 의존하는 TS 파일 목록 반환.

- 경로 posix 정규화.
- watch 모드에서 .scss 변경 시 영향받는 TS 파일 재컴파일 트리거용.

### get sideEffectScssRegistry(): Map<string, SideEffectScssEntry>

Side-effect SCSS 레지스트리. emit 코드에서 항목 등록용 (읽기/쓰기).

- SideEffectScssEntry = { scssAbsPath: string; cssAbsPath: string; sourceFileName: string }.

## ISdTsCompilerOptions

컴파일러 초기화 옵션.

```typescript
interface ISdTsCompilerOptions {
  pkgDir: string;
  cwd: string;
  output: { js: boolean; dts: boolean };
  includeTests?: boolean;
  env?: "node" | "browser";
  sourceFileCache?: AngularSourceFileCache;
  transformStylesheet?: (
    data: string,
    containingFile: string,
    stylesheetFile?: string,
  ) => Promise<string | null>;
  externalStylesheets?: Map<string, string>;
  compilerOptionsTransformer?: (options: ts.CompilerOptions) => ts.CompilerOptions;
  lint?: boolean;
  globalScss?: boolean;
}
```

- `pkgDir`: string — 패키지 디렉토리 (절대 경로 예상). tsconfig, src, tests, .cache, dist 기준.
- `cwd`: string — workspace 루트. 진단 필터링, 경로 상대화.
- `output`: { js: boolean; dts: boolean } — 출력 제어.
  - `js: true` → .js emit. non-Angular 시 sourceMap 도 활성화.
  - `dts: true` → .d.ts emit (declarationDir = pkgDir/dist).
  - `js: false, dts: true` → emitDeclarationOnly.
  - `js: false, dts: false` → noEmit (타입체크 전용).
- `includeTests?`: boolean — tests/ 파일을 rootNames 포함 (기본값 false). true = src + tests 모두.
- `env?`: "node" | "browser" — 타입체크 환경.
  - "node": dom/webworker lib 제외, node @types 포함.
  - "browser": node @types 제외. tsbuildinfo 파일명에 env 접미사 추가.
- `sourceFileCache?`: AngularSourceFileCache — Angular 증분 빌드 캐시. 미제공 시 내부 생성 (non-Angular 무시).
- `transformStylesheet?`: (data, containingFile, stylesheetFile?) => Promise<string | null> — Angular style 변환 콜백.
  - data: 원본 style 내용.
  - containingFile: 컴포넌트 파일 경로.
  - stylesheetFile?: 외부 style 파일 경로 (인라인 = undefined).
  - 반환: string = 변환 결과, null = 변환 안 함.
  - 미제공 + Angular = 라이브러리용 SCSS 변환 자동 생성.
- `externalStylesheets?`: Map<string, string> — 외부 style 경로 → ID 매핑 (클라이언트용). 매핑되면 style 을 <id>.css 가상 파일로 반환.
- `compilerOptionsTransformer?`: (options) => ts.CompilerOptions — compilerOptions 후처리 (클라이언트 target/module 강제 등).
- `lint?`: boolean — lint 실행 여부 (기본값 false). true = result.lint 에 ESLint 결과 포함 (별도 Program 생성 회피).
- `globalScss?`: boolean — 글로벌 SCSS 컴파일 (기본값 false). true = scss/styles.scss → styles.css (패키지 루트).

## ISdTsCompilerEmitOptions

compileAsync 인자. 고급 emit 제어 (Angular only).

```typescript
interface ISdTsCompilerEmitOptions {
  sourceFilter?: (fileName: string) => boolean;
  additionalTransformers?: {
    before?: ts.TransformerFactory<ts.SourceFile>[];
    after?: ts.TransformerFactory<ts.SourceFile>[];
  };
}
```

- `sourceFilter?`: (fileName: string) => boolean — emit 결과 필터. 조건 만족 파일만 emitResults 포함 (Angular only).
- `additionalTransformers?`: { before?, after? } — Angular prepareEmit transformer 뒤에 추가할 transformer (Angular only).
  - `before?`: ts.TransformerFactory<ts.SourceFile>[] — before 추가 transformer.
  - `after?`: ts.TransformerFactory<ts.SourceFile>[] — after 추가 transformer.

### 크래시 처리

analyze(Angular), affected 탐색, emit, 진단 수집, lint+global SCSS 각 단계는 개별 try/catch 로 보호. 단계 크래시 = SerializedDiagnostic Error 로 결과 진단·errorCount 에 합산. 최상위 예외 = 단일 크래시 진단으로 안전 반환.

## ISdTsCompilerResult

컴파일 결과. 진단, emit, lint, SCSS 정보.

```typescript
interface ISdTsCompilerResult {
  program: ts.Program;
  builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram;
  isForAngular: boolean;
  affectedFiles: ReadonlySet<string> | undefined;
  diagnostics: SerializedDiagnostic[];
  errorCount: number;
  warningCount: number;
  errors?: string[];
  ngtscProgram?: NgtscProgram;
  emitResults?: EmitResult[];
  lint?: LintWithProgramResult;
  scssErrors: string[];
  scssDependencies: ReadonlyMap<string, ReadonlySet<string>>;
}
```

- `program`: ts.Program — TypeScript Program 참조 (lint, 외부 도구용).
- `builderProgram`: ts.EmitAndSemanticDiagnosticsBuilderProgram — Builder Program. 증분 emit/diagnostics 상태 포함.
- `isForAngular`: boolean — Angular 패키지 여부 (tsconfig.json angularCompilerOptions 존재).
- `affectedFiles`: ReadonlySet<string> | undefined — 영향받은 파일 (posix 경로).
  - undefined: 전체 리빌드 (캐시 miss 등).
  - Set: 변경/삭제/추가 파일 목록.
- `diagnostics`: SerializedDiagnostic[] — 직렬화된 진단 (workspace 범위 필터링 + 크래시 진단).
- `errorCount`: number — Error 카테고리 진단 수 (크래시 진단 포함).
- `warningCount`: number — Warning 카테고리 진단 수.
- `errors?`: string[] — Error 진단 포맷: "파일:줄:열: TSxxxx: 메시지". 에러 없으면 undefined.
- `ngtscProgram?`: NgtscProgram — Angular Program 참조 (HMR용). Non-Angular = undefined.
- `emitResults?`: EmitResult[] — Angular emit 메모리 결과 (sourceFile + JS 컨텐츠).
  - Non-Angular: undefined (writeFile 훅으로 디스크 직접 기록).
- `lint?`: LintWithProgramResult — ESLint 결과 (lint 옵션 활성 시).
- `scssErrors`: string[] — SCSS 컴파일 에러.
- `scssDependencies`: ReadonlyMap<string, ReadonlySet<string>> — SCSS 의존성 맵 (소유자 → 의존 SCSS 경로). watch 역방향 탐색용.

### 내부 구조 (참고)

```typescript
interface EmitResult {
  filename: string;
  contents: string;
  sourceFileName: string;
}

interface LintWithProgramResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  formattedOutput: string;
}

interface SerializedDiagnostic {
  category: number;
  code: number;
  messageText: string | SerializedMessageChain;
  file?: { fileName: string };
  start?: number;
  length?: number;
  relatedInformation?: SerializedDiagnosticRelatedInformation[];
  reportsUnnecessary?: boolean;
  reportsDeprecated?: boolean;
  source?: string;
}

interface SerializedMessageChain {
  messageText: string;
  category: number;
  code: number;
  next?: SerializedMessageChain[];
}

interface SerializedDiagnosticRelatedInformation {
  category: number;
  code: number;
  messageText: string | SerializedMessageChain;
  file?: { fileName: string };
  start?: number;
  length?: number;
}
```

- `EmitResult`: Angular emit 개별 파일.
  - `filename`: emit 출력 파일명.
  - `contents`: emit JS 컨텐츠.
  - `sourceFileName`: 원본 소스 파일 경로.
- `LintWithProgramResult`: ESLint 결과.
  - `success`: boolean — errorCount = 0 이면 true.
  - `errorCount`, `warningCount`: 진단 수.
  - `formattedOutput`: stylish formatter 문자열 (대상 파일 없으면 빈 문자열).
- `SerializedDiagnostic`: Worker 경계 통과용 직렬화 진단 (ts.Diagnostic 사용자 필드만).
  - `category`, `code`: TypeScript 값.
  - `messageText`: 문자열 또는 overload chain.
  - `file?`: { fileName } — 축약.
  - `start?`, `length?`: 위치.
  - `relatedInformation?`: 관련 진단.
  - `reportsUnnecessary?`, `reportsDeprecated?`, `source?`: 추가 정보.
- `SerializedMessageChain`: 중첩 메시지 (overload 에러 등).
  - `messageText`, `category`, `code`, `next?`.
- `SerializedDiagnosticRelatedInformation`: relatedInformation 항목 (축약).
