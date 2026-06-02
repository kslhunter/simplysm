# @simplysm/sd-cli — SdTsCompiler

패키지 디렉토리의 `.ts` 를 TS 또는 Angular AOT 로 **증분** 컴파일하는 클래스. 한 번의 `compileAsync` 호출로 직렬화된 진단 + emit 결과 + lint + SCSS 결과를 묶어 반환. tsconfig 의 `angularCompilerOptions` 존재 여부로 Angular/일반 모드를 자동 판별. 빌드 엔진·`sdAngularPlugin` 내부에서 사용. 진단은 worker 경계를 통과하도록 `SerializedDiagnostic` 으로 직렬화됨.

## SdTsCompiler

```typescript
class SdTsCompiler {
  constructor(options: ISdTsCompilerOptions);
  compileAsync(modifiedFiles?: ReadonlySet<string>, emitOptions?: ISdTsCompilerEmitOptions): Promise<ISdTsCompilerResult>;
  compileSideEffectScss(): void;
  findAffectedByScss(scssPath: string): string[];
  get sideEffectScssRegistry(): Map<string, SideEffectScssEntry>;
}
```

- compileAsync(modifiedFiles?, emitOptions?) — 1회 증분 컴파일. `modifiedFiles` = 직전 변경 파일 절대경로 집합(전달 시 sourceFileCache·packageJsonCache 무효화, 미전달 시 전체). `emitOptions` = emit 세부 제어. 위험 구간을 단계별 try/catch 로 감싸 부분 복구하며, 잡힌 크래시는 결과의 `diagnostics`/`errors` 에 합산됨(silent skip 아님).
- compileSideEffectScss() — `sideEffectScssRegistry` 에 등록된 side-effect SCSS 항목을 모두 CSS 로 컴파일. emit 코드가 항목을 레지스트리에 채운 뒤 호출.
- findAffectedByScss(scssPath) — 주어진 SCSS 경로에 의존하는 소스 파일 목록 반환(역방향 탐색). watch 에서 SCSS 변경 시 재컴파일 대상을 찾을 때.
- sideEffectScssRegistry — side-effect SCSS 항목 맵(소스경로 → 엔트리). emit 코드가 항목을 등록하는 통로.

`compileAsync` 동작 요약: tsconfig 파싱 → `includeTests` 에 따라 rootNames 결정 → `output` 플래그로 compilerOptions 구성(`compilerOptionsTransformer` 마지막 적용) → Angular 면 `NgtscProgram.analyzeAsync`, 아니면 `EmitAndSemanticDiagnosticsBuilderProgram` → affected 파일 추적 → emit → 진단 수집·직렬화·필터(workspace 내부만) → `globalScss`/`lint` 병렬 실행. 비-Angular emit 은 writeFile 훅으로 디스크에 직접 쓰고(`emitResults` undefined), Angular emit 은 `emitResults` 로 메모리 반환.

```typescript
import { SdTsCompiler } from "@simplysm/sd-cli";
const compiler = new SdTsCompiler({ pkgDir, cwd, output: { js: true, dts: true }, lint: true });
const result = await compiler.compileAsync();
if (result.errorCount > 0) console.error(result.errors);
```

## ISdTsCompilerOptions

생성자 옵션.

