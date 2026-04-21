# lint.worker/lint-utils/check.ts import 경로 검증 -- LLM 검증

## 검증 항목

- lint.worker.ts가 `../utils/lint-core`에서 import: `import { executeLint, type LintOptions, type LintResult } from "../utils/lint-core";` (line 2) 확인
- lint-utils.ts가 `./lint-core`에서 import: `import type { LintOptions, LintResult } from "./lint-core";` (line 2) 확인
- check.ts가 `../utils/lint-core`에서 import: `import { executeLint, type LintResult } from "../utils/lint-core";` (line 4) 확인
- commands/lint.ts�� `../commands/lint` import가 없음: `import { executeLint, type LintOptions } from "../utils/lint-core";` (line 1)만 존재
- lint-core.ts에 runLint가 없음: `executeLint`, `loadIgnorePatterns`, `LintOptions`, `LintResult`만 export
- commands/lint.ts에 runLint만 존재: 13줄의 thin wrapper
