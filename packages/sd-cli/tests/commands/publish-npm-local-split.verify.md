# npm-publisher + local-publisher 분리 -- LLM 검증

## 검증 항목

- [x] npm 배포 로직(publishNpm)이 npm-publisher.ts에 위치: `src/commands/publish/npm-publisher.ts:9`
- [x] 로컬 복사 로직(publishToLocal)이 local-publisher.ts에 위치: `src/commands/publish/local-publisher.ts:9`
- [x] index.ts의 publishPackage가 각 publisher 호출로 교체됨: `src/commands/publish/index.ts:163-171` — type별 분기가 publishNpm, publishToLocal, publishToStorage 호출
- [x] export 경로 불변: `import { runPublish } from "./commands/publish"` — sd-cli-entry.ts에서 동일 경로로 resolve됨 (commands/publish/index.ts)
- [x] 버전 업그레이드, Git, 빌드 로직은 index.ts에 유지: upgradeVersion(:99), Git commit/tag/push(:487-499), runBuild 호출(:459)
