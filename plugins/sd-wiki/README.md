# sd-wiki

심플리즘 팀 공용 원격 지식 위키를 Claude Code 세션에 연결하는 플러그인. 세션 시작 시 위키 ROOT MAP 을 컨텍스트에 주입하고, 조회·작성 CLI 와 작성 규칙을 제공한다.

## 요구사항

- **Python 3** (PATH 에 `python`). 모든 hook 이 Python 으로 동작 — 없으면 hook 이 전부 실패함.

## 설치

로컬(개발/단일 사용자):

```
/plugin marketplace add <이 저장소 경로 또는 owner/repo>
/plugin install sd-wiki@simplysm
```

개발 중 즉시 반영(소스 직접 로드):

```
claude --plugin-dir ./plugins/sd-wiki
```

(소스 편집 후 `/reload-plugins` 로 갱신. `--plugin-dir` 와 marketplace 설치를 동시에 켜지 말 것 — 중복 로드.)

## 구성

| 컴포넌트 | 내용 |
| --- | --- |
| hooks | SessionStart 2 command — `session-start-rootmap.py`(원격 ROOT MAP 주입; 인증·네트워크·코어 의존) / `session-start-rules.py`(`rules/*.md` 주입; 의존 0). 하는 일·의존이 달라 별개 파일·별개 command(독립 truncation budget). UserPromptSubmit(매 프롬프트 제출 시 위키 갱신 의무 1줄 재노출). `wiki_login.py`=미인증·만료 시 비차단 백그라운드 로그인 격리 |
| scripts | `wiki.py`(에이전트용 조회·작성 CLI 진입점), `wiki_core.py`(인증·WikiService HTTP 공유 코어 — 모든 원격 접근의 단일 출처) |
| rules | `wiki.md`(위키에 무엇을 담고 담지 않는지·반영 방법 + CLI 명령 사용법) |

## 위키 CLI

에이전트는 `scripts/wiki.py` 로 원격 위키를 조회·작성한다 — `read`/`write`/`search`/`rootmap`/`children`/`toc`. 인증·토큰 갱신은 CLI 가 자동 처리(만료 시 브라우저 로그인), 결과는 JSON. **명령별 사용법·작성 규칙은 세션에 주입되는 `rules/wiki.md` 가 단일 출처(SSOT)** — 중복을 피해 README 엔 명령 목록만 둔다.

## 데이터 위치

- 위키 인증 토큰(`wiki-token.json`) → `~/.claude/sd/` **고정**. 에이전트의 일반 셸엔 `CLAUDE_PLUGIN_*` env 가 주입되지 않아, hook 과 CLI 가 같은 토큰을 보려면 env 비의존 고정경로여야 함.
- hook 전용 휘발 상태(`wiki-login.lock`·`wiki-login.log`·`wiki-session-no-context-*.lock`) → `CLAUDE_PLUGIN_DATA`.
- 위키 본문·목차는 팀 공용 원격 서버에 있고, 로컬엔 접근 토큰만 둠(위키 자체는 플러그인 제거와 무관하게 원격에 보존).

## 팀 공유

프로젝트 `.claude/settings.json` 에 marketplace 와 활성화를 함께 커밋(git source 권장 — 로컬 경로는 다른 머신에서 안 맞음):

```json
{
  "extraKnownMarketplaces": {
    "simplysm": { "source": { "source": "github", "repo": "kslhunter/simplysm" } }
  },
  "enabledPlugins": { "sd-wiki@simplysm": true }
}
```
