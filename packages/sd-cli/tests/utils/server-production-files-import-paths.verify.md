# server-build.worker 비즈니스 로직 분리 — LLM 검증

## 검증 항목

- 4개 함수가 utils/server-production-files.ts에 export되어 있다: line 14, 27, 68, 87에 각각 export function 확인
- worker에서 4개 함수 정의가 제거되었다: worker에 함수 정의 없음, import와 호출만 존재
- worker에서 collectAllExternals, generateProductionFiles를 새 모듈에서 import한다: line 19 `import { collectAllExternals, generateProductionFiles } from "../utils/server-production-files"`
- collectAllExternals 시그니처: `(pkgDir: string, manualExternals?: string[]) => string[]` — line 14 확인
- parseLockfileVersions 시그니처: `(cwd: string) => Map<string, string>` — line 27 확인
- resolveLockedVersions 시그니처: `(cwd: string, pkgNames: string[]) => Record<string, string>` — line 68 확인
- generateProductionFiles 시그니처: `(info: ServerBuildInfo, externals: string[]) => void` — line 87 확인
- worker에 build, rebuildAll, startWatch, stopWatch, cleanup, createEsbuildWatchContext가 존재한다: line 116, 148, 259, 336, 359, 488 확인
- worker에서 cpx import가 제거되었다: grep 결과 매칭 없음
- worker에서 collectAllDependencyExternals import가 제거되었다: grep 결과 매칭 없음
