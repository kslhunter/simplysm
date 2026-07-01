# @simplysm/sd-cli — SdTsCompiler 컴파일러 API

패키지 디렉토리 1개를 TypeScript 또는 Angular AOT 로 컴파일하고, 진단·emit·lint·SCSS 결과를 `ISdTsCompilerResult` 로 받는 묶음. `tsconfig` 의 `angularCompilerOptions` 존재 여부로 Angular 모드를 판별한다.

## SdTsCompiler

```typescript
class SdTsCompiler {
  constructor(options: ISdTsCompilerOptions);
  get sideEffectScssRegistry(): Map<string, SideEffectScssEntry>;
  compileSideEffectScss(): void;
  findAffectedByScss(scssPath: string): string[];
  compileAsync(
    modifiedFiles?: ReadonlySet<string>,
    emitOptions?: ISdTsCompilerEmitOptions,
  ): Promise<ISdTsCompilerResult>;
}
```

- `constructor(options)` — 컴파일 대상 패키지, 출력, Angular/lint/SCSS 옵션을 저장한다.
- `sideEffectScssRegistry: Map<string, SideEffectScssEntry>` — side-effect SCSS 항목을 등록·조회하는 내부 레지스트리 참조.
- `compileSideEffectScss(): void` — 레지스트리의 모든 side-effect SCSS 를 컴파일하고 에러·의존성을 컴파일러 상태에 누적한다.
- `findAffectedByScss(scssPath: string): string[]` — posix 정규화한 SCSS 경로에 의존하는 owner 파일 목록을 반환한다.
- `compileAsync(...)` — tsconfig 파싱, Angular 분석, affected 탐색, emit, 진단 수집, lint/global SCSS 처리를 실행하고 결과 객체를 반환한다.

## ISdTsCompilerOptions

```typescript
interface ISdTsCompilerOptions {
  pkgDir: string;
  cwd: string;
  output: { js: boolean; dts: boolean };
  includeTests?: boolean;
  env?: TypecheckEnv;
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

type TypecheckEnv = "node" | "browser";
```

- `pkgDir: string` — 컴파일 대상 패키지 디렉토리.
- `cwd: string` — workspace 루트; 진단 필터링과 경로 상대화에 사용된다.
- `output: { js: boolean; dts: boolean }` — JS/선언파일 출력 제어 컨테이너.
- `output.js: boolean` — `true` 면 JS emit 을 켜고, Angular 가 아닌 경우 source map 도 켠다.
- `output.dts: boolean` — `true` 면 declaration/declarationMap 을 켜고 `declarationDir` 을 `pkgDir/dist` 로 둔다; `output.js` 가 `false` 이면 `emitDeclarationOnly` 가 된다.
- `includeTests?: boolean` — `true` 면 패키지 하위 파일(src+tests)을 rootNames 에 포함하고, 미지정/`false` 면 `src/` 하위 소스만 포함한다.
- `env?: "node" | "browser"` — 타입체크 환경; 지정 시 env 별 compilerOptions 변환을 적용하고 tsbuildinfo 파일명에 env 접미사를 붙인다.
- `"node"` — DOM/webworker lib 패턴을 제거하고 package devDependencies 의 `@types/*` 를 types 로 설정한다.
- `"browser"` — lib 은 유지하고 package devDependencies 의 `@types/*` 중 `node` 를 제외해 types 로 설정한다.
- `sourceFileCache?: AngularSourceFileCache` — Angular 증분 빌드용 SourceFile 캐시; 미제공 시 내부에서 생성한다.
- `transformStylesheet?: (...) => Promise<string | null>` — Angular style 리소스 변환 콜백; 미제공이고 Angular 모드이면 라이브러리용 SCSS 변환 콜백을 자동 생성한다.
- `data: string` — 변환할 style 리소스 내용.
- `containingFile: string` — style 을 포함한 파일 경로.
- `stylesheetFile?: string` — 외부 style 리소스 파일 경로; 리소스 파일이 없으면 `undefined` 로 전달된다.
- `Promise<string | null>` — `string` 은 변환된 content 로 사용되고, `null` 은 변환 결과 없음으로 처리된다.
- `externalStylesheets?: Map<string, string>` — 외부 style 실제 경로를 해시 ID 에 매핑하는 맵; 외부 style 은 `<id>.css` 가상 파일명으로 반환된다.
- `compilerOptionsTransformer?: (options) => ts.CompilerOptions` — 최종 compilerOptions 후처리 콜백.
- `lint?: boolean` — `true` 면 같은 `ts.Program` 으로 ESLint 를 실행하고 결과를 `result.lint` 에 담는다.
- `globalScss?: boolean` — `true` 면 `scss/styles.scss` 를 패키지 루트 `styles.css` 로 컴파일하고 에러를 `scssErrors` 에 담는다.

## compileAsync / ISdTsCompilerEmitOptions

```typescript
compileAsync(
  modifiedFiles?: ReadonlySet<string>,
  emitOptions?: ISdTsCompilerEmitOptions,
): Promise<ISdTsCompilerResult>;

interface ISdTsCompilerEmitOptions {
  sourceFilter?: (fileName: string) => boolean;
  additionalTransformers?: {
    before?: ts.TransformerFactory<ts.SourceFile>[];
    after?: ts.TransformerFactory<ts.SourceFile>[];
  };
}
```

