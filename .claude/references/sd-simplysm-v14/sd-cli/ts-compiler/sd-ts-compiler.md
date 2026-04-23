# SdTsCompiler

TypeScript AOT 컴파일러. Angular 패키지(`angularCompilerOptions`가 `tsconfig.json`에 있는 경우)와 일반 TypeScript 패키지를 모두 지원한다. 증분 빌드, lint 통합, SCSS 컴파일을 관리한다.

## When to use

- ✅ Angular/TS 패키지를 프로그래매틱하게 컴파일해야 할 때 (커스텀 빌드 파이프라인, Vite 플러그인 내부 등)
- ✅ 증분 빌드가 필요한 watch 모드 구현 시
- ❌ CLI 명령어로 빌드할 때 — `pnpm build`/`pnpm watch` 사용. `SdTsCompiler`는 sd-cli 내부 엔진과 [`sdAngularPlugin`](../angular-vite-plugin/sd-angular-plugin.md)에서 사용하는 저수준 API

```typescript
export class SdTsCompiler {
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

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `compileAsync` | method | `(modifiedFiles?, emitOptions?) => Promise<ISdTsCompilerResult>` | TypeScript 컴파일 실행. `modifiedFiles` 지정 시 증분 빌드 수행 |
| `compileSideEffectScss` | method | `() => void` | `sideEffectScssRegistry`의 모든 항목을 CSS로 컴파일 |
| `findAffectedByScss` | method | `(scssPath: string) => string[]` | SCSS 경로에 의존하는 TypeScript 파일 목록 반환. watch 역방향 추적용 |
| `sideEffectScssRegistry` | getter | `Map<string, SideEffectScssEntry>` | Angular 컴포넌트 `@Component.styles` 항목 저장소 |

## Related Types

### `ISdTsCompilerOptions`

`SdTsCompiler` 생성 옵션.

```typescript
export interface ISdTsCompilerOptions {
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
```

| Field | Type | Description |
|-------|------|-------------|
| `pkgDir` | `string` | 패키지 디렉토리 (절대 경로) |
| `cwd` | `string` | workspace 루트. diagnostics 필터링 등에 사용 |
| `output` | `{ js: boolean; dts: boolean }` | emit 제어 플래그. `js`: JavaScript emit, `dts`: 타입 선언 emit |
| `includeTests` | `boolean?` | `tests/` 파일을 rootNames에 포함할지 여부. 기본값 `false` |
| `env` | `TypecheckEnv?` | 타입체크 환경. 설정 시 `getCompilerOptionsForEnv()` 적용 |
| `sourceFileCache` | `AngularSourceFileCache?` | Angular 증분 빌드용 SourceFile 캐시. 미제공 시 내부 생성 |
| `transformStylesheet` | `(data, containingFile, stylesheetFile?) => Promise<string \| null>?` | 스타일시트 변환 콜백. Angular 패키지 전용 |
| `externalStylesheets` | `Map<string, string>?` | 외부 스타일시트 맵. 클라이언트 빌드용, `resourceNameToFileName`에서 사용 |
| `compilerOptionsTransformer` | `(options: ts.CompilerOptions) => ts.CompilerOptions?` | `compilerOptions` 후처리. 클라이언트의 `target`/`module` 강제 등에 사용 |
| `lint` | `boolean?` | lint 실행 여부. `true`이면 `compileAsync` 결과에 lint 결과 포함 |
| `globalScss` | `boolean?` | 글로벌 SCSS 컴파일 여부. `true`이면 `scss/styles.scss` → `dist/styles.css` 생성 |

### `ISdTsCompilerResult`

`compileAsync()` 반환 타입.

```typescript
export interface ISdTsCompilerResult {
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

| Field | Type | Description |
|-------|------|-------------|
| `program` | `ts.Program` | TypeScript Program 참조. lint, 외부 도구용 |
| `builderProgram` | `ts.EmitAndSemanticDiagnosticsBuilderProgram` | Builder Program 참조. 증분 빌드 상태 보유 |
| `isForAngular` | `boolean` | Angular 패키지 여부. `tsconfig.json`에 `angularCompilerOptions` 존재 시 `true` |
| `affectedFiles` | `ReadonlySet<string> \| undefined` | 이 빌드에서 영향받은 파일 (posix 경로). `undefined` = 전역 변경 (전체 리빌드) |
| `diagnostics` | `SerializedDiagnostic[]` | 직렬화된 진단 정보. Worker 경계 통과용 |
| `errorCount` | `number` | Error 카테고리 진단 수 |
| `warningCount` | `number` | Warning 카테고리 진단 수 |
| `errors` | `string[]?` | Error 카테고리 진단을 `"파일:줄:열: TS코드: 메시지"` 형식으로 포맷한 배열. 에러 없으면 `undefined` |
| `ngtscProgram` | `NgtscProgram?` | NgtscProgram 참조. Angular 패키지 전용, HMR용. Non-Angular이면 `undefined` |
| `emitResults` | `EmitResult[]?` | Angular emit 결과. Non-Angular이면 `undefined` (writeFile 훅으로 디스크 직접 쓰기) |
| `lint` | `LintWithProgramResult?` | lint 결과. `lint` 옵션 활성 시 반환 |
| `scssErrors` | `string[]` | SCSS 컴파일 에러 목록 |
| `scssDependencies` | `ReadonlyMap<string, ReadonlySet<string>>` | SCSS 의존성 맵. key: 소유자 파일, value: 의존 SCSS 경로 집합. watch 역방향 탐색용 |

## Usage

### 초기 컴파일

```typescript
import { SdTsCompiler } from "@simplysm/sd-cli";

const compiler = new SdTsCompiler({
  pkgDir: "/workspace/packages/my-lib",
  cwd: "/workspace",
  output: { js: true, dts: true },
  lint: true,
  globalScss: true,
});

const result = await compiler.compileAsync();

if (result.errors) {
  console.error("Compilation errors:", result.errors);
  process.exit(1);
}
```

### watch 모드에서 증분 컴파일

```typescript
import { SdTsCompiler } from "@simplysm/sd-cli";

const compiler = new SdTsCompiler({
  pkgDir: "/workspace/packages/my-lib",
  cwd: "/workspace",
  output: { js: true, dts: true },
});

// 초기 컴파일
let result = await compiler.compileAsync();

// 파일 변경 감지 시 증분 컴파일
const changedFiles = new Set(["/workspace/packages/my-lib/src/foo.ts"]);
result = await compiler.compileAsync(changedFiles);

// SCSS 의존성이 변경된 TS 파일 찾기
const affectedByScss = compiler.findAffectedByScss("/workspace/packages/my-lib/scss/variables.scss");
```
