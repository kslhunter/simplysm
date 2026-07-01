# @simplysm/sd-cli — SdTsCompiler 컴파일러 API

패키지 디렉토리 1개를 TypeScript 또는 Angular AOT 로 컴파일하고, 진단·emit·lint·SCSS 결과를 `ISdTsCompilerResult` 로 받는 묶음. 대상 패키지 `tsconfig.json` 의 `angularCompilerOptions` 존재 여부로 Angular 모드를 판별한다. `compileAsync` 는 인스턴스 상태(builderProgram·sourceFileCache·packageJsonCache·diagnosticCache)를 호출 간 재사용해 증분 컴파일을 수행한다.

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

- `constructor(options)` — 옵션만 저장하고 컴파일은 하지 않는다. Angular 여부·캐시 등 파생 상태는 첫 `compileAsync` 에서 결정된다.
- `get sideEffectScssRegistry(): Map<string, SideEffectScssEntry>` — side-effect SCSS 항목을 등록·조회하는 내부 레지스트리 참조(emit 코드가 항목을 등록하는 용도). `SideEffectScssEntry` 는 `{ scssAbsPath: string; cssAbsPath: string; sourceFileName: string }`.
- `compileSideEffectScss(): void` — 레지스트리의 모든 항목을 CSS 로 컴파일하고, 에러와 의존성을 컴파일러 내부 SCSS 상태(`scssErrors`·`scssDependencies`)에 누적한다.
- `findAffectedByScss(scssPath: string): string[]` — 경로를 posix 정규화한 뒤, 해당 SCSS 에 의존하는 owner 파일(소유자 소스) 목록을 반환한다(watch 역방향 탐색용).
- `compileAsync(...)` — tsconfig 파싱, (Angular 시)분석, affected 탐색, emit, 진단 수집, lint/global SCSS 처리를 차례로 수행하고 결과 객체를 반환한다. 각 단계는 개별 try/catch 로 감싸여 단계 크래시는 결과 진단에 합산되고 나머지 단계는 계속 진행된다.

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

- `pkgDir: string` — 컴파일 대상 패키지 디렉토리. tsconfig·src/tests·.cache·dist 의 기준이 된다.
- `cwd: string` — workspace 루트; 진단을 workspace 범위로 필터링하고 경로를 상대화하는 데 쓴다.
- `output: { js: boolean; dts: boolean }` — JS/선언파일 출력 제어 컨테이너. emit 산출 종류와 source map 여부를 결정한다.
- `output.js: boolean` — `true` 면 JS emit 을 켜고, non-Angular 인 경우 source map 도 함께 켠다.
- `output.dts: boolean` — `true` 면 `declaration`·`declarationMap` 을 켜고 `declarationDir` 을 `pkgDir/dist` 로 둔다. `js:false && dts:true` 면 `emitDeclarationOnly`, `js:false && dts:false` 면 `noEmit`(타입체크 전용)이 된다.
- `includeTests?: boolean` — `true` 면 패키지 하위 파일(src+tests, 단 자체 tsconfig 를 가진 중첩 프로젝트는 제외)을 rootNames 에 포함한다. 미지정/`false` 면 `src/` 하위 소스만 포함한다.
- `env?: "node" | "browser"` — 타입체크 환경. 지정 시 env 별 compilerOptions 변환을 적용하고 tsbuildinfo 파일명에 env 접미사를 붙인다.
  - `"node"` — `dom`·`webworker` lib 패턴을 제거하고, package devDependencies 의 `@types/*` 이름을 `types` 로 명시 설정한다.
  - `"browser"` — lib 은 그대로 두고, devDependencies `@types/*` 중 `node` 를 제외한 이름을 `types` 로 설정한다.
- `sourceFileCache?: AngularSourceFileCache` — Angular 증분 빌드용 SourceFile 캐시. 미제공 시 첫 컴파일에서 내부 생성한다(non-Angular 에서는 무시).
- `transformStylesheet?: (data, containingFile, stylesheetFile?) => Promise<string | null>` — Angular style 리소스 변환 콜백. 미제공이고 Angular 모드면 라이브러리용 SCSS 변환 콜백을 자동 생성한다.
  - `data: string` — 변환할 style 리소스 원본 내용.
  - `containingFile: string` — style 을 포함한 컴포넌트 파일 경로.
  - `stylesheetFile?: string` — 외부 style 리소스 파일 경로; 인라인 등 리소스 파일이 없으면 `undefined`.
  - 반환 `Promise<string | null>` — `string` 은 변환된 content 로 사용되고, `null` 은 "변환 결과 없음"으로 처리된다.
- `externalStylesheets?: Map<string, string>` — 외부 style 실제 경로를 해시 ID 에 매핑하는 맵(클라이언트 빌드용). 매핑되면 해당 style 은 `<id>.css` 가상 파일명으로 반환된다. 미지정/템플릿 확장자면 실제 경로를 그대로 쓴다.
- `compilerOptionsTransformer?: (options) => ts.CompilerOptions` — 내부에서 구성한 최종 compilerOptions 를 후처리하는 콜백(클라이언트의 target/module 강제 등).
- `lint?: boolean` — `true` 면 같은 `ts.Program` 으로 ESLint 를 실행하고 결과를 `result.lint` 에 담는다(별도 Program 생성 회피).
- `globalScss?: boolean` — `true` 면 `scss/styles.scss` 를 패키지 루트 `styles.css` 로 컴파일하고, 에러는 `result.scssErrors` 에 더한다.

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

