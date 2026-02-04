# 코드 리뷰: CLI watch/dev 리팩토링

## 개요

- **리뷰 대상**: `packages/cli` - watch 명령어 리팩토링 및 dev 명령어 분리
- **리뷰 범위**: Unstaged 변경 사항
  - `packages/cli/src/commands/watch.ts` (수정)
  - `packages/cli/src/commands/dev.ts` (신규)
  - `packages/cli/src/sd-cli.ts` (수정)
  - `packages/cli/src/utils/listr-manager.ts` (신규)
  - `packages/cli/src/utils/output-utils.ts` (신규)
  - `packages/cli/src/utils/package-utils.ts` (신규)
  - `packages/cli/src/utils/worker-events.ts` (신규)
  - `packages/cli/tests/run-watch.spec.ts` (수정)
- **제외 사항**: `.claude/skills/` 변경 사항 (스킬 파일)

## 변경 요약

`watch` 명령어를 **library 패키지 전용** (node/browser/neutral 타겟)으로 리팩토링하고, **client/server 패키지를 위한 `dev` 명령어**를 새로 분리했습니다. 공통 유틸리티 함수들을 별도 파일로 추출하여 코드 중복을 제거했습니다.

## 발견 사항

### Minor

#### 1. `index.ts`에 `runDev` export 누락
- **위치**: `packages/cli/src/index.ts`
- **설명**: 새로 추가된 `runDev` 함수가 export되지 않아 API로 직접 호출할 수 없음
- **수정 방향**: `runDev`와 `DevOptions`를 export에 추가

#### 2. `README.md` 문서 업데이트 필요
- **위치**: `packages/cli/README.md`
- **설명**: `dev` 명령어 문서화 누락, `watch` 명령어 설명이 변경된 동작과 불일치
- **수정 방향**: `dev` 명령어 섹션 추가 및 `watch` 설명을 library 패키지 전용으로 수정

### Suggestion

#### 3. `RebuildListrManager` 이벤트 타입 안전성 개선
- **위치**: `packages/cli/src/utils/listr-manager.ts:13`
- **설명**: `EventEmitter`를 확장하지만 이벤트 타입이 명시되어 있지 않음
- **수정 방향**: 이벤트 타입을 제네릭으로 명시
  ```typescript
  interface RebuildListrManagerEvents {
    batchComplete: [];
  }
  export class RebuildListrManager extends EventEmitter<RebuildListrManagerEvents> {
  ```

#### 4. `RebuildListrManager`의 Listr concurrent 옵션 누락
- **위치**: `packages/cli/src/utils/listr-manager.ts:65`
- **설명**: 리빌드 시 Listr 생성에 `{ concurrent: true }` 옵션이 누락됨
- **수정 방향**: 초기 빌드와 동일하게 병렬 실행 옵션 추가
  ```typescript
  const listr = new Listr(tasks, { concurrent: true });
  ```

## 전체 평가

코드 품질이 양호합니다. 공통 유틸리티 추출로 코드 중복이 제거되었고, `watch`와 `dev` 명령어의 책임이 명확히 분리되었습니다. 위의 4가지 Minor/Suggestion 사항을 반영하면 더욱 완성도 높은 코드가 됩니다.