- pkgDir: string — 컴파일 대상 패키지 디렉토리 절대경로. rootNames·outDir·SCSS loadPath 기준.
- cwd: string — workspace 루트. diagnostics 필터링(워크스페이스 내부 진단만 남김)·상대경로 로깅 기준.
- output: { js: boolean; dts: boolean } — 출력 제어. `js` = `.js` emit 여부, `dts` = `.d.ts` emit 여부. 둘 다 false 면 noEmit(타입체크만). 조합에 따라 declaration/sourceMap/tsBuildInfoFile 이름이 달라짐.
- includeTests?: boolean — `tests/` 파일을 rootNames 에 포함할지. 기본 false. 테스트 AOT 컴파일(Vitest)에서 true.
- env?: "node" | "browser" — 타입체크 환경. 설정 시 환경별 compilerOptions 조정(`getCompilerOptionsForEnv`) 적용. 동일 패키지를 환경별로 분리 검증할 때.
- sourceFileCache?: AngularSourceFileCache — Angular 증분 빌드용 SourceFile 캐시. 미제공 시 내부 생성. 인스턴스 간 캐시 공유로 증분 속도 확보.
- transformStylesheet?: (data, containingFile, stylesheetFile?) => Promise<string | null> — 스타일시트 변환 콜백(Angular 전용). 인라인/외부 스타일을 가공해 반환, `null` 이면 미변환. 미제공 + Angular 면 라이브러리용 SCSS 변환 콜백이 자동 생성됨.
- externalStylesheets?: Map<string, string> — 외부 스타일시트 맵(클라이언트 빌드용). `resourceNameToFileName` 에서 비-템플릿 리소스를 해시 기반 `.css` 외부 ID 로 치환할 때 채워짐.
- compilerOptionsTransformer?: (options) => ts.CompilerOptions — compilerOptions 최종 후처리. 내부 구성 이후 마지막에 적용되어 target/module/rootDir 등을 강제 가능. 클라이언트·Vitest 빌드에서 사용.
- lint?: boolean — true 면 `compileAsync` 가 lint 를 함께 실행하고 결과를 `result.lint` 에 포함. lint runner 는 lazy init 후 인스턴스 재사용.
- globalScss?: boolean — true 면 `scss/styles.scss` → `dist/styles.css` 글로벌 SCSS 컴파일 수행. 글로벌 스타일 산출이 필요한 패키지에서.

## ISdTsCompilerEmitOptions

`compileAsync` 의 두 번째 인자(emit 세부 제어, Angular 전용).

- sourceFilter?: (fileName: string) => boolean — emit 대상 소스 필터. 지정 시 통과한 소스의 EmitResult 만 결과에 포함. 일부 파일만 재emit 할 때.
- additionalTransformers?: { before?; after? } — Angular transformers 외 추가 TS transformer factory. `before`/`after` 각각 `ts.TransformerFactory<ts.SourceFile>[]`. 컴파일 파이프라인에 사용자 변환을 끼울 때.

## ISdTsCompilerResult

`compileAsync` 반환값.

- program: ts.Program — TypeScript Program 참조. lint·외부 도구용.
- builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram — Builder Program 참조. 다음 증분 호출에 재사용됨.
- isForAngular: boolean — Angular 패키지 여부(tsconfig `angularCompilerOptions` 존재로 판별).
- affectedFiles: ReadonlySet<string> | undefined — 이번 빌드에서 영향받은 파일(posix 경로). `undefined` = 전역 변경(전체 리빌드).
- diagnostics: SerializedDiagnostic[] — 직렬화된 진단 정보(worker 경계 통과용). 워크스페이스 내부 진단만 남기고 필터됨.
- errorCount: number — Error 카테고리 진단 수(단계별 크래시 진단 합산).
- warningCount: number — Warning 카테고리 진단 수.
- errors?: string[] — Error 진단을 "파일:줄:열: TS코드: 메시지" 형식으로 포맷한 배열. 없으면 undefined.
- ngtscProgram?: NgtscProgram — NgtscProgram 참조(Angular 전용, HMR 용). 비-Angular 이면 undefined.
- emitResults?: EmitResult[] — Angular emit 결과 배열(`{ filename, contents, sourceFileName }`). 비-Angular 면 undefined(writeFile 훅이 디스크에 직접 씀).
- lint?: LintWithProgramResult — lint 결과. `lint` 옵션 활성 시에만 존재.
- scssErrors: string[] — SCSS 컴파일 에러 목록.
- scssDependencies: ReadonlyMap<string, ReadonlySet<string>> — SCSS 의존성 맵(소유자 파일 → 의존 SCSS 경로 집합). watch 역방향 탐색용.
