# @simplysm/sd-cli — SdTsCompiler

패키지 디렉토리의 `.ts` 를 TypeScript 또는 Angular AOT 로 **증분** 컴파일하는 클래스. 한 번의 `compileAsync` 호출로 직렬화된 진단 + emit 결과 + lint + SCSS 결과를 한 묶음(`ISdTsCompilerResult`)으로 반환한다. tsconfig 의 `angularCompilerOptions` 존재 여부로 Angular/일반 모드를 자동 판별. 빌드 엔진과 `sdAngularPlugin` 내부에서 사용. 진단은 worker 경계를 통과하도록 `SerializedDiagnostic` 으로 직렬화되며, 내부 크래시는 단계별로 잡아 진단으로 보고(부분 복구)한다.

## ISdTsCompilerOptions (생성자 인자)

```typescript
interface ISdTsCompilerOptions {
  pkgDir: string;
  cwd: string;
  output: { js: boolean; dts: boolean };
  includeTests?: boolean;
  env?: TypecheckEnv;
  // Angular 전용 (isForAngular 시 활성)
  sourceFileCache?: AngularSourceFileCache;
  transformStylesheet?: (data: string, containingFile: string, stylesheetFile?: string) => Promise<string | null>;
  externalStylesheets?: Map<string, string>;
  compilerOptionsTransformer?: (options: ts.CompilerOptions) => ts.CompilerOptions;
  // SCSS/lint 통합
  lint?: boolean;
  globalScss?: boolean;
}
```

- pkgDir: string — 컴파일 대상 패키지 디렉토리. `<pkgDir>/tsconfig.json` 을 파싱하고 `<pkgDir>/dist` 로 emit, `<pkgDir>/.cache` 에 tsbuildinfo 를 둔다.
- cwd: string — 워크스페이스 루트. 진단 필터링(`isWorkspaceDiagnostic`)·경로 상대화·에러 포맷 기준점.
- output.js: boolean — JS emit 여부. true 면 `.js` 산출(non-Angular 은 import 에 `.js` 확장자 부착 + 경로 재작성, Angular 은 `emitResults` 로 반환).
- output.dts: boolean — `.d.ts` emit 여부. `js`/`dts` 조합에 따라 emit-only·declaration-only·noEmit(둘 다 false = 타입체크만) 으로 분기.
- includeTests?: boolean — `tests/` 파일을 rootNames 에 포함할지. 기본 false. 테스트까지 컴파일해야 하면 true(예: `sdAngularPlugin`).
- env?: TypecheckEnv — 타입체크 환경. 지정 시 `getCompilerOptionsForEnv()` 로 환경별 compilerOptions 를 적용하고 tsbuildinfo 파일명에 접미사를 붙임. 환경 분리 타입체크에 쓴다.
- sourceFileCache?: AngularSourceFileCache — Angular 증분용 SourceFile 캐시. 미제공 시 내부 생성. 여러 `compileAsync` 라운드 간 캐시를 공유하려면 외부에서 주입.
- transformStylesheet?: (data, containingFile, stylesheetFile?) => Promise<string|null> — 컴포넌트 스타일 변환 콜백(Angular only). `null` 반환 시 변환 안 함. 미제공이고 Angular 면 라이브러리용 SCSS 변환 콜백을 자동 생성. 클라이언트 빌드처럼 커스텀 스타일 파이프라인이 필요할 때 직접 제공.
- externalStylesheets?: Map<string, string> — 외부 스타일시트 맵(클라이언트 빌드용). 지정 시 비-템플릿 스타일 리소스를 해시 기반 `.css` 외부 파일명으로 매핑(`resourceNameToFileName`). 스타일을 별도 청크로 뽑을 때.
- compilerOptionsTransformer?: (options) => ts.CompilerOptions — 최종 compilerOptions 후처리 훅. 클라이언트의 `target`/`module`/`rootDir` 강제 등에 쓴다.
- lint?: boolean — true 면 `compileAsync` 가 program 기반 lint 를 함께 돌려 결과를 `result.lint` 에 담는다(affected 파일만 대상). 컴파일과 동시에 lint 하고 싶을 때.
- globalScss?: boolean — true 면 `scss/styles.scss` → `dist/styles.css` 글로벌 SCSS 를 컴파일하고 에러를 `result.scssErrors` 에 더한다.

## ISdTsCompilerEmitOptions (compileAsync 2번째 인자)

```typescript
interface ISdTsCompilerEmitOptions {
  sourceFilter?: (fileName: string) => boolean;
  additionalTransformers?: {
    before?: ts.TransformerFactory<ts.SourceFile>[];
    after?: ts.TransformerFactory<ts.SourceFile>[];
  };
}
```

