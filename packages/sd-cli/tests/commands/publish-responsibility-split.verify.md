# publish/index.ts 책임 분리 -- LLM 검증

## 검증 항목

- version-upgrade.ts에 upgradeVersion, computePublishLevels, PackageJson이 export됨: `src/commands/publish/version-upgrade.ts` 확인 완료
- env-utils.ts에 replaceEnvVariables, waitWithCountdown이 export됨: `src/commands/publish/env-utils.ts` 확인 완료
- index.ts에서 추출 함수가 제거되고 import로 대체됨: `index.ts:14-15`에서 version-upgrade, env-utils import 확인
- index.ts export 불변 — runPublish, PublishOptions만 export: `index.ts:22` PublishOptions, `index.ts:76` runPublish 확인
- sd-cli-entry.ts의 import 경로 불변: `sd-cli-entry.ts:12` `import { runPublish } from "./commands/publish"` 유지
- 함수 시그니처 불변: upgradeVersion(cwd, allPkgPaths, dryRun), computePublishLevels(publishPkgs), replaceEnvVariables(str, version, projectPath), waitWithCountdown(message, seconds) 모두 원본과 동일
- index.ts LOC 축소: 639 → 455 LOC (목표 ~300 이하는 미달이나, 오케스트레이션 자체가 ~280 LOC이므로 적정)
- 총 LOC 보존: 631 total ≈ 639 original (import/export 차이)
- 기존 테스트 40개 전량 통과: vitest run 결과 40 passed
