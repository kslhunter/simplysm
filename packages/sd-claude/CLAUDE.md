# CLAUDE.md — `@simplysm/sd-claude`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

심플리즘 표준 **Claude Code 셋업**을 npm 패키지로 배포. 이 모노레포의 `.claude/sd-*` 에셋(스킬·룰·훅 스크립트·`settings.json`·`simplysm.json`)을 `packages/sd-claude/claude/` 로 증분 복사한 뒤 게시한다. 빌드 타겟 `scripts`(빌드 산출 없음, npm 으로 그대로 배포).

소비 앱은 이 패키지를 설치하면 `postinstall` 이 자기 프로젝트의 `.claude/` 에 sd-\* 에셋을 풀어 놓는다.

## 구조

| 경로                       | 내용                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `scripts/sync.mjs`         | `.claude/` → `packages/sd-claude/claude/` **증분 복사**(`mtime+size` 비교 후 변경분만 unlink/copy). Windows EPERM 회피. |
| `scripts/sd-entries.mjs`   | sd-\* 후보 경로 수집(이름 prefix 기반).                                                                    |
| `scripts/postinstall.mjs`  | 소비 앱 `node_modules/@simplysm/sd-claude` 설치 후 호스트 `.claude/` 로 복사.                              |
| `scripts/cli.mjs`          | `sd-claude` bin — 수동 sync/auth 진입.                                                                     |
| `scripts/auth.mjs`         | (Claude Code 인증 보조 — 호스트 가이드).                                                                   |
| `claude/`                  | **퍼블리시 내용물**(.gitignore 영역, 직접 편집 금지). `.claude/` 변경 후 `sync.mjs` 가 갱신.               |
| `package.json`             | `bin: { sd-claude }`, `files: [scripts, claude]`, `prepack: sync.mjs`.                                     |

## 작업 시 주의

- **`packages/sd-claude/claude/` 직접 편집 금지.** 원본은 모노레포 루트 `.claude/sd-*` 와 `.claude/{settings,simplysm}.json`. 항상 거기서 수정 → `sync.mjs` 가 반영.
- `sd.config.ts` 의 `sd-claude` watch 훅(`.claude/**/sd-*` 변경 시 `sync.mjs` 재실행)이 켜져 있으므로 `pnpm watch` 중에는 수동 sync 불필요.
- 통삭제(`rmSync(recursive)`) 패턴 도입 금지 — 소비 앱의 chokidar 핸들 EPERM 유발. 현 증분 전략 유지.
- 배포 산출물에 `.claude/evals/` 는 제외(`sync.mjs` 에서 필터링). 새 제외 항목 추가 시 같은 위치에.
- 이 패키지는 npm 산출 빌드가 없다(target `scripts`). 변경 후 `pnpm sd-cli build -t sd-claude` 가 아니라 sync 만으로 배포 준비 완료.
