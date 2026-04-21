# storage-publisher 분리 + 디렉토리 구조 변환 -- LLM 검증

## 검증 항목

- SSH 인증 로직(ensureSshAuth, testSshKeyAuth, registerSshPublicKey)이 storage-publisher.ts에 위치: `src/commands/publish/storage-publisher.ts:55` (ensureSshAuth), `:128` (testSshKeyAuth), `:157` (registerSshPublicKey)
- 스토리지 배포 로직(publishToStorage)이 storage-publisher.ts에 위치: `src/commands/publish/storage-publisher.ts:17`
- index.ts에서 ensureSshAuth와 publishToStorage를 import하여 사용: `src/commands/publish/index.ts:13`
- import 경로 "./commands/publish"가 디렉토리 구조 변환 후에도 동일하게 resolve: `publish/index.ts`가 Node.js 모듈 resolution에 의해 `commands/publish`로 resolve됨
