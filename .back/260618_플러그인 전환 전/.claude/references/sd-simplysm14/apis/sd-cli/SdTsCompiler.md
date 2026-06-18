# @simplysm/sd-cli — SdTsCompiler

패키지 디렉토리 1개의 `.ts` 를 TypeScript 또는 Angular AOT 로 **증분** 컴파일하는 클래스. 한 번의 `compileAsync` 호출이 직렬화된 진단 + emit 결과 + lint + SCSS 결과를 한 묶음(`ISdTsCompilerResult`)으로 반환한다. tsconfig 의 `angularCompilerOptions` 존재 여부로 Angular/일반 모드를 자동 판별한다. 진단은 worker 경계를 통과하도록 `SerializedDiagnostic` 으로 직렬화되며, 내부 크래시는 단계별로 잡아 진단으로 보고(부분 복구)한다.

## 생성자 / ISdTsCompilerOptions

```typescript
class SdTsCompiler {
  constructor(options: ISdTsCompilerOptions);
}

interface ISdTsCompilerOptions {
  pkgDir: string;
  cwd: string;
  output: { js: boolean; dts: boolean };
  includeTests?: boolean;
  env?: TypecheckEnv; // "node" | "browser"

  // Angular 전용 (isForAngular 시 활성)
  sourceFileCache?: AngularSourceFileCache;
  transformStylesheet?: (data: string, containingFile: string, stylesheetFile?: string) => Promise<string | null>;
  externalStylesheets?: Map<string, string>;
  compilerOptionsTransformer?: (options: ts.CompilerOptions) => ts.CompilerOptions;

  // SCSS / lint 통합
  lint?: boolean;
  globalScss?: boolean;
}
```

- **pkgDir**: string — 컴파일 대상 패키지 디렉토리. 출력은 이 아래 `dist/`, 캐시는 `.cache/*.tsbuildinfo` 에 떨어진다.
- **cwd**: string — workspace 루트. 진단 필터링(`isWorkspaceDiagnostic`)·경로 상대화에 사용.
- **output**: `{ js: boolean; dts: boolean }` — 출력 제어. `js+dts` → JS+선언파일, `js` 만 → JS 만(`declaration:false`), `dts` 만 → 선언파일만(`emitDeclarationOnly:true`), 둘 다 false → `noEmit:true`(타입체크 전용). tsBuildInfo 파일명도 이에 따라 달라짐.
- **includeTests**: boolean — `true` 면 `tests/` 파일을 rootNames 에 포함(`getPackageFiles`), 기본/`false` 면 소스만(`getPackageSourceFiles`).
- **env**: `TypecheckEnv`(`"node" | "browser"`) — 지정 시 `getCompilerOptionsForEnv()` 로 env 별 lib 등을 조정. tsBuildInfo 파일명에 `-<env>` 접미사가 붙는다.
- **sourceFileCache**: `AngularSourceFileCache` — Angular 증분 빌드용 SourceFile 캐시. 미제공 시 내부 생성. 여러 `compileAsync` 간 SourceFile 을 재사용.
- **transformStylesheet**: `(data, containingFile, stylesheetFile?) => Promise<string|null>` — 스타일시트 변환 콜백(Angular only). 컴포넌트 인라인/외부 스타일을 변환. 미제공 + Angular 면 내부 라이브러리용 콜백을 자동 생성. 반환 `null` 이면 변환 없음.
- **externalStylesheets**: `Map<string, string>` — 외부 스타일시트 맵(클라이언트 빌드용). 해석된 스타일 경로를 해시 ID 로 매핑해 `<id>.css` 가상 파일명으로 분리.
- **compilerOptionsTransformer**: `(options) => options` — 최종 `compilerOptions` 후처리. 클라이언트의 target/module 강제, `inlineSourceMap` 등 강제에 사용(`sdAngularPlugin` 이 이걸 씀).
- **lint**: boolean — `true` 면 `compileAsync` 가 ESLint 를 같은 Program 으로 실행하고 결과를 `result.lint` 에 담는다(중복 Program 생성 방지). 글로벌 SCSS 와 병렬 실행.
- **globalScss**: boolean — `true` 면 `scss/styles.scss` → 패키지 루트 `styles.css` 를 생성. 에러는 `result.scssErrors` 에 누적.

