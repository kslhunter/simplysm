# @simplysm/sd-codex Scripts

## postinstall

`packages/sd-codex/scripts/postinstall.mjs`는 패키지 설치 후 실행된다.

동작 순서:

1. `INIT_CWD`, `node_modules` 경로, 현재 작업 디렉터리 순으로 소비 프로젝트 루트를 찾는다.
2. 소비 프로젝트가 same major `simplysm` 모노레포이면 설치를 건너뛴다.
3. 패키지의 `codex/` 스냅샷에서 `sd-*` 항목을 수집한다.
4. 소비 프로젝트 `.codex/`의 기존 관리 대상 `sd-*` 항목을 제거한다.
5. 스냅샷의 `sd-*` 항목을 소비 프로젝트 `.codex/`로 복사한다.

설치 오류는 경고로만 출력하며, 패키지 설치를 실패시키지 않는다.

## prepack / sync

`packages/sd-codex/scripts/sync.mjs`는 배포 전 실행된다.

동작 순서:

1. 루트 `.codex/`를 소스 디렉터리로 잡는다.
2. `packages/sd-codex/codex/` 기존 스냅샷을 제거한다.
3. 루트와 1단계 하위 디렉터리의 `sd-*` 항목을 수집한다.
4. `SKILL.eval.md`, `eval_*`, `*.eval.*` 파일을 제외하고 스냅샷으로 복사한다.

## sd-entries

`packages/sd-codex/scripts/sd-entries.mjs`는 다음 함수를 제공한다.

| 함수 | 설명 |
|------|------|
| `forEachCodexEntry(dir, callback)` | 기준 디렉터리의 루트 및 1단계 하위 `sd-*` 항목을 순회 |
| `collectCodexEntries(dir)` | `sd-*` 항목 상대 경로 배열 반환 |
| `shouldCopyCodexAsset(source)` | 배포 스냅샷에 복사할 파일인지 판정 |