- `modifiedFiles?: ReadonlySet<string>` — 직전 호출 이후 변경된 파일 집합. 있으면 Angular SourceFile 캐시를 무효화하고, 변경 경로에 `node_modules` 가 포함되면 packageJson 캐시를 비워 stale 모듈 해석을 막는다. 미지정이면 builderProgram 의 증분 상태로 affected 를 판단한다.
- `emitOptions?: ISdTsCompilerEmitOptions` — emit 단계 추가 옵션(Angular emit 에만 영향).
- `sourceFilter?: (fileName: string) => boolean` — Angular emit 결과에서 통과한 소스만 남기는 필터.
  - `fileName: string` — 필터에 전달되는 원본 소스 파일명.
- `additionalTransformers?: { before?; after? }` — Angular `prepareEmit()` 으로 얻은 transformer 배열 뒤에 push 할 추가 transformer 묶음.
  - `before?: ts.TransformerFactory<ts.SourceFile>[]` — Angular before transformer 뒤에 추가되는 목록.
  - `after?: ts.TransformerFactory<ts.SourceFile>[]` — Angular after transformer 뒤에 추가되는 목록.
- 크래시 처리 — analyze(Angular)·affected 탐색·emit·진단 수집·(lint+global SCSS) 단계는 각각 try/catch 로 보호되며, 단계 크래시는 `SerializedDiagnostic`(Error) 로 결과 진단과 `errorCount` 에 합산된다. 예상 밖 최상위 예외는 단일 크래시 진단 결과로 안전 반환된다.

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

- `program: ts.Program` — 생성된 TypeScript Program 참조(lint·외부 도구용).
- `builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram` — 증분 emit/diagnostics 에 쓰는 Builder Program 참조.
- `isForAngular: boolean` — 파싱한 tsconfig 에 `angularCompilerOptions` 가 있으면 `true`.
- `affectedFiles: ReadonlySet<string> | undefined` — 이번 빌드에서 영향받은 posix 파일 경로 집합. `undefined` 는 전역 변경(전체 리빌드)을 뜻한다.
- `diagnostics: SerializedDiagnostic[]` — workspace 범위로 필터링한 직렬화 진단 + 내부 크래시 진단 목록.
- `errorCount: number` — Error category 진단 수(내부 크래시 진단 포함).
- `warningCount: number` — Warning category 진단 수.
- `errors?: string[]` — Error 진단을 "파일:줄:열: TS코드: 메시지" 형식으로 포맷한 배열; 에러가 없으면 `undefined`.
- `ngtscProgram?: NgtscProgram` — Angular 모드의 Angular compiler program 참조(HMR 등). non-Angular 이면 `undefined`.
- `emitResults?: EmitResult[]` — Angular emit 의 메모리 결과. non-Angular 는 writeFile 훅으로 디스크에 직접 쓰므로 `undefined`.
- `lint?: LintWithProgramResult` — `lint: true` 일 때의 ESLint 결과.
- `scssErrors: string[]` — SCSS 컴파일 에러 목록.
- `scssDependencies: ReadonlyMap<string, ReadonlySet<string>>` — owner 파일 → 의존 SCSS posix 경로 집합 맵(watch 역방향 탐색용).

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
- `EmitResult.contents: string` — emit 출력 내용.
- `EmitResult.sourceFileName: string` — emit 의 원본 소스 파일 경로.
- `LintWithProgramResult.success: boolean` — lint error count 가 0 이면 `true`.
- `LintWithProgramResult.errorCount: number` — lint error 수.
- `LintWithProgramResult.warningCount: number` — lint warning 수.
- `LintWithProgramResult.formattedOutput: string` — ESLint `stylish` formatter 출력 문자열(대상 파일이 없으면 빈 문자열).
- `SerializedDiagnostic` — worker 경계(structured clone)를 넘기기 위해 `ts.Diagnostic` 의 사용자 가시 필드만 보존한 직렬화 진단.
- `SerializedDiagnostic.category: number` — TypeScript diagnostic category 값.
- `SerializedDiagnostic.code: number` — TypeScript diagnostic code 값.
- `SerializedDiagnostic.messageText: string | SerializedMessageChain` — 단순 메시지 문자열, 또는 overload 에러 등에서 구조를 보존한 chain.
- `SerializedDiagnostic.file?: { fileName: string }` — 파일명만 담은 축약 파일 정보.
- `SerializedDiagnostic.start?: number` — 진단 시작 위치.
- `SerializedDiagnostic.length?: number` — 진단 길이.
- `SerializedDiagnostic.relatedInformation?: SerializedDiagnosticRelatedInformation[]` — 관련 진단 정보 배열.
- `SerializedDiagnostic.reportsUnnecessary?: boolean` — TS `reportsUnnecessary` 가 있으면 `true`.
- `SerializedDiagnostic.reportsDeprecated?: boolean` — TS `reportsDeprecated` 가 있으면 `true`.
- `SerializedDiagnostic.source?: string` — diagnostic source 값.
- `SerializedMessageChain.messageText: string` — chain 노드 메시지.
- `SerializedMessageChain.category: number` — chain 노드 category 값.
- `SerializedMessageChain.code: number` — chain 노드 code 값.
- `SerializedMessageChain.next?: SerializedMessageChain[]` — 하위 메시지 chain 목록.
- `SerializedDiagnosticRelatedInformation` — `relatedInformation` 항목(`reportsUnnecessary`/`reportsDeprecated`/`source` 없는 축약 형태).
- `SerializedDiagnosticRelatedInformation.category/code/messageText/file?/start?/length?` — 각각 관련 진단의 category·code·메시지·축약 파일 정보·시작 위치·길이.
