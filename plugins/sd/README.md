# sd

심플리즘 sd-* 스킬·훅·레퍼런스를 묶은 Claude Code 플러그인.

## 요구사항

- **Python 3** (PATH 에 `python`). 모든 hook 이 Python 으로 동작 — 없으면 hook 이 전부 실패함.

## 설치

로컬(개발/단일 사용자):

```
/plugin marketplace add <이 저장소 경로 또는 owner/repo>
/plugin install sd@simplysm
```

개발 중 즉시 반영(소스 직접 로드):

```
claude --plugin-dir ./plugins/sd
```

(소스 편집 후 `/reload-plugins` 로 갱신. `--plugin-dir` 와 marketplace 설치를 동시에 켜지 말 것 — 중복 로드.)

## 구성

| 컴포넌트 | 내용 |
| --- | --- |
| skills | `sd-review`·`sd-debug`·`sd-spec`·`sd-spec-si`·`sd-dev`·`sd-impl`·`sd-demo`·`sd-docs`·`sd-manual`·`sd-use`·`sd-unpack`·`sd-proposal`·`sd-estimate` (호출명 `/sd:<name>`) |
| hooks | PreToolUse(편집·셸 가드), PostToolUse(read-hash 기록), SessionStart(행동/설계 규칙·활성 references·statusline 셋업) |
| references | `@simplysm/*` 버전별 API·매뉴얼(`references/simplysm<major>/`) + 버전 무관 공통 |

SessionStart 가 프로젝트의 `@simplysm/sd-cli` major 를 읽어 활성 references 버전을 컨텍스트에 주입함.

## 데이터 위치

- statusline 복제본 → `~/.claude/sd/` (hook·Bash 양쪽이 동일 경로로 접근하도록 고정).
- 캐시(read-hash·unpack) → 시스템 임시폴더(세션 휘발물).

원격 지식 위키는 별도 플러그인 `sd-wiki` 로 분리됨(목차 주입·CLI·작성 규칙·인증 토큰).

## 수동 설정 (플러그인이 직접 못 넣는 것)

플러그인은 사용자/프로젝트 `settings.json` 을 직접 수정하지 못함. 아래는 필요 시 각자 설정:

- **statusLine**: SessionStart hook 이 `~/.claude/settings.json` 에 자동 주입(해당 키가 **없을 때만**). 끄려면 그 키를 직접 제거.
- **defaultShell**: 환경 선호라 플러그인이 안 넣음. 필요하면 `settings.json` 에 `"defaultShell": "powershell"` 등 직접.

## 팀 공유

프로젝트 `.claude/settings.json` 에 marketplace 와 활성화를 함께 커밋(git source 권장 — 로컬 경로는 다른 머신에서 안 맞음):

```json
{
  "extraKnownMarketplaces": {
    "simplysm": { "source": { "source": "github", "repo": "kslhunter/simplysm" } }
  },
  "enabledPlugins": { "sd@simplysm": true }
}
```

팀원이 저장소 폴더를 신뢰하면 Claude Code 가 설치를 제안함.