```typescript
import { SdTsCompiler } from "@simplysm/sd-cli";

const compiler = new SdTsCompiler({
  pkgDir: path.resolve(cwd, "packages/excel"),
  cwd,
  output: { js: true, dts: true },
});
const result = await compiler.compileAsync();
```

## compileAsync

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

- **modifiedFiles**: `ReadonlySet<string>` — 직전 호출 이후 변경된 파일 집합. 지정 시 SourceFile 캐시를 무효화하고, `node_modules` 경로가 포함되면 package.json 해석 캐시도 클리어. 미지정 시 전체 기준으로 진행. watch 재빌드에서 증분 컴파일에 쓴다.
- **emitOptions.sourceFilter**: `(fileName) => boolean` — Angular only. emit 결과 중 이 필터를 통과한 소스만 `emitResults` 에 남긴다.
- **emitOptions.additionalTransformers**: Angular only. Angular transformer 뒤에 `before`/`after` 커스텀 transformer 를 덧붙인다.

여러 단계(analyze/affected 탐색/emit/진단 수집/lint+globalScss)를 각각 try-catch 로 감싸 한 단계가 크래시해도 나머지를 진행하고, 크래시는 `ISdTsCompilerResult.diagnostics` 에 에러 진단으로 합산된다.

```typescript
// watch 재빌드: 변경 파일만 넘겨 증분 컴파일
const result = await compiler.compileAsync(new Set(["packages/excel/src/a.ts"]));
```

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
  emitResults?: EmitResult[];        // { filename, contents, sourceFileName }
  lint?: LintWithProgramResult;      // { success, errorCount, warningCount, formattedOutput }
  scssErrors: string[];
  scssDependencies: ReadonlyMap<string, ReadonlySet<string>>;
}
```

- **program / builderProgram**: TypeScript Program 과 Builder Program 참조(lint·외부 도구·증분 빌드용).
- **isForAngular**: boolean — tsconfig 에 `angularCompilerOptions` 가 있어 Angular AOT 모드로 컴파일됐는지.
- **affectedFiles**: `ReadonlySet<string> | undefined` — 이번 빌드에서 영향받은 파일(posix 경로). `undefined` 면 전역 변경(전체 리빌드).
- **diagnostics**: `SerializedDiagnostic[]` — 직렬화된 진단(worker 경계 통과용). workspace 외부 진단은 필터링됨.
- **errorCount / warningCount**: Error/Warning 카테고리 진단 수(크래시 진단 포함).
- **errors**: string[] — Error 진단을 `"파일:줄:열: TS코드: 메시지"` 형식으로 포맷한 배열. 에러 없으면 `undefined`.
- **ngtscProgram**: `NgtscProgram` — Angular only(HMR 용). Non-Angular 이면 `undefined`.
- **emitResults**: `EmitResult[]` — Angular emit 결과(`{ filename, contents, sourceFileName }`). **Non-Angular 이면 `undefined`** — Non-Angular 은 writeFile 훅으로 디스크에 직접 쓰기 때문(메모리 반환 아님).
- **lint**: `LintWithProgramResult` — `lint:true` 일 때만. `{ success, errorCount, warningCount, formattedOutput }`.
- **scssErrors**: string[] — SCSS 컴파일 에러 목록(글로벌/side-effect/스타일시트 변환 누적).
- **scssDependencies**: `ReadonlyMap<string, ReadonlySet<string>>` — 소유자 파일 → 의존 SCSS 경로 집합. watch 에서 SCSS 변경의 역방향 탐색에 사용.

## 보조 메서드

`SdTsCompiler` 는 SCSS 처리용 보조 멤버도 노출한다(주로 빌드 엔진 내부 배선용):

- **get sideEffectScssRegistry**: `Map<string, SideEffectScssEntry>` — side-effect SCSS 레지스트리 참조. emit 코드에서 항목 등록용.
- **compileSideEffectScss()**: 레지스트리의 모든 항목을 CSS 로 컴파일. 에러는 `scssErrors` 에 누적.
- **findAffectedByScss(scssPath)**: `string[]` — 주어진 SCSS 경로에 의존하는 파일 목록 반환(watch 역방향 탐색).
