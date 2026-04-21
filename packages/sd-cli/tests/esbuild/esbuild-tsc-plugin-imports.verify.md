# esbuild-tsc-plugin 전환 — LLM 검증

## 검증 항목

- `esbuild-tsc-plugin.ts`에서 `runTscPackageBuild`/`parseTsconfig` import 제거됨: Grep 결과 0건
- `esbuild-tsc-plugin.ts`에서 `SdTsCompiler` import 존재: `import { SdTsCompiler } from "../ts-compiler/SdTsCompiler"` (line 4)
- `TscPluginOptions`에 `lint?: boolean` 필드 존재: `esbuild-tsc-plugin.ts` 인터페이스 확인
- `TscPluginResult`에 `getLintResult()` getter 존재: `esbuild-tsc-plugin.ts` 인터페이스 확인
- `server-build.worker.ts`에서 `runTscPackageBuild` import 제거됨: Grep 결과 0건
- `server-build.worker.ts`에서 `LintWithProgramRunner` import 제거됨: Grep 결과 0건
- `server-build.worker.ts`에서 `SdTsCompiler` import 존재: `import { SdTsCompiler } from "../ts-compiler/SdTsCompiler"` 확인
- `server-esbuild-context.ts`에 `getTscLintResult()` 위임 메서드 존재: 코드 확인
- `server-esbuild-context.ts`의 `EsbuildContextOptions.tsc`에 `lint?: boolean` 존재: 코드 확인