- `modifiedFiles?: ReadonlySet<string>` — 직전 호출 이후 변경된 파일 집합; 있으면 Angular SourceFile 캐시를 무효화하고 `node_modules` 경로가 포함될 때 packageJson cache 를 비운다.
- `emitOptions?: ISdTsCompilerEmitOptions` — emit 단계 추가 옵션.
- `sourceFilter?: (fileName: string) => boolean` — Angular emit 결과에서 지정한 소스 파일만 남기는 필터.
- `fileName: string` — `sourceFilter` 에 전달되는 원본 소스 파일명.
- `additionalTransformers?: { before?: ...; after?: ... }` — Angular `prepareEmit()` 으로 얻은 transformer 배열 뒤에 추가할 transformer 묶음.
- `before?: ts.TransformerFactory<ts.SourceFile>[]` — Angular before transformer 뒤에 push 되는 추가 before transformer 목록.
- `after?: ts.TransformerFactory<ts.SourceFile>[]` — Angular after transformer 뒤에 push 되는 추가 after transformer 목록.
- 단계별 catch 대상 — Angular analyze, affected 탐색, emit, 진단 수집, lint+global SCSS 단계의 크래시는 `SerializedDiagnostic` 에러로 결과에 합산된다.

## ISdTsCompilerResult

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

- `program: ts.Program` — 생성된 TypeScript Program 참조.
- `builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram` — 증분 emit/diagnostics 에 사용하는 Builder Program 참조.
- `isForAngular: boolean` — 파싱된 tsconfig 에 `angularCompilerOptions` 가 있으면 `true`.
- `affectedFiles: ReadonlySet<string> | undefined` — 이번 빌드에서 영향받은 posix 파일 경로 집합; `undefined` 는 전역 변경이다.
- `diagnostics: SerializedDiagnostic[]` — workspace 범위로 필터링한 직렬화 진단과 내부 크래시 진단 목록.
- `errorCount: number` — Error category 진단 수; 내부 크래시 진단도 포함한다.
- `warningCount: number` — Warning category 진단 수.
- `errors?: string[]` — Error category 진단을 포맷한 문자열 배열; 에러가 없으면 `undefined`.
- `ngtscProgram?: NgtscProgram` — Angular 모드에서 사용하는 Angular compiler program 참조.
- `emitResults?: EmitResult[]` — Angular emit 메모리 결과; non-Angular 는 writeFile 훅으로 디스크에 쓰므로 `undefined` 다.
- `lint?: LintWithProgramResult` — `lint: true` 일 때 실행한 ESLint 결과.
- `scssErrors: string[]` — SCSS 컴파일 에러 목록.
- `scssDependencies: ReadonlyMap<string, ReadonlySet<string>>` — owner 파일에서 의존 SCSS posix 경로 집합으로 가는 맵.

## 반환값 내부 구조

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

- `EmitResult.filename: string` — emit 출력 파일명.
- `contents: string` — emit 출력 내용.
- `sourceFileName: string` — emit 의 원본 소스 파일 경로.
- `LintWithProgramResult.success: boolean` — lint error count 가 0 이면 `true`.
- `LintWithProgramResult.errorCount: number` — lint error 수.
- `LintWithProgramResult.warningCount: number` — lint warning 수.
- `formattedOutput: string` — ESLint formatter(`stylish`) 출력 문자열.
- `SerializedDiagnostic.category: number` — TypeScript diagnostic category 값.
- `code: number` — TypeScript diagnostic code 값.
- `messageText: string | SerializedMessageChain` — 단순 메시지 또는 chain 구조로 보존된 메시지.
- `file?: { fileName: string }` — 진단 파일명만 담은 축약 파일 정보.
- `start?: number` — 진단 시작 위치.
- `length?: number` — 진단 길이.
- `relatedInformation?: SerializedDiagnosticRelatedInformation[]` — 관련 진단 정보 배열.
- `reportsUnnecessary?: boolean` — TypeScript `reportsUnnecessary` 플래그가 있으면 `true`.
- `reportsDeprecated?: boolean` — TypeScript `reportsDeprecated` 플래그가 있으면 `true`.
- `source?: string` — TypeScript diagnostic source 값.
- `SerializedMessageChain.messageText: string` — chain 노드의 diagnostic 메시지.
- `SerializedMessageChain.category: number` — chain 노드의 diagnostic category 값.
- `SerializedMessageChain.code: number` — chain 노드의 diagnostic code 값.
- `SerializedMessageChain.next?: SerializedMessageChain[]` — 다음 하위 메시지 chain 목록.
- `SerializedDiagnosticRelatedInformation.category: number` — 관련 진단의 category 값.
- `SerializedDiagnosticRelatedInformation.code: number` — 관련 진단의 code 값.
- `SerializedDiagnosticRelatedInformation.messageText: string | SerializedMessageChain` — 관련 진단 메시지.
- `SerializedDiagnosticRelatedInformation.file?: { fileName: string }` — 관련 진단 파일명만 담은 축약 파일 정보.
- `SerializedDiagnosticRelatedInformation.start?: number` — 관련 진단 시작 위치.
- `SerializedDiagnosticRelatedInformation.length?: number` — 관련 진단 길이.
