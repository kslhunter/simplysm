# sd-wiki

심플리즘 팀 공용 원격 지식 위키를 Claude Code / Codex 세션에 연결하는 플러그인. 세션 시작 시 위키 목차를 컨텍스트에 주입하고, 조회·작성 CLI 와 작성 규칙을 제공한다.

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
| hooks | SessionStart(원격 위키 목차 주입 + 작성·활용 규칙 주입), UserPromptSubmit(매 프롬프트 제출 시 위키 갱신 의무 1줄 재노출) |
| scripts | `wiki.py`(조회·작성 CLI), `wiki_auth.py`(브라우저 로그인·토큰 갱신) |
| rules | `wiki.md`(위키에 무엇을 담고 담지 않는지·반영 방법) |

## 위키 CLI

`scripts/wiki.py` 로 원격 위키를 조회·작성:

| 명령 | 동작 |
| --- | --- |
| `read <topic>` | 페이지 1건 조회 — 제목·요약·본문·버전 |
| `write <topic>` | 페이지 생성·갱신(낙관락) |
| `search <키워드>` | 키워드 검색 |
| `toc` | 목차 조회 |

인증·토큰 갱신은 CLI 가 자동 처리(만료 시 브라우저 로그인). 결과는 JSON.

## 데이터 위치

- 위키 인증 토큰(`wiki-token.json`) → `${CLAUDE_PLUGIN_DATA}` (`~/.claude/plugins/data/{id}/`, 플러그인 버전 업에도 유지).
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