- sourceFilter?: (fileName) => boolean — emit 결과 필터(Angular only). true 인 소스만 `emitResults` 에 남긴다. 특정 파일의 emit 만 필요할 때(예: HMR 단일 파일).
- additionalTransformers?.before / .after — Angular 기본 transformers 앞/뒤에 끼울 추가 TS transformer 배열(Angular only). 커스텀 코드 변환을 주입할 때.

## SdTsCompiler — 메서드

```typescript
class SdTsCompiler {
  constructor(options: ISdTsCompilerOptions);
  compileAsync(modifiedFiles?: ReadonlySet<string>, emitOptions?: ISdTsCompilerEmitOptions): Promise<ISdTsCompilerResult>;
  get sideEffectScssRegistry(): Map<string, SideEffectScssEntry>;
  compileSideEffectScss(): void;
  findAffectedByScss(scssPath: string): string[];
}
```

- compileAsync(modifiedFiles?, emitOptions?) — 1회 증분 컴파일 실행. `modifiedFiles` = 직전 변경된 파일 절대경로 집합(증분 무효화용, 미지정·빈 집합이면 캐시 그대로 사용; node_modules 포함 변경 시 packageJsonCache 클리어). `emitOptions` 는 위 emit 필터/transformer. 같은 인스턴스로 반복 호출해 증분 빌드를 이어간다.
- sideEffectScssRegistry (getter) — side-effect SCSS 등록부(`Map<소스, SideEffectScssEntry>`) 참조. emit 코드가 항목을 등록하는 통로.
- compileSideEffectScss() — 위 레지스트리의 모든 항목을 CSS 로 컴파일하고 에러/의존성을 내부 상태에 반영.
- findAffectedByScss(scssPath) — 주어진 SCSS 경로에 의존하는 소유자 파일 경로 배열을 반환(역방향 탐색). watch 에서 SCSS 변경 시 재컴파일 대상 산출에 쓴다.

사용 예:

```typescript
import { SdTsCompiler } from "@simplysm/sd-cli";

const compiler = new SdTsCompiler({
  pkgDir: "/repo/packages/core-common",
  cwd: "/repo",
  output: { js: true, dts: true },
});
const result = await compiler.compileAsync();
if (result.errorCount > 0) console.error(result.errors);
// watch 라운드: 변경 파일만 넘겨 증분 컴파일
const next = await compiler.compileAsync(new Set(["/repo/packages/core-common/src/foo.ts"]));
```

## ISdTsCompilerResult (compileAsync 반환)

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
  emitResults?: EmitResult[]; // EmitResult: { filename; contents; sourceFileName }
  lint?: LintWithProgramResult;
  scssErrors: string[];
  scssDependencies: ReadonlyMap<string, ReadonlySet<string>>;
}
```

- program: ts.Program — TS Program 참조. lint·외부 도구에 넘길 때.
- builderProgram — 증분 BuilderProgram 참조.
- isForAngular: boolean — Angular 모드로 컴파일됐는지(tsconfig 의 `angularCompilerOptions` 유무로 결정). 후속 처리 분기에 쓴다.
- affectedFiles: ReadonlySet<string> | undefined — 이번 빌드에서 영향받은 파일(posix 경로). `undefined` = 전역 변경(전체 리빌드). 부분 재처리 범위 판단에 쓴다.
- diagnostics: SerializedDiagnostic[] — 직렬화된 진단 전체(worker 경계 통과용). 내부 크래시 진단도 합산됨.
- errorCount / warningCount: number — Error / Warning 카테고리 진단 수. 크래시는 errorCount 에 가산.
- errors?: string[] — Error 진단을 `"파일:줄:열: TS코드: 메시지"` 형식으로 포맷한 배열(없으면 undefined). 로그 출력에 바로 쓴다.
- ngtscProgram?: NgtscProgram — NgtscProgram 참조(Angular only, HMR 용). non-Angular 이면 undefined.
- emitResults?: EmitResult[] — Angular emit 결과 배열. 각 항목 `{ filename; contents; sourceFileName }`(sourceFileName = 원본 소스 경로). non-Angular 은 writeFile 훅으로 디스크에 직접 쓰므로 undefined. 메모리상 컴파일 결과가 필요한 플러그인이 소비.
- lint?: LintWithProgramResult — lint 결과(`lint: true` 일 때만).
- scssErrors: string[] — SCSS 컴파일 에러 목록.
- scssDependencies: ReadonlyMap<string, ReadonlySet<string>> — SCSS 의존성 맵(소유자 파일 → 의존 SCSS 경로 집합). watch 역방향 탐색용.
