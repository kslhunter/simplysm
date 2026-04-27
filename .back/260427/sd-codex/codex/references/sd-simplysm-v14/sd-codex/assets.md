# @simplysm/sd-codex Assets

## 소스 오브 트루스

루트 `.codex/`가 소스 오브 트루스다.

```text
.codex/
├─ references/
├─ rules/
└─ skills/
```

`packages/sd-codex/codex/`는 배포용 스냅샷이며, `prepack`에서 `scripts/sync.mjs`로
갱신한다.

## 포함 규칙

`scripts/sd-entries.mjs`는 기준 디렉터리의 루트 항목과 1단계 하위 디렉터리 항목 중
이름이 `sd-`로 시작하는 항목만 수집한다.

포함 예:

- `references/sd-frontend-design.md`
- `references/sd-simplysm-v14`
- `rules/sd-codex-rules.md`
- `skills/sd-check`

제외 예:

- `AGENTS.md`
- `skills/demo-review`
- `SKILL.eval.md`
- `eval_*`
- `*.eval.*`

## 설치 대상

패키지 설치 시 배포 스냅샷의 관리 대상 항목만 소비 프로젝트 `.codex/`로 복사한다.
기존 소비 프로젝트의 `sd-*` 항목은 갱신될 수 있지만, `sd-` 접두어가 없는 로컬 항목은
관리 대상이 아니다.
