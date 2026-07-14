# sd-wiki 개발 분석서

## 1. 개요

### 1.1 핵심 목적

Claude 플러그인 환경에서 팀 공용 원격 지식 위키를 세션 컨텍스트·CLI·유지보수 스킬로 사용할 수 있게 제공한다. (근거: plugins/sd-wiki/.claude-plugin/plugin.json:2, plugins/sd-wiki/.claude-plugin/plugin.json:4, plugins/sd-wiki/rules/wiki.md:5, plugins/sd-wiki/rules/wiki.md:9)

### 1.2 주요 목표

- 세션 시작 시 원격 위키의 최상위 라우팅 목록과 작성·활용 규칙을 컨텍스트에 주입한다. (근거: plugins/sd-wiki/hooks/hooks.json:3, plugins/sd-wiki/hooks/hooks.json:9, plugins/sd-wiki/hooks/hooks.json:13, plugins/sd-wiki/hooks/session-start-rootmap.py:1, plugins/sd-wiki/hooks/session-start-rules.py:1)
- 에이전트가 Bash 에서 원격 위키 페이지를 탐색·조회·검색·작성·이동·삭제·점검할 수 있는 CLI 를 제공한다. (근거: plugins/sd-wiki/scripts/wiki.py:7, plugins/sd-wiki/scripts/wiki.py:56, plugins/sd-wiki/scripts/wiki.py:66, plugins/sd-wiki/scripts/wiki.py:97)
- 위키 기록 후보가 생기는 매 턴에 비대상 기준을 재노출해 재사용 지식만 기록하게 한다. (근거: plugins/sd-wiki/hooks/user-prompt-submit.py:3, plugins/sd-wiki/hooks/user-prompt-submit.py:20)
- 위키 전체 점검·정리 요청을 lint 실행, 전수 본문 수집, 의미 점검, 정리, 재검증 흐름으로 완수하는 스킬을 제공한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:2, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:8, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:14)

### 1.3 소비자/이해관계자

- `sd-wiki` Claude 플러그인을 설치한 에이전트 런타임과 그 런타임에서 작업하는 에이전트. (근거: plugins/sd-wiki/hooks/hooks.json:3, plugins/sd-wiki/hooks/hooks.json:18, plugins/sd-wiki/rules/wiki.md:9)
- 원격 공용 위키에 반복 재사용 지식을 축적·탐색하는 심플리즘 팀 구성원. (근거: plugins/sd-wiki/.claude-plugin/plugin.json:4, plugins/sd-wiki/rules/wiki.md:35)
- 위키 점검·정리·정돈을 요청하는 사용자와 이를 수행하는 `sd-wiki-lint` 스킬 실행 에이전트. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:3, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:8)

### 1.4 환경/플랫폼

- Claude 플러그인 패키지로 배포되며, 메타 정보는 `sd-wiki` 이름·`14.1.9` 버전·Apache-2.0 라이선스를 선언한다. (근거: plugins/sd-wiki/.claude-plugin/plugin.json:2, plugins/sd-wiki/.claude-plugin/plugin.json:3, plugins/sd-wiki/.claude-plugin/plugin.json:8)
- Hook 명령은 `python` 실행과 `${CLAUDE_PLUGIN_ROOT}` 경로를 전제로 한다. (근거: plugins/sd-wiki/hooks/hooks.json:9, plugins/sd-wiki/hooks/hooks.json:13, plugins/sd-wiki/hooks/hooks.json:23)
- 원격 위키 서버 기본 주소는 `https://opus.simplysm.co.kr` 이며, `SD_WIKI_LOGIN_URL`·`SD_WIKI_API_URL` 로 덮어쓸 수 있다. (근거: plugins/sd-wiki/scripts/wiki_core.py:31, plugins/sd-wiki/scripts/wiki_core.py:33, plugins/sd-wiki/scripts/wiki_core.py:37)
- Hook 과 CLI 가 공유하는 인증 토큰은 사용자 홈 아래 `.claude/sd/wiki-token.json` 고정 경로에 저장된다. (근거: plugins/sd-wiki/scripts/wiki_core.py:46, plugins/sd-wiki/scripts/wiki_core.py:49, plugins/sd-wiki/scripts/wiki_core.py:54)

## 2. 사용 시나리오

### 2.1 세션 시작 시 위키 진입점과 규칙을 받는다

관련 섹션: [단위.Hook 등록], [단위.SessionStart ROOT MAP 주입], [단위.SessionStart 규칙 주입], [단위.백그라운드 로그인·세션 스킵], [타입.Hook 입력], [타입.라우팅 항목], [외부 의존.Claude 플러그인 런타임], [외부 의존.원격 위키 서비스]

흐름:
1. Claude 플러그인 런타임이 `startup`·`resume`·`clear`·`compact` SessionStart 이벤트에서 ROOT MAP 주입 hook 과 규칙 주입 hook 을 순서대로 실행한다. (근거: plugins/sd-wiki/hooks/hooks.json:3, plugins/sd-wiki/hooks/hooks.json:5, plugins/sd-wiki/hooks/hooks.json:7, plugins/sd-wiki/hooks/hooks.json:11)
2. ROOT MAP hook 은 stdin 의 `session_id` 를 읽고, 이미 위키 없는 세션으로 표시된 경우 아무것도 주입하지 않는다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:26, plugins/sd-wiki/hooks/session-start-rootmap.py:78, plugins/sd-wiki/hooks/session-start-rootmap.py:84)
3. 저장 토큰이 없거나 만료된 경우 hook 은 현재 세션을 skip-lock 처리하고 백그라운드 브라우저 로그인을 트리거한 뒤 fail-open 으로 종료한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:89, plugins/sd-wiki/hooks/session-start-rootmap.py:95, plugins/sd-wiki/hooks/session-start-rootmap.py:104)
4. 인증 가능하면 원격 `rootMap` 응답을 마크다운 라우팅 목록으로 포맷해 stdout 으로 주입한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:35, plugins/sd-wiki/hooks/session-start-rootmap.py:108, plugins/sd-wiki/hooks/session-start-rootmap.py:117)
5. 규칙 hook 은 `rules/*.md` 를 읽어 `${CLAUDE_PLUGIN_ROOT}` 를 실제 경로로 치환한 뒤 stdout 으로 주입한다. (근거: plugins/sd-wiki/hooks/session-start-rules.py:23, plugins/sd-wiki/hooks/session-start-rules.py:26, plugins/sd-wiki/hooks/session-start-rules.py:28)

### 2.2 에이전트가 CLI 로 위키를 탐색하고 편집한다

관련 섹션: [단위.원격 위키 CLI], [단위.위키 공유 코어 인증·토큰], [단위.위키 공유 코어 서비스 호출·쓰기 충돌], [타입.위키 페이지], [타입.페이지 쓰기 입력], [외부 의존.원격 위키 서비스], [외부 의존.로컬 토큰 파일]

흐름:
1. 에이전트가 `python "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.py" <명령>` 형식으로 CLI 를 호출한다. (근거: plugins/sd-wiki/rules/wiki.md:9, plugins/sd-wiki/scripts/wiki.py:7)
2. CLI 는 필요 시 저장 토큰을 갱신하거나 브라우저 로그인으로 토큰을 확보한다. (근거: plugins/sd-wiki/scripts/wiki.py:137, plugins/sd-wiki/scripts/wiki.py:142, plugins/sd-wiki/scripts/wiki_core.py:213)
3. `rootmap`·`children`·`read`·`search`·`toc` 로 트리 라우팅과 페이지 본문을 찾는다. (근거: plugins/sd-wiki/rules/wiki.md:13, plugins/sd-wiki/rules/wiki.md:18, plugins/sd-wiki/scripts/wiki.py:101)
4. `write` 는 제목·요약·본문과 선택적 상위 topic·기준 버전을 서비스에 보내며, 본문은 `--body`·`--body-file`·stdin 중 하나로 받는다. (근거: plugins/sd-wiki/scripts/wiki.py:41, plugins/sd-wiki/scripts/wiki.py:69, plugins/sd-wiki/scripts/wiki.py:112)
5. 쓰기 충돌이 발생하면 CLI 는 비0 종료코드와 함께 최신 본문을 JSON 으로 출력해 재통합 후 재시도를 유도한다. (근거: plugins/sd-wiki/scripts/wiki.py:153, plugins/sd-wiki/scripts/wiki.py:155, plugins/sd-wiki/scripts/wiki_core.py:298)

### 2.3 에이전트가 오래 재사용될 지식만 위키에 기록한다

관련 섹션: [단위.UserPromptSubmit 위키 반영 알림], [단위.위키 작성·활용 규칙 문서], [단위.원격 위키 CLI], [공통 정의.재사용 지식], [공통 정의.비대상 지식], [공통 정의.낙관락]

흐름:
1. 매 프롬프트 제출 시 UserPromptSubmit hook 이 위키 반영 후보와 제외 기준을 짧게 재노출한다. (근거: plugins/sd-wiki/hooks/hooks.json:18, plugins/sd-wiki/hooks/hooks.json:23, plugins/sd-wiki/hooks/user-prompt-submit.py:3)
2. 에이전트는 작업 중 새로 확인한 비자명·반복 지식인지 판단하고, 작업 기록·1회성 결정·단순 요약·과거 기록물 등은 제외한다. (근거: plugins/sd-wiki/hooks/user-prompt-submit.py:21, plugins/sd-wiki/hooks/user-prompt-submit.py:24, plugins/sd-wiki/rules/wiki.md:35, plugins/sd-wiki/rules/wiki.md:41)
3. 기록 대상이면 `search` 와 관련 hub 의 `children` 로 중복을 확인한 뒤 기존 페이지 갱신 또는 새 topic 작성으로 반영한다. (근거: plugins/sd-wiki/rules/wiki.md:69, plugins/sd-wiki/rules/wiki.md:70)
4. 기존 페이지 갱신은 읽은 `version` 을 `--base-version` 으로 넘기고, 충돌 시 최신 본문에 변경을 재통합해 다시 쓴다. (근거: plugins/sd-wiki/rules/wiki.md:74, plugins/sd-wiki/scripts/wiki_core.py:286)

### 2.4 사용자가 위키 점검·정리를 요청하면 전수 점검한다

관련 섹션: [단위.sd-wiki-lint 스킬], [단위.원격 위키 CLI], [타입.Lint 결과], [공통 정의.위키 트리], [외부 의존.원격 위키 서비스]

흐름:
1. `sd-wiki-lint` 스킬이 위키 점검·정리·정돈·lint·건강검진 요청을 처리한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:2, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:3)
2. 먼저 CLI `lint` 로 기계 진단을 수행하고, 끊긴 참조·고아·트리 통계·저조회·지식 공백 후보를 해석한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:16, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:18, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:20)
3. `toc` 로 전체 topic 을 확보하고 모든 페이지를 `read` 해 의미 점검 입력을 만든다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:26, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:28)
4. 모순·노후·정확성·비대상·누락 개념·데이터 공백·품질을 전수 판정한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:30, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:34, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:40)
5. 명확한 정리는 즉시 적용하고 애매한 항목은 마지막에 한 번 보고한 뒤, `lint` 재실행으로 before/after 를 보고한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:50, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:54, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:60)

## 3. 기타 요구사항

### 3.1 stdout 컨텍스트 순도와 fail-open

- 요구 의도: Hook stdout 은 그대로 에이전트 컨텍스트에 주입되므로, 진단·에러는 stdout 에 섞지 않고 실패 시 플러그인 작업을 막지 않는다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:8, plugins/sd-wiki/hooks/session-start-rootmap.py:121, plugins/sd-wiki/hooks/session-start-rules.py:7, plugins/sd-wiki/hooks/user-prompt-submit.py:9)
- 관련 섹션: [단위.SessionStart ROOT MAP 주입], [단위.SessionStart 규칙 주입], [단위.UserPromptSubmit 위키 반영 알림]

### 3.2 Hook 인증은 비차단이어야 한다

- 요구 의도: 세션 시작 중 미인증·만료가 있더라도 브라우저 로그인을 동기 대기하지 않고 백그라운드로 위임하며, 해당 세션은 위키 없이 진행한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:89, plugins/sd-wiki/hooks/wiki_login.py:1, plugins/sd-wiki/hooks/wiki_login.py:55)
- 관련 섹션: [단위.SessionStart ROOT MAP 주입], [단위.백그라운드 로그인·세션 스킵], [외부 의존.브라우저·로컬 콜백]

### 3.3 토큰 저장과 hook 휘발 상태의 책임 분리

- 요구 의도: CLI 와 hook 이 공유해야 하는 토큰은 환경 변수 비의존 고정 경로에 저장하고, hook 전용 lock·로그·세션 skip 상태는 `CLAUDE_PLUGIN_DATA` 또는 폴백 경로에 둔다. (근거: plugins/sd-wiki/scripts/wiki_core.py:46, plugins/sd-wiki/scripts/wiki_core.py:49, plugins/sd-wiki/hooks/wiki_login.py:7, plugins/sd-wiki/hooks/wiki_login.py:31)
- 관련 섹션: [단위.위키 공유 코어 인증·토큰], [단위.백그라운드 로그인·세션 스킵], [외부 의존.로컬 토큰 파일], [외부 의존.로컬 hook 상태 파일]

### 3.4 공용 위키 쓰기는 낙관락을 지켜야 한다

- 요구 의도: 다른 작업자의 수정 유실을 막기 위해 충돌 시 자동 덮어쓰기·자동 머지를 하지 않고 최신 본문을 받아 사람이 재통합한 뒤 다시 쓴다. (근거: plugins/sd-wiki/scripts/wiki_core.py:77, plugins/sd-wiki/scripts/wiki_core.py:286, plugins/sd-wiki/rules/wiki.md:74)
- 관련 섹션: [단위.위키 공유 코어 서비스 호출·쓰기 충돌], [단위.원격 위키 CLI], [공통 정의.낙관락]

### 3.5 위키는 재사용 지식만 보존한다

- 요구 의도: 위키에는 다음 유사 상황에서 시간을 아끼는 비자명·반복 지식만 담고, 작업 기록·단일 프로젝트 국한 지식·단순 문서 요약·과거 기록물은 배제한다. (근거: plugins/sd-wiki/rules/wiki.md:35, plugins/sd-wiki/rules/wiki.md:41, plugins/sd-wiki/rules/wiki.md:49)
- 관련 섹션: [단위.위키 작성·활용 규칙 문서], [단위.UserPromptSubmit 위키 반영 알림], [공통 정의.재사용 지식], [공통 정의.비대상 지식]

### 3.6 원격 위키 인증 콜백은 localhost 계열로 제한된 흐름을 따른다

- 요구 의도: 로그인 콜백은 `127.0.0.1` 로 열고 state 를 검증해 요청 위조를 막는다. (근거: plugins/sd-wiki/scripts/wiki_core.py:11, plugins/sd-wiki/scripts/wiki_core.py:175, plugins/sd-wiki/scripts/wiki_core.py:179, plugins/sd-wiki/scripts/wiki_core.py:204)
- 관련 섹션: [단위.위키 공유 코어 인증·토큰], [외부 의존.브라우저·로컬 콜백]

## 4. 산출 단위

| § | 이름 | kind | 한 줄 요약 |
| --- | --- | --- | --- |
| 4.1 | 플러그인 메타데이터 | infra | Claude 플러그인 식별·버전·라이선스 정보를 선언한다. |
| 4.2 | Hook 등록 | infra | SessionStart·UserPromptSubmit 이벤트와 실행 명령을 연결한다. |
| 4.3 | SessionStart ROOT MAP 주입 | workflow-step | 원격 최상위 라우팅 목록을 세션 컨텍스트에 동적 주입한다. |
| 4.4 | SessionStart 규칙 주입 | workflow-step | 로컬 규칙 문서를 세션 컨텍스트에 정적 주입한다. |
| 4.5 | UserPromptSubmit 위키 반영 알림 | workflow-step | 매 턴 위키 기록 후보와 제외 기준을 재노출한다. |
| 4.6 | 백그라운드 로그인·세션 스킵 | infra | 비차단 브라우저 로그인과 세션별 무주입 상태를 관리한다. |
| 4.7 | 위키 공유 코어 인증·토큰 | api | 토큰 저장·갱신·브라우저 로그인·토큰 확보 계약을 제공한다. |
| 4.8 | 위키 공유 코어 서비스 호출·쓰기 충돌 | api | 원격 WikiService 호출과 쓰기 충돌 최신본 반환 계약을 제공한다. |
| 4.9 | 원격 위키 CLI | api | 에이전트가 원격 위키를 조작하는 명령행 인터페이스를 제공한다. |
| 4.10 | 위키 작성·활용 규칙 문서 | doc-section | 위키 구조·탐색·작성·비대상·정확성·트리 관리 규칙을 설명한다. |
| 4.11 | sd-wiki-lint 스킬 | workflow-step | 위키 점검·정리 요청을 끝까지 수행하는 오케스트레이션 절차를 제공한다. |

#### 4.1 플러그인 메타데이터 (kind: infra)

관련 섹션: [타입.플러그인 메타데이터]

- 목적: Claude 플러그인 관리자가 `sd-wiki` 패키지를 식별하고 배포 메타를 확인할 수 있게 한다. (근거: plugins/sd-wiki/.claude-plugin/plugin.json:1)
- 인터페이스·계약: `.claude-plugin/plugin.json` 은 이름 `sd-wiki`, 버전 `14.1.9`, 설명 `심플리즘 팀 공용 지식 위키`, 작성자 `심플리즘`, 라이선스 `Apache-2.0` 을 제공한다. (근거: plugins/sd-wiki/.claude-plugin/plugin.json:2, plugins/sd-wiki/.claude-plugin/plugin.json:8)
- 동작·내용: 런타임 동작은 없고, 플러그인 패키지 메타데이터로만 사용된다. (근거: plugins/sd-wiki/.claude-plugin/plugin.json:1)
- 경계·예외:
  - 메타 필드의 런타임 검증·fallback 동작은 산출물에 없다. [OPEN] Claude 플러그인 관리자가 필드 누락을 어떻게 처리하는지 확인 필요.
  - 버전과 루트 저장소 버전의 동기화 여부는 산출물 범위에서 확인되지 않는다. [OPEN]
- 완료 기준: 플러그인 메타 파일이 위 계약의 필드를 포함하고, 다른 산출 단위가 이 파일에 없는 런타임 동작을 전제로 하지 않는다.

#### 4.2 Hook 등록 (kind: infra)

관련 섹션: [단위.SessionStart ROOT MAP 주입], [단위.SessionStart 규칙 주입], [단위.UserPromptSubmit 위키 반영 알림], [타입.Hook 등록], [외부 의존.Claude 플러그인 런타임]

- 목적: Claude 플러그인 이벤트에서 sd-wiki hook 스크립트가 실행되도록 연결한다. (근거: plugins/sd-wiki/hooks/hooks.json:1)
- 인터페이스·계약:
  - `SessionStart` 이벤트 중 matcher `^(startup|resume|clear|compact)$` 에 대해 `session-start-rootmap.py` 와 `session-start-rules.py` 명령을 등록한다. (근거: plugins/sd-wiki/hooks/hooks.json:3, plugins/sd-wiki/hooks/hooks.json:5, plugins/sd-wiki/hooks/hooks.json:9, plugins/sd-wiki/hooks/hooks.json:13)
  - `UserPromptSubmit` 이벤트에 `user-prompt-submit.py` 명령을 등록한다. (근거: plugins/sd-wiki/hooks/hooks.json:18, plugins/sd-wiki/hooks/hooks.json:23)
- 동작·내용: 각 hook 은 `python "${CLAUDE_PLUGIN_ROOT}/..."` 형태로 실행되어 플러그인 루트 기준 파일을 호출한다. (근거: plugins/sd-wiki/hooks/hooks.json:9, plugins/sd-wiki/hooks/hooks.json:13, plugins/sd-wiki/hooks/hooks.json:23)
- 경계·예외:
  - `SessionStart` 등록 순서는 ROOT MAP 주입 후 규칙 주입이다. 이 순서가 컨텍스트 노출 순서에 미치는 영향은 산출물 코드 밖의 런타임 계약이다. [OPEN]
  - `UserPromptSubmit` 등록에는 matcher 가 없으므로 모든 프롬프트 제출에 적용된다. (근거: plugins/sd-wiki/hooks/hooks.json:18)
  - `python` 실행 파일이 없는 환경의 fallback 은 없다. [OPEN]
- 완료 기준: hook 구성 파일이 세 hook 명령을 등록하고, 각 명령 경로가 산출물 내 실제 스크립트를 가리킨다.

#### 4.3 SessionStart ROOT MAP 주입 [구현] (kind: workflow-step)

관련 섹션: [단위.Hook 등록], [단위.백그라운드 로그인·세션 스킵], [단위.위키 공유 코어 인증·토큰], [단위.위키 공유 코어 서비스 호출·쓰기 충돌], [타입.Hook 입력], [타입.라우팅 항목], [외부 의존.Claude 플러그인 런타임], [외부 의존.원격 위키 서비스]

- 목적: 세션 시작 시 원격 위키 최상위 노드만 컨텍스트에 주입해, 전체 목차 없이도 지식 탐색 진입점을 제공한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:1, plugins/sd-wiki/rules/wiki.md:7)
- 인터페이스·계약:
  - stdin JSON 에서 `session_id` 문자열을 읽고, stdout 으로만 주입 텍스트를 내보낸다. 진단·에러는 stdout 에 출력하지 않는다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:8, plugins/sd-wiki/hooks/session-start-rootmap.py:26, plugins/sd-wiki/hooks/session-start-rootmap.py:118)
  - `${CLAUDE_PLUGIN_ROOT}/scripts` 를 import 경로에 추가해 공유 코어를 import 한다. `CLAUDE_PLUGIN_ROOT` 가 없으면 예외가 발생하지만 top-level main 에서 무주입으로 흡수한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:67, plugins/sd-wiki/hooks/session-start-rootmap.py:68, plugins/sd-wiki/hooks/session-start-rootmap.py:121)
- 동작·내용:
  - 세션 skip-lock 이 있으면 즉시 종료하고, 없으면 브라우저 비허용 모드로 토큰을 확보한다. 토큰 없음·만료 시 [단위.백그라운드 로그인·세션 스킵] 을 통해 이번 세션을 위키 없이 진행하게 만든다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:84, plugins/sd-wiki/hooks/session-start-rootmap.py:89, plugins/sd-wiki/hooks/session-start-rootmap.py:95)
  - 토큰이 있으면 `rootMap` 서비스를 호출하고, 각 항목의 `topic`·`title`·`summary`·`hasChildren` 을 검증해 `- [title](topic) — summary (하위 있음)` 형식으로 변환한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:35, plugins/sd-wiki/hooks/session-start-rootmap.py:43, plugins/sd-wiki/hooks/session-start-rootmap.py:56, plugins/sd-wiki/hooks/session-start-rootmap.py:109)
  - 최종 stdout 은 `## 개인 지식 위키 ROOT MAP (원격·최상위)` 헤더와 `# 지식 위키 ROOT MAP (최상위)` 본문을 포함한다. 표시 헤더의 `개인` 표현은 [공통 정의.원격 공용 위키] 성격 설명과 다르지만, hook 이 실제 출력하는 문자열 그대로를 계약으로 둔다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:64, plugins/sd-wiki/hooks/session-start-rootmap.py:118, plugins/sd-wiki/rules/wiki.md:5)
- 경계·예외:
  - stdin JSON 파싱 실패나 `session_id` 부재는 세션 skip 기능 없이 진행한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:26, plugins/sd-wiki/hooks/session-start-rootmap.py:29)
  - 인증 만료·토큰 없음은 백그라운드 로그인 트리거 후 무주입 종료한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:97, plugins/sd-wiki/hooks/session-start-rootmap.py:104)
  - 인증 네트워크·서버 오류는 로그인 트리거 없이 무주입 종료한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:100, plugins/sd-wiki/hooks/session-start-rootmap.py:101)
  - rootMap 호출 중 인증 만료는 백그라운드 로그인 트리거 후 무주입 종료하고, 그 밖의 호출 예외는 호출 지점에서 무주입 종료한다. 응답 형식 손상처럼 포맷 단계에서 올라온 예외는 전체 hook main 의 try/except 에 의해 무주입 fail-open 된다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:108, plugins/sd-wiki/hooks/session-start-rootmap.py:113, plugins/sd-wiki/hooks/session-start-rootmap.py:116, plugins/sd-wiki/hooks/session-start-rootmap.py:121)
- 완료 기준: 정상 rootMap 배열은 마크다운 목록으로 stdout 주입되고, 토큰 없음·만료·네트워크 오류·응답 손상·환경 변수 누락은 hook 실패로 세션을 막지 않는다.

#### 4.4 SessionStart 규칙 주입 [구현] (kind: workflow-step)

관련 섹션: [단위.Hook 등록], [단위.위키 작성·활용 규칙 문서], [외부 의존.Claude 플러그인 런타임], [외부 의존.로컬 규칙 파일]

- 목적: 원격 위키 사용·작성 규칙을 세션 시작 컨텍스트에 정적으로 제공한다. (근거: plugins/sd-wiki/hooks/session-start-rules.py:1, plugins/sd-wiki/rules/wiki.md:1)
- 인터페이스·계약: stdout 인코딩을 UTF-8 로 맞추려 시도한 뒤, `${CLAUDE_PLUGIN_ROOT}/rules/*.md` 파일을 UTF-8 로 읽고, 파일 본문 안의 `${CLAUDE_PLUGIN_ROOT}` 문자열을 실제 플러그인 루트로 치환해 stdout 에 출력한다. stdout 인코딩 보정 실패는 무시하고 진행한다. (근거: plugins/sd-wiki/hooks/session-start-rules.py:15, plugins/sd-wiki/hooks/session-start-rules.py:23, plugins/sd-wiki/hooks/session-start-rules.py:26, plugins/sd-wiki/hooks/session-start-rules.py:28)
- 동작·내용: 여러 규칙 파일이 있으면 파일명 정렬 순서로 읽고, 각 파일 본문은 빈 줄 두 개로 연결한다. (근거: plugins/sd-wiki/hooks/session-start-rules.py:27, plugins/sd-wiki/hooks/session-start-rules.py:28, plugins/sd-wiki/hooks/session-start-rules.py:31)
- 경계·예외:
  - `CLAUDE_PLUGIN_ROOT` 가 없으면 아무것도 주입하지 않는다. (근거: plugins/sd-wiki/hooks/session-start-rules.py:20, plugins/sd-wiki/hooks/session-start-rules.py:23)
  - 파일 읽기 등 예외는 main 에서 흡수하고 종료코드 0 으로 반환한다. (근거: plugins/sd-wiki/hooks/session-start-rules.py:34, plugins/sd-wiki/hooks/session-start-rules.py:37, plugins/sd-wiki/hooks/session-start-rules.py:39)
  - stdout 은 규칙 본문 전용이며 진단·에러 출력은 산출물에 없다. (근거: plugins/sd-wiki/hooks/session-start-rules.py:7)
- 완료 기준: `rules/wiki.md` 가 존재할 때 세션 시작마다 규칙 본문이 stdout 으로 주입되고, 규칙 파일 부재·읽기 오류·환경 변수 부재가 세션을 막지 않는다.

#### 4.5 UserPromptSubmit 위키 반영 알림 [구현] (kind: workflow-step)

관련 섹션: [단위.Hook 등록], [단위.위키 작성·활용 규칙 문서], [공통 정의.재사용 지식], [공통 정의.비대상 지식], [외부 의존.Claude 플러그인 런타임]

- 목적: SessionStart 1회 주입만으로는 작업 중 위키 갱신 salience 가 낮아지는 문제를 줄이고, 매 턴 기록 후보 기준을 다시 노출한다. (근거: plugins/sd-wiki/hooks/user-prompt-submit.py:3, plugins/sd-wiki/hooks/user-prompt-submit.py:4)
- 인터페이스·계약: UserPromptSubmit hook 은 stdout 인코딩을 UTF-8 로 맞추려 시도한 뒤 stdout 에 짧은 컨텍스트 문구를 출력한다. 인코딩 보정 실패는 무시하고 진행한다. 실제 문구는 위키 반영 안내 문장과 제외 기준 문장으로 구성된다. (근거: plugins/sd-wiki/hooks/hooks.json:18, plugins/sd-wiki/hooks/hooks.json:23, plugins/sd-wiki/hooks/user-prompt-submit.py:15, plugins/sd-wiki/hooks/user-prompt-submit.py:20, plugins/sd-wiki/hooks/user-prompt-submit.py:22)
- 동작·내용: 문구는 종료 전 비자명·반복 지식을 새로 확인했다면 wiki.md 규칙대로 반영하라고 안내하고, 작업 기록·이번 변경 요약·1회성 결정·단순 문서 요약·과거 기록물을 제외하며, 대상 여부가 애매하면 쓰지 말라고 안내한다. (근거: plugins/sd-wiki/hooks/user-prompt-submit.py:21, plugins/sd-wiki/hooks/user-prompt-submit.py:24, plugins/sd-wiki/hooks/user-prompt-submit.py:25)
- 경계·예외:
  - hook 전체는 try/except 로 감싸져 실패해도 아무것도 출력하지 않는다. (근거: plugins/sd-wiki/hooks/user-prompt-submit.py:20, plugins/sd-wiki/hooks/user-prompt-submit.py:28)
  - stdout 오염을 막기 위해 진단·에러 로그를 stdout 에 출력하지 않는다. (근거: plugins/sd-wiki/hooks/user-prompt-submit.py:9)
  - 실제 기록 수행 여부는 이 hook 이 아니라 [단위.위키 작성·활용 규칙 문서] 와 [단위.원격 위키 CLI] 사용 판단에 맡긴다. (근거: plugins/sd-wiki/hooks/user-prompt-submit.py:5, plugins/sd-wiki/rules/wiki.md:67)
- 완료 기준: 모든 프롬프트 제출에서 짧은 알림 문구가 컨텍스트에 주입되고, hook 내부 오류가 사용자 작업을 막지 않는다.

#### 4.6 백그라운드 로그인·세션 스킵 [구현] (kind: infra)

관련 섹션: [단위.SessionStart ROOT MAP 주입], [단위.위키 공유 코어 인증·토큰], [외부 의존.로컬 hook 상태 파일], [외부 의존.브라우저·로컬 콜백]

- 목적: 미인증·만료 상태에서 세션 시작 hook 을 차단하지 않고, 로그인 부수효과와 세션별 무주입 상태를 별도 파일로 관리한다. (근거: plugins/sd-wiki/hooks/wiki_login.py:1, plugins/sd-wiki/hooks/wiki_login.py:3)
- 인터페이스·계약:
  - `mark_session_skipped(session_id)` 는 세션 ID 별 lock 파일에 현재 시각 문자열을 쓰고, `is_session_skipped(session_id)` 는 해당 lock 존재 여부를 반환한다. (근거: plugins/sd-wiki/hooks/wiki_login.py:38, plugins/sd-wiki/hooks/wiki_login.py:43, plugins/sd-wiki/hooks/wiki_login.py:46, plugins/sd-wiki/hooks/wiki_login.py:51)
  - `trigger_background_login()` 은 login-lock 을 원자적으로 생성한 경우에만 시작 시각 정보를 lock 파일에 기록하고, detached worker 프로세스를 띄워 브라우저 로그인을 시작한다. worker 입력은 닫고, 일반 출력은 버리며, 오류 출력만 로그 파일에 연결한다. (근거: plugins/sd-wiki/hooks/wiki_login.py:55, plugins/sd-wiki/hooks/wiki_login.py:64, plugins/sd-wiki/hooks/wiki_login.py:69, plugins/sd-wiki/hooks/wiki_login.py:75)
- 동작·내용:
  - hook 전용 상태 디렉터리는 `CLAUDE_PLUGIN_DATA` 가 있으면 그 값을 쓰고, 없으면 `~/.claude/sd` 를 쓴다. 세션 ID 는 파일명 안전 문자만 남기도록 치환한다. (근거: plugins/sd-wiki/hooks/wiki_login.py:31, plugins/sd-wiki/hooks/wiki_login.py:38)
  - worker 는 `CLAUDE_PLUGIN_ROOT` 로 `scripts/` 를 import 경로에 추가하고 공유 코어의 브라우저 로그인을 호출한 뒤 lock 을 삭제한다. (근거: plugins/sd-wiki/hooks/wiki_login.py:92, plugins/sd-wiki/hooks/wiki_login.py:94, plugins/sd-wiki/hooks/wiki_login.py:100, plugins/sd-wiki/hooks/wiki_login.py:102, plugins/sd-wiki/hooks/wiki_login.py:105)
- 경계·예외:
  - 세션 skip 파일 쓰기 실패는 무시한다. (근거: plugins/sd-wiki/hooks/wiki_login.py:45, plugins/sd-wiki/hooks/wiki_login.py:47)
  - login-lock 이 이미 있거나 생성 실패하면 추가 로그인 프로세스를 시작하지 않는다. (근거: plugins/sd-wiki/hooks/wiki_login.py:64, plugins/sd-wiki/hooks/wiki_login.py:66)
  - worker 시작 실패 시 생성한 lock 을 삭제하려 시도한다. (근거: plugins/sd-wiki/hooks/wiki_login.py:82, plugins/sd-wiki/hooks/wiki_login.py:84)
  - worker 오류는 stderr 에 실패 메시지를 남기고 lock 삭제를 시도한다. (근거: plugins/sd-wiki/hooks/wiki_login.py:103, plugins/sd-wiki/hooks/wiki_login.py:106)
- 완료 기준: 같은 세션에서 반복 주입 시도는 skip-lock 으로 생략되고, 동시에 여러 로그인 worker 가 중복 실행되지 않으며, worker 종료 후 login-lock 이 해제된다.

#### 4.7 위키 공유 코어 인증·토큰 [구현] (kind: api)

관련 섹션: [단위.SessionStart ROOT MAP 주입], [단위.백그라운드 로그인·세션 스킵], [단위.원격 위키 CLI], [타입.토큰 저장 레코드], [외부 의존.원격 위키 서비스], [외부 의존.로컬 토큰 파일], [외부 의존.브라우저·로컬 콜백]

- 목적: hook 과 CLI 가 동일한 방식으로 원격 위키 인증 토큰을 저장·갱신·획득하게 한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:1, plugins/sd-wiki/scripts/wiki_core.py:3, plugins/sd-wiki/scripts/wiki_core.py:89)
- 인터페이스·계약:
  - `WikiAuthError` 는 인증 실패 일반 오류, `WikiAuthExpired` 는 만료·무효 토큰으로 재로그인이 필요한 오류를 나타낸다. (근거: plugins/sd-wiki/scripts/wiki_core.py:58, plugins/sd-wiki/scripts/wiki_core.py:59, plugins/sd-wiki/scripts/wiki_core.py:63)
  - `load_token()` 은 저장 토큰 문자열을 반환하거나 파일 부재·읽기 OSError·JSON 파싱 오류·형식 오류 시 `None` 을 반환한다. 텍스트 디코딩 실패는 별도 변환 없이 전파될 수 있다. `save_token(token)` 은 임시 파일 후 교체 방식으로 저장하고, `clear_token()` 은 토큰 파일을 삭제한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:90, plugins/sd-wiki/scripts/wiki_core.py:95, plugins/sd-wiki/scripts/wiki_core.py:103, plugins/sd-wiki/scripts/wiki_core.py:110)
  - `refresh_token(token)` 은 `/api/AuthService/refresh` 에 빈 파라미터 배열을 POST 하고 새 토큰을 반환한다. 401 은 `WikiAuthExpired`, 기타 HTTP·URL 오류와 토큰 없는 응답은 `WikiAuthError` 로 처리한다. 응답 본문 JSON 해석 실패는 인증 오류로 감싸지지 않고 JSON 해석 예외로 전파될 수 있다. (근거: plugins/sd-wiki/scripts/wiki_core.py:119, plugins/sd-wiki/scripts/wiki_core.py:122, plugins/sd-wiki/scripts/wiki_core.py:135, plugins/sd-wiki/scripts/wiki_core.py:141)
  - `browser_login(timeout_sec=300)` 은 `127.0.0.1` 콜백 서버와 브라우저 로그인 URL 을 사용해 토큰을 받고 state 를 검증한 뒤 저장·반환한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:175, plugins/sd-wiki/scripts/wiki_core.py:179, plugins/sd-wiki/scripts/wiki_core.py:186, plugins/sd-wiki/scripts/wiki_core.py:204)
  - `get_token(allow_browser=True)` 은 저장 토큰을 refresh 하고 저장한 뒤 반환한다. 토큰이 없거나 만료되었을 때 `allow_browser` 가 참이면 브라우저 로그인을 수행하고, 거짓이면 `None` 을 반환한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:213, plugins/sd-wiki/scripts/wiki_core.py:219, plugins/sd-wiki/scripts/wiki_core.py:227)
- 동작·내용: 인증 요청에는 Bearer 토큰, JSON Content-Type, 클라이언트 식별 헤더 `sd-wiki` 를 사용한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:39, plugins/sd-wiki/scripts/wiki_core.py:121, plugins/sd-wiki/scripts/wiki_core.py:125)
- 경계·예외:
  - 토큰 파일의 JSON 형식이 깨졌거나 token 필드가 비문자열·빈 문자열이면 저장 토큰이 없는 것처럼 처리한다. 텍스트 디코딩 실패는 별도 변환 없이 전파될 수 있다. (근거: plugins/sd-wiki/scripts/wiki_core.py:95, plugins/sd-wiki/scripts/wiki_core.py:99)
  - 브라우저 자동 실행 실패는 무시하며, 성공 여부와 관계없이 stderr 에 로그인 URL 을 안내한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:188, plugins/sd-wiki/scripts/wiki_core.py:192)
  - 로그인 대기 시간이 초과되거나 콜백 state 가 일치하지 않으면 `WikiAuthError` 로 실패한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:195, plugins/sd-wiki/scripts/wiki_core.py:204)
- 완료 기준: 저장 토큰 없음·깨짐·만료·정상 갱신·브라우저 로그인·state 불일치·타임아웃 경계가 계약대로 동작한다.

#### 4.8 위키 공유 코어 서비스 호출·쓰기 충돌 (kind: api)

관련 섹션: [단위.SessionStart ROOT MAP 주입], [단위.원격 위키 CLI], [타입.페이지 쓰기 입력], [외부 의존.원격 위키 서비스], [공통 정의.낙관락]

- 목적: 원격 `WikiService` 메서드 호출을 공통화하고, 쓰기 충돌 시 최신 본문을 포함한 명시적 충돌 오류를 제공한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:232, plugins/sd-wiki/scripts/wiki_core.py:286)
- 인터페이스·계약:
  - `WikiApiError` 는 API 오류 메시지와 선택적 HTTP 상태 코드를 보관하며, 메시지에 `저장 충돌` 이 있으면 쓰기 충돌로 판정한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:67, plugins/sd-wiki/scripts/wiki_core.py:72)
  - `WikiWriteConflict` 는 쓰기 충돌을 나타내며 최신 본문 `latest` 를 포함한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:77, plugins/sd-wiki/scripts/wiki_core.py:84)
  - `call_service(method, params, token)` 은 `/api/WikiService/<method>` 로 JSON 배열 파라미터를 POST 하고, 요청 헤더에는 JSON Content-Type, Bearer 토큰, 클라이언트 식별값을 넣는다. 원격 호출은 20초 제한으로 수행되며, 빈 응답은 `None`, JSON 응답은 파싱 결과로 반환한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:255, plugins/sd-wiki/scripts/wiki_core.py:257, plugins/sd-wiki/scripts/wiki_core.py:260, plugins/sd-wiki/scripts/wiki_core.py:267, plugins/sd-wiki/scripts/wiki_core.py:278)
  - `write_page(input_data, token)` 은 `write` 호출을 수행하고, 쓰기 충돌이면 `read` 로 최신 본문을 가져와 `WikiWriteConflict` 를 발생시킨다. (근거: plugins/sd-wiki/scripts/wiki_core.py:298, plugins/sd-wiki/scripts/wiki_core.py:304, plugins/sd-wiki/scripts/wiki_core.py:310)
- 동작·내용: HTTP 401 은 토큰을 삭제하고 `WikiAuthExpired` 로 변환한다. 그 외 HTTP 오류는 응답 body 의 `message` 또는 `error` 를 우선 메시지로 사용하고, 둘 다 없으면 전체 응답 본문을, 본문도 없으면 HTTP 상태 숫자를 메시지로 쓴다. URL 오류는 서버 연결 실패 메시지로 변환한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:269, plugins/sd-wiki/scripts/wiki_core.py:270, plugins/sd-wiki/scripts/wiki_core.py:237, plugins/sd-wiki/scripts/wiki_core.py:251, plugins/sd-wiki/scripts/wiki_core.py:275)
- 경계·예외:
  - 응답 JSON 파싱 실패는 `WikiApiError` 로 알린다. (근거: plugins/sd-wiki/scripts/wiki_core.py:280, plugins/sd-wiki/scripts/wiki_core.py:282)
  - 충돌이 아닌 API 오류는 `write_page` 에서 그대로 전파한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:306, plugins/sd-wiki/scripts/wiki_core.py:307)
  - 충돌 후 최신 본문 조회 실패 시 별도 복구 없이 그 오류가 전파된다. [OPEN] 산출물에 명시 복구 경로 없음.
- 완료 기준: 각 서비스 호출이 정해진 endpoint·headers·JSON 형식으로 수행되고, 401·일반 HTTP 오류·URL 오류·응답 파싱 오류·쓰기 충돌이 계약대로 구분된다.

#### 4.9 원격 위키 CLI [구현] (kind: api)

관련 섹션: [단위.위키 공유 코어 인증·토큰], [단위.위키 공유 코어 서비스 호출·쓰기 충돌], [타입.위키 페이지], [타입.페이지 쓰기 입력], [타입.페이지 삭제 입력], [타입.페이지 이동 입력], [타입.Lint 결과], [외부 의존.원격 위키 서비스], [외부 의존.로컬 본문 파일]

- 목적: 에이전트가 Bash 명령으로 원격 위키를 탐색·조회·검색·작성·삭제·이동·점검하게 한다. (근거: plugins/sd-wiki/scripts/wiki.py:1, plugins/sd-wiki/rules/wiki.md:9)
- 인터페이스·계약:
  - 실행 형식은 `python "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.py" <명령> ...` 이다. 정상 결과는 stdout JSON 으로 출력하고, 쓰기 충돌은 stdout JSON 과 종료코드 3 으로 출력하며, 인증·API 오류는 stderr 와 종료코드 2 로 표현한다. 브라우저 금지 상태에서 토큰이 없으면 오류 문구 없이 종료코드 1 을 반환한다. (근거: plugins/sd-wiki/scripts/wiki.py:7, plugins/sd-wiki/scripts/wiki.py:9, plugins/sd-wiki/scripts/wiki.py:143, plugins/sd-wiki/scripts/wiki.py:153, plugins/sd-wiki/scripts/wiki.py:157)
  - 전역 옵션 `--no-browser` 는 토큰이 없을 때 브라우저 로그인을 띄우지 않고 종료하게 한다. (근거: plugins/sd-wiki/scripts/wiki.py:58, plugins/sd-wiki/scripts/wiki.py:140)
  - 제공 명령은 `read <topic>`, `write <topic> --title --summary [--body|--body-file|stdin] [--base-version] [--parent]`, `search <keyword>`, `toc`, `rootmap`, `children <topic>`, `delete <topic> [--base-version]`, `move <topic> (--parent <topic>|--root)`, `lint` 이다. (근거: plugins/sd-wiki/scripts/wiki.py:66, plugins/sd-wiki/scripts/wiki.py:69, plugins/sd-wiki/scripts/wiki.py:78, plugins/sd-wiki/scripts/wiki.py:81, plugins/sd-wiki/scripts/wiki.py:97)
- 동작·내용:
  - `read`·`search`·`toc`·`rootmap`·`children`·`delete`·`move`·`lint` 는 대응하는 WikiService 메서드에 파라미터를 넘긴다. `rootmap` 명령은 서비스 메서드명 `rootMap` 을 사용한다. `children` 은 없는 topic 에서 오류, leaf 에서 빈 목록을 반환한다고 규칙 문서가 설명하고, `read` 는 없는 topic 에서 빈 결과를 반환한다고 설명한다. (근거: plugins/sd-wiki/scripts/wiki.py:101, plugins/sd-wiki/scripts/wiki.py:108, plugins/sd-wiki/scripts/wiki.py:124, plugins/sd-wiki/scripts/wiki.py:129, plugins/sd-wiki/rules/wiki.md:14, plugins/sd-wiki/rules/wiki.md:15)
  - `write` 는 topic·title·summary·body 를 기본 입력으로 만들고, `--base-version` 은 `baseVersion`, `--parent` 는 `parentTopic` 으로 전달한다. `move` 는 본문 재전송 없이 상위만 바꾸는 순수 위치 변경이다. (근거: plugins/sd-wiki/scripts/wiki.py:112, plugins/sd-wiki/scripts/wiki.py:119, plugins/sd-wiki/scripts/wiki.py:121, plugins/sd-wiki/rules/wiki.md:20, plugins/sd-wiki/scripts/wiki.py:129)
  - 본문 입력은 `--body`, `--body-file`, stdin 순서로 결정하며, `--body` 와 `--body-file` 동시 지정은 오류다. (근거: plugins/sd-wiki/scripts/wiki.py:41, plugins/sd-wiki/scripts/wiki.py:42, plugins/sd-wiki/scripts/wiki.py:46, plugins/sd-wiki/scripts/wiki.py:51)
  - `search` 는 제목·요약·본문 키워드 검색으로 라우팅 항목을 반환하고, `toc` 는 트리 탐색으로 진입점을 못 찾을 때 쓰는 전체 페이지 평면 목록 fallback 이다. 인증 만료가 실행 중 발생하면 브라우저 허용 모드에서 한 번 로그인 후 같은 명령을 재실행한다. (근거: plugins/sd-wiki/rules/wiki.md:17, plugins/sd-wiki/rules/wiki.md:18, plugins/sd-wiki/scripts/wiki.py:146, plugins/sd-wiki/scripts/wiki.py:148, plugins/sd-wiki/scripts/wiki.py:151)
- 경계·예외:
  - 토큰이 없고 브라우저 로그인이 허용되지 않으면 종료코드 1 을 반환한다. (근거: plugins/sd-wiki/scripts/wiki.py:143, plugins/sd-wiki/scripts/wiki.py:144)
  - 쓰기 충돌은 stdout 에 `{ conflict: true, message, latest }` JSON 을 출력하고 종료코드 3 을 반환한다. (근거: plugins/sd-wiki/scripts/wiki.py:153, plugins/sd-wiki/scripts/wiki.py:156)
  - 인증 오류와 API 오류는 stderr 에 한국어 오류 문구를 출력하고 종료코드 2 를 반환한다. (근거: plugins/sd-wiki/scripts/wiki.py:157, plugins/sd-wiki/scripts/wiki.py:160)
  - 알 수 없는 명령은 argparse 의 required subcommand 또는 내부 오류로 처리된다. 내부 `_run_command` fallback 은 `WikiApiError` 를 발생시킨다. (근거: plugins/sd-wiki/scripts/wiki.py:64, plugins/sd-wiki/scripts/wiki.py:134)
- 완료 기준: 모든 명령이 문서화된 인자를 파싱하고 대응 서비스 호출을 수행하며, 정상 결과·충돌·인증 오류·API 오류·본문 입력 오류가 지정된 출력 채널과 종료코드로 구분된다.

#### 4.10 위키 작성·활용 규칙 문서 [구현] (kind: doc-section)

관련 섹션: [단위.SessionStart 규칙 주입], [단위.UserPromptSubmit 위키 반영 알림], [단위.원격 위키 CLI], [공통 정의.위키 트리], [공통 정의.재사용 지식], [공통 정의.비대상 지식], [공통 정의.낙관락]

- 목적: 에이전트가 원격 공용 위키를 탐색·작성·정리할 때 따라야 할 권위 규칙을 제공한다. (근거: plugins/sd-wiki/rules/wiki.md:1, plugins/sd-wiki/rules/wiki.md:9)
- 인터페이스·계약: 문서는 위키 구조, CLI 명령 표, 페이지 탐색, 기록 대상, 비대상, 정확성, 작성 방법, 트리 모양 유지, 유지·점검을 다룬다. (근거: plugins/sd-wiki/rules/wiki.md:3, plugins/sd-wiki/rules/wiki.md:25, plugins/sd-wiki/rules/wiki.md:35, plugins/sd-wiki/rules/wiki.md:88)
- 동작·내용:
  - 위키는 로컬 파일이 아닌 팀 공용 원격 서버이며, 페이지는 topic·제목·요약·본문·버전·상위 페이지로 구성되고 재귀 트리 forest 를 이룬다고 설명한다. (근거: plugins/sd-wiki/rules/wiki.md:5, plugins/sd-wiki/rules/wiki.md:6)
  - 세션에는 ROOT MAP 만 자동 주입되며, 하위 지식은 `children` 과 `read`, 필요 시 `search`·`toc` 로 온디맨드 탐색한다고 설명한다. 본문이 다른 topic 을 가리키면 그 topic 도 확인하고, 페이지가 노후했으면 사용자 요청을 기다리지 않고 재검증·갱신한다고 설명한다. (근거: plugins/sd-wiki/rules/wiki.md:7, plugins/sd-wiki/rules/wiki.md:27, plugins/sd-wiki/rules/wiki.md:29, plugins/sd-wiki/rules/wiki.md:32, plugins/sd-wiki/rules/wiki.md:33)
  - 기록 대상은 다음 유사 상황에서 시간을 아낄 비자명·반복 지식이며, 비대상은 작업 기록·단순 문서 요약·개인/로컬 특이 정보·과거 기록물·단일 프로젝트 국한 지식이라고 정의한다. 단순 문서 요약은 제외하지만, 문서로 찾기 어려운 함정·우리 환경 특이 동작·반복 적용 패턴은 예외적으로 대상이 될 수 있다. (근거: plugins/sd-wiki/rules/wiki.md:37, plugins/sd-wiki/rules/wiki.md:43, plugins/sd-wiki/rules/wiki.md:45, plugins/sd-wiki/rules/wiki.md:46, plugins/sd-wiki/rules/wiki.md:49)
  - 기록 전 중복 확인, 상위 지정, 재분류·이동, cross-link, 낙관락, 라우팅 전용 요약, 모순 처리 규칙을 설명한다. 없는 상위 topic 은 서버가 거부하고, 위치만 바꿀 때는 `move`, 본문 기록과 함께 상위를 바꿀 때는 `write --parent` 를 쓰며, topic rename 은 하지 않는다. (근거: plugins/sd-wiki/rules/wiki.md:67, plugins/sd-wiki/rules/wiki.md:70, plugins/sd-wiki/rules/wiki.md:71, plugins/sd-wiki/rules/wiki.md:72, plugins/sd-wiki/rules/wiki.md:74, plugins/sd-wiki/rules/wiki.md:77)
  - 트리는 ROOT MAP 주입량과 라우팅성을 고려해 루트 수를 작게 유지하고, 과대 hub 분할·이동·머지를 수행한다고 설명한다. 잉여 hub 머지는 `delete` 로 처리하며, delete 는 자식을 상위로 재배치해 보존한다고 설명한다. (근거: plugins/sd-wiki/rules/wiki.md:79, plugins/sd-wiki/rules/wiki.md:83, plugins/sd-wiki/rules/wiki.md:86, plugins/sd-wiki/rules/wiki.md:92)
- 경계·예외:
  - 자동 기록은 사용자 확인 없이 수행하는 설계로 명시되어 있으나, 대상 여부는 문서 기준으로 제한된다. (근거: plugins/sd-wiki/rules/wiki.md:69)
  - 검증된 지식은 사실로 기록하고, 불확실 지식은 검증 방식·불확실 항목·갱신 날짜를 본문에 표시하며 사실 단정을 금지한다. 신빙성 미달은 기록하지 않고, 근거·출처는 본문에 남긴다. (근거: plugins/sd-wiki/rules/wiki.md:57, plugins/sd-wiki/rules/wiki.md:61, plugins/sd-wiki/rules/wiki.md:62, plugins/sd-wiki/rules/wiki.md:65)
  - 본문 작성은 단발 정보를 작업 산출물에 남기고, 재사용 페이지에도 특정 건의 수치·진행 경위·사고 서사를 섞지 않으며, 위키를 얇게 유지하는 원칙을 따른다. 요약은 라우팅 전용 한 줄·대략 100자 이내로 쓰고, 근거·검증 방식·날짜·세부 결론은 본문에 둔다. 전체 점검·정리는 별도 [단위.sd-wiki-lint 스킬] 로 위임하며, 검색 0건·저조회·루트 비대화 같은 신호를 점검 입력으로 삼는다. (근거: plugins/sd-wiki/rules/wiki.md:53, plugins/sd-wiki/rules/wiki.md:55, plugins/sd-wiki/rules/wiki.md:75, plugins/sd-wiki/rules/wiki.md:76, plugins/sd-wiki/rules/wiki.md:90, plugins/sd-wiki/rules/wiki.md:91)
- 완료 기준: 문서 독자가 ROOT MAP 기반 탐색, 기록 대상 판정, CLI 작성·갱신·충돌 대응, 트리 관리, lint 스킬 진입 기준을 이 문서만으로 이해할 수 있다.

#### 4.11 sd-wiki-lint 스킬 (kind: workflow-step)

관련 섹션: [단위.위키 작성·활용 규칙 문서], [단위.원격 위키 CLI], [타입.Lint 결과], [공통 정의.위키 트리], [공통 정의.비대상 지식]

- 목적: 위키 점검·정리·정돈 요청을 한 번의 스킬 실행에서 끝까지 완수한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:1, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:8)
- 인터페이스·계약:
  - skill 이름은 `sd-wiki-lint` 이고, 위키 점검·정리·정돈·lint·건강검진 요청에 사용된다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:2, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:3)
  - 위키 CLI 명령과 구조·작성 규칙·트리 모양·비대상 기준은 SessionStart 로 주입된 `rules/wiki.md` 를 권위로 삼는다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:10)
- 동작·내용:
  - 1단계는 CLI `lint` 를 실행해 `orphans`·`brokenLinks`·`treeStats`·`unlinkedTopics`·`lowViewPages`·`knowledgeGaps` 를 해석한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:16, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:20)
  - 2단계는 `toc` 로 전체 topic 을 확보하고 모든 페이지를 `read` 한다. 대량이면 셸 반복으로 묶어 읽고, 출력이 크면 파일로 받아 읽는다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:26, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:28)
  - 3단계는 모순·노후·정확성·비대상·누락 개념·데이터 공백·품질을 전수 판정한다. 판정 근거는 본문뿐 아니라 현 코드베이스·현 버전·도구·경로를 실제로 열어 대조하며, 정확성 문제는 검증 가능하면 확인해 단정을 유지하고, 불확실하면 미검증·추정 표기를 추가하며, 신빙성이 부족하면 제거한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:30, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:32, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:34, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:36, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:40)
  - 4단계는 루트 과다·과대 hub·잉여 hub 를 판단하고, 5단계는 자동 적용 대상과 마지막 보고 대상을 구분한다. 자동 대상은 끊긴 참조 수정, 비대상 삭제, 명백한 노후·근거표기 정정, 루트 과다 sub-hub 묶기, 요약·품질 정정, 잉여 hub 머지다. 보고 대상은 둘 다 유효할 수 있는 모순, 코드만으로 노후 확정이 어려운 항목, 새 페이지화·데이터 공백 보강 제안이다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:42, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:46, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:50, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:54, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:57)
  - 6단계는 `lint` 를 재실행해 페이지 수·rootCount·무결성 before/after 와 자동 처리 내역, 보고 대기 항목을 제시한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:60, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:62)
- 경계·예외:
  - `lint` 는 위상 점검만 하며 의미 점검은 LLM 이 본문을 읽어 판정해야 한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:12)
  - 모든 페이지 본문을 읽어야 하며 표본·요약만 보고 판단하지 않는다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:28)
  - 근거가 한 선택만 가리키면 묻지 않고 즉시 실행하되, 애매한 항목은 마지막에 한 번 보고한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:52)
  - 삭제 전에는 본문을 읽어 살릴 내용을 확인하고 읽은 버전을 기준으로 전달한다. 부모·자식을 함께 지울 때는 자식부터 처리하며, 이동은 내용 불변, 갱신 시 상위 생략은 기존 상위 유지로 본다. 다중 작업은 전부성공/전부실패이며, 일부라도 실패하면 이미 적용된 부분을 보고하고 조용히 건너뛰지 않는다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:55, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:56, plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:58)
- 완료 기준: 기계 진단, 전수 본문 수집, 의미 점검, 트리 모양 점검, 정리 적용, 재검증·보고가 순서대로 수행되고, 자동 처리와 보고 대기 항목이 구분된다.

## 5. 공통 정의

### 5.1 용어 사전

- **원격 공용 위키**: 로컬 파일이 아닌 팀 공용 원격 서버에 있는 지식 저장소. (근거: plugins/sd-wiki/rules/wiki.md:5)
- **topic**: 위키 페이지의 유니크 키. CLI 의 조회·작성·이동·삭제 명령이 topic 을 기본 식별자로 사용한다. (근거: plugins/sd-wiki/rules/wiki.md:6, plugins/sd-wiki/scripts/wiki.py:66, plugins/sd-wiki/scripts/wiki.py:70)
- **위키 페이지**: topic, 제목, 요약, 본문(마크다운), 버전, 상위 페이지로 구성되는 원격 위키 단위. (근거: plugins/sd-wiki/rules/wiki.md:6)
- **위키 트리**: 페이지가 상위-자식 관계로 구성하는 재귀 forest. 자식 있는 노드는 hub, 자식 없는 노드는 leaf 로 파생된다. (근거: plugins/sd-wiki/rules/wiki.md:6)
- **ROOT MAP**: 상위 없는 최상위 노드의 라우팅 목록. 세션 시작 시 자동 주입되며 전체 목차가 아니다. (근거: plugins/sd-wiki/rules/wiki.md:7, plugins/sd-wiki/rules/wiki.md:13)
- **라우팅 항목**: topic·제목·요약·자식 유무를 담아 사용자가 펼칠 노드를 고르게 하는 목록 항목. (근거: plugins/sd-wiki/rules/wiki.md:13, plugins/sd-wiki/rules/wiki.md:14)
- **재사용 지식**: 다음에 비슷한 상황에서 페이지를 열어 시간을 아낄 비자명하고 반복되는 지식. (근거: plugins/sd-wiki/rules/wiki.md:37, plugins/sd-wiki/rules/wiki.md:39)
- **비대상 지식**: 위키에 기록하지 않는 작업 기록·1회성 결정·단순 문서 요약·개인/로컬 특이 정보·과거 기록물·단일 프로젝트 국한 지식. (근거: plugins/sd-wiki/rules/wiki.md:41, plugins/sd-wiki/rules/wiki.md:45, plugins/sd-wiki/rules/wiki.md:49)
- **낙관락**: 갱신 시 읽은 version 을 `--base-version` 으로 전달하고, 충돌 시 최신 본문에 변경을 재통합한 뒤 다시 쓰는 동시성 규칙. (근거: plugins/sd-wiki/rules/wiki.md:74)
- **fail-open**: 인증·네트워크·형식 오류 등에서 hook 이 세션을 막지 않고 주입 없이 성공 종료하는 정책. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:3, plugins/sd-wiki/hooks/session-start-rootmap.py:121, plugins/sd-wiki/hooks/session-start-rules.py:34)
- **세션 skip-lock**: 인증이 필요한 세션에서 같은 `session_id` 의 이후 ROOT MAP 주입을 생략하기 위해 만드는 lock 파일. (근거: plugins/sd-wiki/hooks/wiki_login.py:38, plugins/sd-wiki/hooks/wiki_login.py:43)

### 5.2 CLI 명령 이름과 서비스 메서드 매핑

| CLI 명령 | 원격 서비스 메서드 | 비고 |
| --- | --- | --- |
| `read <topic>` | `read` | topic 1개를 배열 인자로 전달한다. 규칙 문서상 없는 topic 은 빈 결과다. (근거: plugins/sd-wiki/scripts/wiki.py:102, plugins/sd-wiki/rules/wiki.md:15) |
| `search <keyword>` | `search` | keyword 1개를 배열 인자로 전달한다. 제목·요약·본문을 검색해 라우팅 항목을 반환한다. (근거: plugins/sd-wiki/scripts/wiki.py:104, plugins/sd-wiki/rules/wiki.md:17) |
| `toc` | `toc` | 인자 없이 호출한다. 전체 페이지 평면 목록이며 트리 탐색 fallback 으로 쓴다. (근거: plugins/sd-wiki/scripts/wiki.py:106, plugins/sd-wiki/rules/wiki.md:18) |
| `rootmap` | `rootMap` | CLI 명령명과 서비스 메서드 대소문자가 다르다. (근거: plugins/sd-wiki/scripts/wiki.py:108) |
| `children <topic>` | `children` | topic 1개를 배열 인자로 전달한다. 규칙 문서상 없는 topic 은 에러, leaf 는 빈 목록이다. (근거: plugins/sd-wiki/scripts/wiki.py:110, plugins/sd-wiki/rules/wiki.md:14) |
| `write <topic>` | `write` | [타입.페이지 쓰기 입력] 을 단일 배열 인자로 전달한다. (근거: plugins/sd-wiki/scripts/wiki.py:112, plugins/sd-wiki/scripts/wiki_core.py:304) |
| `delete <topic>` | `delete` | [타입.페이지 삭제 입력] 을 단일 배열 인자로 전달한다. (근거: plugins/sd-wiki/scripts/wiki.py:124, plugins/sd-wiki/scripts/wiki.py:128) |
| `move <topic>` | `move` | [타입.페이지 이동 입력] 을 단일 배열 인자로 전달한다. 본문 재전송 없이 상위만 바꾸는 순수 위치 변경이다. (근거: plugins/sd-wiki/scripts/wiki.py:129, plugins/sd-wiki/scripts/wiki.py:131, plugins/sd-wiki/rules/wiki.md:20) |
| `lint` | `lint` | 인자 없이 호출한다. (근거: plugins/sd-wiki/scripts/wiki.py:132) |

### 5.3 출력 채널 규칙

- Hook stdout 은 컨텍스트 주입 본문 전용이다. 진단·에러는 stdout 에 출력하지 않는다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:8, plugins/sd-wiki/hooks/user-prompt-submit.py:9)
- CLI stdout 은 정상 서비스 응답 JSON 또는 쓰기 충돌 JSON 이다. CLI 오류 메시지는 stderr 로 출력한다. (근거: plugins/sd-wiki/scripts/wiki.py:9, plugins/sd-wiki/scripts/wiki.py:153, plugins/sd-wiki/scripts/wiki.py:157)
- 브라우저 로그인 안내와 worker 실패 메시지는 stderr 로 출력한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:192, plugins/sd-wiki/hooks/wiki_login.py:103)

## 6. 핵심 타입·자료구조

### 6.1 [타입.플러그인 메타데이터]

설계 자연 도출 — [단위.플러그인 메타데이터] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| name | `string` | 필수 | 값은 `sd-wiki`. (근거: plugins/sd-wiki/.claude-plugin/plugin.json:2) |
| version | `string` | 필수 | 값은 `14.1.9`. (근거: plugins/sd-wiki/.claude-plugin/plugin.json:3) |
| description | `string` | 필수 | 값은 `심플리즘 팀 공용 지식 위키`. (근거: plugins/sd-wiki/.claude-plugin/plugin.json:4) |
| author.name | `string` | 필수 | 값은 `심플리즘`. (근거: plugins/sd-wiki/.claude-plugin/plugin.json:5) |
| license | `string` | 필수 | 값은 `Apache-2.0`. (근거: plugins/sd-wiki/.claude-plugin/plugin.json:8) |

제약: 플러그인 메타 런타임 스키마의 추가 필수 필드는 산출물에서 확인되지 않는다. [OPEN]

### 6.2 [타입.Hook 등록]

설계 자연 도출 — [단위.Hook 등록] 이 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| hooks.SessionStart[].matcher | `string` | 선택 | 현재 값은 `^(startup|resume|clear|compact)$`. (근거: plugins/sd-wiki/hooks/hooks.json:5) |
| hooks.SessionStart[].hooks[].type | `"command"` | 필수 | 현재 SessionStart hook 은 command 타입만 사용한다. (근거: plugins/sd-wiki/hooks/hooks.json:8, plugins/sd-wiki/hooks/hooks.json:12) |
| hooks.SessionStart[].hooks[].command | `string` | 필수 | ROOT MAP 주입과 규칙 주입 Python 명령. (근거: plugins/sd-wiki/hooks/hooks.json:9, plugins/sd-wiki/hooks/hooks.json:13) |
| hooks.UserPromptSubmit[].hooks[].type | `"command"` | 필수 | 현재 UserPromptSubmit hook 은 command 타입만 사용한다. (근거: plugins/sd-wiki/hooks/hooks.json:22) |
| hooks.UserPromptSubmit[].hooks[].command | `string` | 필수 | 위키 반영 알림 Python 명령. (근거: plugins/sd-wiki/hooks/hooks.json:23) |

제약: Claude hook 구성의 전체 스키마와 실행 순서 보장은 외부 런타임 계약이다. [OPEN]

### 6.3 [타입.Hook 입력]

설계 자연 도출 — [단위.SessionStart ROOT MAP 주입] 이 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| session_id | `string` | 선택 | 문자열이며 비어 있지 않을 때만 세션 skip-lock 키로 사용한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:26, plugins/sd-wiki/hooks/session-start-rootmap.py:31) |

제약: stdin 이 JSON 객체가 아니거나 파싱 실패하면 빈 입력처럼 처리한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:27, plugins/sd-wiki/hooks/session-start-rootmap.py:30)

### 6.4 [타입.라우팅 항목]

설계 자연 도출 — [단위.SessionStart ROOT MAP 주입], [단위.위키 작성·활용 규칙 문서] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| topic | `string` | 필수 | 페이지 유니크 키. ROOT MAP 포맷에서 링크 대상이다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:43, plugins/sd-wiki/hooks/session-start-rootmap.py:56) |
| title | `string` | 필수 | ROOT MAP 포맷에서 링크 텍스트다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:46, plugins/sd-wiki/hooks/session-start-rootmap.py:56) |
| summary | `string` | 필수 | 비어 있지 않으면 제목 뒤에 `— summary` 로 붙는다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:49, plugins/sd-wiki/hooks/session-start-rootmap.py:57) |
| hasChildren | `boolean` | 필수 | 참이면 `(하위 있음)` 표시를 붙인다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:52, plugins/sd-wiki/hooks/session-start-rootmap.py:59) |

제약: ROOT MAP 응답 자체는 배열이어야 하고, 각 항목은 객체여야 한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:35, plugins/sd-wiki/hooks/session-start-rootmap.py:40)

### 6.5 [타입.토큰 저장 레코드]

설계 자연 도출 — [단위.위키 공유 코어 인증·토큰] 이 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| token | `string` | 필수 | 저장 토큰 값. 비문자열·빈 문자열이면 무효로 취급한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:96, plugins/sd-wiki/scripts/wiki_core.py:99) |

제약: 저장 파일은 JSON 객체이며, 저장 시 `ensure_ascii=false` 로 `{ "token": token }` 를 기록한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:103, plugins/sd-wiki/scripts/wiki_core.py:106)

### 6.6 [타입.위키 페이지]

설계 자연 도출 — [단위.원격 위키 CLI], [단위.위키 작성·활용 규칙 문서] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| topic | `string` | 필수 | 페이지 유니크 키. (근거: plugins/sd-wiki/rules/wiki.md:6) |
| title | `string` | 필수 | 페이지 제목. (근거: plugins/sd-wiki/rules/wiki.md:6) |
| summary | `string` | 필수 | 라우팅용 요약. 본문 사실 복제를 금지한다. (근거: plugins/sd-wiki/rules/wiki.md:6, plugins/sd-wiki/rules/wiki.md:75) |
| body | `string` | 필수 | 마크다운 본문. (근거: plugins/sd-wiki/rules/wiki.md:6) |
| version | `number` | 필수 | 갱신 낙관락의 기준 버전으로 사용한다. (근거: plugins/sd-wiki/rules/wiki.md:6, plugins/sd-wiki/rules/wiki.md:74) |
| parentTopic | `string | null` | 선택 | 상위 페이지 topic. 서버 응답 필드명이 `parentTopic` 인지 `parent` 인지는 산출물에서 확정되지 않는다. [OPEN] |

제약: 페이지는 상위-자식 관계로 forest 를 구성하며, 자식 유무에 따라 hub/leaf 가 파생된다. (근거: plugins/sd-wiki/rules/wiki.md:6)

### 6.7 [타입.페이지 쓰기 입력]

설계 자연 도출 — [단위.원격 위키 CLI], [단위.위키 공유 코어 서비스 호출·쓰기 충돌] 이 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| topic | `string` | 필수 | 작성·갱신 대상 topic. (근거: plugins/sd-wiki/scripts/wiki.py:70, plugins/sd-wiki/scripts/wiki.py:114) |
| title | `string` | 필수 | CLI `--title` 로 받는다. (근거: plugins/sd-wiki/scripts/wiki.py:71, plugins/sd-wiki/scripts/wiki.py:115) |
| summary | `string` | 필수 | CLI `--summary` 로 받는다. (근거: plugins/sd-wiki/scripts/wiki.py:72, plugins/sd-wiki/scripts/wiki.py:116) |
| body | `string` | 필수 | `--body`, `--body-file`, stdin 중 하나에서 읽는다. (근거: plugins/sd-wiki/scripts/wiki.py:41, plugins/sd-wiki/scripts/wiki.py:117) |
| baseVersion | `number` | 선택 | CLI `--base-version` 이 있을 때만 포함한다. (근거: plugins/sd-wiki/scripts/wiki.py:75, plugins/sd-wiki/scripts/wiki.py:119) |
| parentTopic | `string` | 선택 | CLI `--parent` 가 있을 때만 포함한다. (근거: plugins/sd-wiki/scripts/wiki.py:76, plugins/sd-wiki/scripts/wiki.py:121) |

제약: `--body` 와 `--body-file` 은 함께 사용할 수 없다. 둘 다 없고 stdin 이 TTY 이면 오류다. (근거: plugins/sd-wiki/scripts/wiki.py:42, plugins/sd-wiki/scripts/wiki.py:51)

### 6.8 [타입.페이지 삭제 입력]

설계 자연 도출 — [단위.원격 위키 CLI] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| topic | `string` | 필수 | 삭제 대상 topic. (근거: plugins/sd-wiki/scripts/wiki.py:87, plugins/sd-wiki/scripts/wiki.py:125) |
| baseVersion | `number` | 선택 | CLI `--base-version` 이 있을 때만 포함한다. (근거: plugins/sd-wiki/scripts/wiki.py:89, plugins/sd-wiki/scripts/wiki.py:126) |

제약: 자식이 있으면 서버가 자식을 상위로 재배치한 뒤 노드만 삭제한다고 규칙 문서가 설명한다. (근거: plugins/sd-wiki/rules/wiki.md:19)

### 6.9 [타입.페이지 이동 입력]

설계 자연 도출 — [단위.원격 위키 CLI] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| topic | `string` | 필수 | 이동 대상 topic. (근거: plugins/sd-wiki/scripts/wiki.py:91, plugins/sd-wiki/scripts/wiki.py:131) |
| parentTopic | `string | null` | 필수 | `--parent` 값 또는 `--root` 일 때 `null`. (근거: plugins/sd-wiki/scripts/wiki.py:93, plugins/sd-wiki/scripts/wiki.py:129) |

제약: `--parent` 와 `--root` 는 상호 배타이며 둘 중 하나가 필수다. (근거: plugins/sd-wiki/scripts/wiki.py:93)

### 6.10 [타입.Lint 결과]

설계 자연 도출 — [단위.sd-wiki-lint 스킬], [단위.원격 위키 CLI] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| orphans | `[OPEN]` | [OPEN] | 끊긴 고아 진단. 항목 스키마는 산출물에 없음. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:20) |
| brokenLinks | `[OPEN]` | [OPEN] | 끊긴 cross-link 진단. 항목 스키마는 산출물에 없음. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:20) |
| treeStats.rootCount | `number` | [OPEN] | 루트 수 통계. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:21) |
| treeStats.hubChildCounts | `[OPEN]` | [OPEN] | hub 별 자식 수 통계. 항목 스키마는 산출물에 없음. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:21) |
| unlinkedTopics | `[OPEN]` | [OPEN] | 독립 지식이 많은 위키에서는 그 자체로 문제 아님. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:22) |
| lowViewPages | `[OPEN]` | [OPEN] | 전부 0 이면 노이즈로 무시, 편차가 있을 때 정리 후보 신호. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:23) |
| knowledgeGaps | `[OPEN]` | [OPEN] | 지식 공백 후보. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:24) |

제약: `lint` 결과는 위상 점검 입력이며, 모순·노후 등 의미 판정은 본문 전수 읽기로 별도 수행한다. (근거: plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md:12)

## 7. 외부 의존·인터페이스

### 7.1 [외부 의존.Claude 플러그인 런타임]

설계 자연 도출 — [단위.Hook 등록], [단위.SessionStart ROOT MAP 주입], [단위.SessionStart 규칙 주입], [단위.UserPromptSubmit 위키 반영 알림] 이 참조.

- 대상: Claude 플러그인 hook 실행 환경.
- 방향·성격: 이벤트 수신 및 command hook 실행, stdout 컨텍스트 주입.
- 경유: `.claude-plugin/plugin.json`, `hooks/hooks.json`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`.
- 자료 매핑:
  | 외부 입력/환경 | 산출물 사용 |
  | --- | --- |
  | `SessionStart` 이벤트 | ROOT MAP 주입과 규칙 주입 명령 실행. (근거: plugins/sd-wiki/hooks/hooks.json:3) |
  | `UserPromptSubmit` 이벤트 | 위키 반영 알림 명령 실행. (근거: plugins/sd-wiki/hooks/hooks.json:18) |
  | `CLAUDE_PLUGIN_ROOT` | hook 스크립트 경로, rules 디렉터리, scripts import 경로. (근거: plugins/sd-wiki/hooks/hooks.json:9, plugins/sd-wiki/hooks/session-start-rootmap.py:67, plugins/sd-wiki/hooks/session-start-rules.py:26) |
  | `CLAUDE_PLUGIN_DATA` | hook 전용 lock·로그·세션 상태 디렉터리. (근거: plugins/sd-wiki/hooks/wiki_login.py:31) |
- 예외 처리:
  - `CLAUDE_PLUGIN_ROOT` 누락 시 ROOT MAP hook 은 예외 후 fail-open, 규칙 hook 은 무주입 반환, worker 는 stderr 실패 후 lock 해제를 시도한다. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:68, plugins/sd-wiki/hooks/session-start-rules.py:23, plugins/sd-wiki/hooks/wiki_login.py:94)
  - Claude hook 런타임의 정확한 stdout 병합 순서와 hook 스키마 검증 방식은 산출물에서 확인되지 않는다. [OPEN]
- 관련 섹션: [단위.Hook 등록], [단위.SessionStart ROOT MAP 주입], [단위.SessionStart 규칙 주입], [단위.UserPromptSubmit 위키 반영 알림]

### 7.2 [외부 의존.원격 위키 서비스]

설계 자연 도출 — [단위.SessionStart ROOT MAP 주입], [단위.위키 공유 코어 인증·토큰], [단위.위키 공유 코어 서비스 호출·쓰기 충돌], [단위.원격 위키 CLI], [단위.sd-wiki-lint 스킬] 이 참조.

- 대상: Opus 기반 원격 위키 서버와 `AuthService`·`WikiService` HTTP API.
- 방향·성격: HTTPS POST 호출.
- 경유: 기본 `https://opus.simplysm.co.kr`, override 환경 변수 `SD_WIKI_LOGIN_URL`·`SD_WIKI_API_URL`, endpoint `/api/AuthService/refresh`, `/api/WikiService/<method>`.
- 자료 매핑:
  | 외부 API | 산출물 사용 |
  | --- | --- |
  | `AuthService.refresh` | 저장 토큰을 슬라이딩 갱신하고 새 token 을 받는다. (근거: plugins/sd-wiki/scripts/wiki_core.py:119, plugins/sd-wiki/scripts/wiki_core.py:122) |
  | `WikiService.rootMap` | SessionStart ROOT MAP 주입과 CLI `rootmap`. (근거: plugins/sd-wiki/hooks/session-start-rootmap.py:109, plugins/sd-wiki/scripts/wiki.py:108) |
  | `WikiService.read/search/toc/children/write/delete/move/lint` | CLI 명령 전체와 lint 스킬 입력. (근거: plugins/sd-wiki/scripts/wiki.py:101, plugins/sd-wiki/scripts/wiki.py:132) |
- 예외 처리:
  - Auth refresh 401 은 `WikiAuthExpired`, 기타 HTTP·URL 오류는 `WikiAuthError`. (근거: plugins/sd-wiki/scripts/wiki_core.py:135, plugins/sd-wiki/scripts/wiki_core.py:137)
  - WikiService 401 은 토큰 삭제 후 `WikiAuthExpired`, 기타 HTTP·URL 오류는 `WikiApiError`. (근거: plugins/sd-wiki/scripts/wiki_core.py:269, plugins/sd-wiki/scripts/wiki_core.py:275)
  - 원격 응답 JSON 스키마 전체는 산출물에 정의되어 있지 않아 일부 필드는 [OPEN] 으로 남는다.
- 관련 섹션: [단위.위키 공유 코어 인증·토큰], [단위.위키 공유 코어 서비스 호출·쓰기 충돌], [단위.원격 위키 CLI]

### 7.3 [외부 의존.로컬 토큰 파일]

설계 자연 도출 — [단위.위키 공유 코어 인증·토큰], [단위.원격 위키 CLI] 가 참조.

- 대상: 사용자 홈의 `.claude/sd/wiki-token.json`.
- 방향·성격: 로컬 파일 읽기·쓰기·삭제.
- 경유: Python `pathlib`, JSON 파일, 임시 파일 후 `os.replace`.
- 자료 매핑:
  | 파일 | 산출물 사용 |
  | --- | --- |
  | `~/.claude/sd/wiki-token.json` | [타입.토큰 저장 레코드] 저장·조회. (근거: plugins/sd-wiki/scripts/wiki_core.py:46, plugins/sd-wiki/scripts/wiki_core.py:54) |
- 예외 처리:
  - 파일 부재·OSError 읽기 오류·JSON decode 오류는 저장 토큰 없음으로 처리한다. 텍스트 디코딩 실패는 이 처리에 포함되지 않고 전파될 수 있다. (근거: plugins/sd-wiki/scripts/wiki_core.py:92, plugins/sd-wiki/scripts/wiki_core.py:97)
  - 삭제 시 파일 부재는 성공으로 본다. (근거: plugins/sd-wiki/scripts/wiki_core.py:110, plugins/sd-wiki/scripts/wiki_core.py:113)
- 관련 섹션: [단위.위키 공유 코어 인증·토큰]

### 7.4 [외부 의존.로컬 hook 상태 파일]

설계 자연 도출 — [단위.백그라운드 로그인·세션 스킵], [단위.SessionStart ROOT MAP 주입] 이 참조.

- 대상: `CLAUDE_PLUGIN_DATA` 또는 `~/.claude/sd` 아래 lock·로그 파일.
- 방향·성격: 로컬 파일 생성·존재 확인·삭제·로그 append.
- 경유: Python `os.open(... O_CREAT|O_EXCL ...)`, `subprocess.Popen`, 파일 write/read 존재 확인.
- 자료 매핑:
  | 파일 | 산출물 사용 |
  | --- | --- |
  | `wiki-session-no-context-<safe-session-id>.lock` | 해당 세션의 ROOT MAP 재주입 생략. 파일 본문은 현재 시각 문자열이다. (근거: plugins/sd-wiki/hooks/wiki_login.py:38, plugins/sd-wiki/hooks/wiki_login.py:43, plugins/sd-wiki/hooks/wiki_login.py:46) |
  | `wiki-login.lock` | 백그라운드 로그인 중복 실행 방지. 파일 본문은 시작 시각 정보다. (근거: plugins/sd-wiki/hooks/wiki_login.py:60, plugins/sd-wiki/hooks/wiki_login.py:64, plugins/sd-wiki/hooks/wiki_login.py:69) |
  | `wiki-login.log` | worker stderr 로그 저장. worker stdin 은 닫고 stdout 은 버린다. (근거: plugins/sd-wiki/hooks/wiki_login.py:61, plugins/sd-wiki/hooks/wiki_login.py:74, plugins/sd-wiki/hooks/wiki_login.py:77) |
- 예외 처리:
  - lock 생성 실패나 이미 존재하면 새 worker 를 시작하지 않는다. (근거: plugins/sd-wiki/hooks/wiki_login.py:64, plugins/sd-wiki/hooks/wiki_login.py:66)
  - worker 시작 실패 또는 종료 시 lock 삭제를 시도하되 삭제 실패는 무시한다. (근거: plugins/sd-wiki/hooks/wiki_login.py:82, plugins/sd-wiki/hooks/wiki_login.py:105)
- 관련 섹션: [단위.백그라운드 로그인·세션 스킵]

### 7.5 [외부 의존.브라우저·로컬 콜백]

설계 자연 도출 — [단위.위키 공유 코어 인증·토큰], [단위.백그라운드 로그인·세션 스킵] 이 참조.

- 대상: 사용자 기본 브라우저와 로컬 HTTP 콜백 서버.
- 방향·성격: 브라우저 열기, `127.0.0.1` 임시 포트에서 token/state 수신.
- 경유: Python `webbrowser.open`, `HTTPServer(("127.0.0.1", 0), ...)`, login URL query `redirect_uri`·`state`.
- 자료 매핑:
  | 외부 값 | 산출물 사용 |
  | --- | --- |
  | callback `token` | 저장할 인증 토큰. (근거: plugins/sd-wiki/scripts/wiki_core.py:149, plugins/sd-wiki/scripts/wiki_core.py:208) |
  | callback `state` | CSRF 방지 검증 값. (근거: plugins/sd-wiki/scripts/wiki_core.py:150, plugins/sd-wiki/scripts/wiki_core.py:204) |
- 예외 처리:
  - 콜백이 아닌 요청은 404 로 응답하고 대기를 계속한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:153, plugins/sd-wiki/scripts/wiki_core.py:155)
  - 브라우저 자동 실행 실패는 무시하며, 성공 여부와 관계없이 stderr 로 로그인 URL 을 안내한다. 정상 콜백을 받으면 인증 완료 HTML 을 응답한다. (근거: plugins/sd-wiki/scripts/wiki_core.py:188, plugins/sd-wiki/scripts/wiki_core.py:192, plugins/sd-wiki/scripts/wiki_core.py:160)
  - timeout 초과와 state 불일치는 `WikiAuthError`. (근거: plugins/sd-wiki/scripts/wiki_core.py:198, plugins/sd-wiki/scripts/wiki_core.py:205)
- 관련 섹션: [단위.위키 공유 코어 인증·토큰]

### 7.6 [외부 의존.로컬 규칙 파일]

설계 자연 도출 — [단위.SessionStart 규칙 주입], [단위.위키 작성·활용 규칙 문서] 가 참조.

- 대상: `${CLAUDE_PLUGIN_ROOT}/rules/*.md`.
- 방향·성격: 로컬 마크다운 읽기.
- 경유: Python `Path.glob("*.md")`, UTF-8 `read_text`.
- 자료 매핑:
  | 파일 | 산출물 사용 |
  | --- | --- |
  | `rules/wiki.md` | 세션 컨텍스트에 주입되는 위키 권위 규칙. (근거: plugins/sd-wiki/hooks/session-start-rules.py:26, plugins/sd-wiki/rules/wiki.md:1) |
- 예외 처리: 읽기 실패 등은 hook main 에서 흡수되어 무주입 성공 종료한다. (근거: plugins/sd-wiki/hooks/session-start-rules.py:34, plugins/sd-wiki/hooks/session-start-rules.py:37)
- 관련 섹션: [단위.SessionStart 규칙 주입]

### 7.7 [외부 의존.로컬 본문 파일]

설계 자연 도출 — [단위.원격 위키 CLI] 가 참조.

- 대상: CLI `write --body-file` 로 지정한 로컬 파일 및 stdin.
- 방향·성격: 로컬 파일 읽기 또는 표준입력 읽기.
- 경유: Python `Path(...).read_text(encoding="utf-8")`, `sys.stdin.read()`.
- 자료 매핑:
  | 입력 | 산출물 사용 |
  | --- | --- |
  | `--body-file` | 페이지 본문 문자열로 읽어 [타입.페이지 쓰기 입력].body 에 넣는다. (근거: plugins/sd-wiki/scripts/wiki.py:46, plugins/sd-wiki/scripts/wiki.py:48) |
  | stdin | TTY 가 아닐 때 페이지 본문으로 읽는다. (근거: plugins/sd-wiki/scripts/wiki.py:51) |
- 예외 처리:
  - 파일 시스템 읽기 실패(OSError)는 `WikiApiError` 로 변환한다. 텍스트 디코딩 실패는 이 변환에 포함되지 않고 전파될 수 있다. (근거: plugins/sd-wiki/scripts/wiki.py:48, plugins/sd-wiki/scripts/wiki.py:49)
  - `--body`, `--body-file`, stdin 어느 것도 없으면 `WikiApiError` 로 실패한다. (근거: plugins/sd-wiki/scripts/wiki.py:53)
- 관련 섹션: [단위.원격 위키 CLI]

## 8. 본문 외 확정 사항

- 2026-06-28: Bun TypeScript 전환 검토 결과, 지정 Python 산출물 6개는 전부 변환 가능하므로 “하나라도 변환 불능이면 전환하지 않음” 조건의 변환 금지 사유는 확인되지 않았다.
  - 근거: `plugins/sd-wiki/scripts/wiki.py` 는 CLI 인자·stdin·본문 파일·JSON stdout·stderr 오류·종료코드 구분만 사용하고, `plugins/sd-wiki/scripts/wiki_core.py` 는 토큰 파일·HTTP POST·로컬 콜백 서버·브라우저 실행·낙관락 충돌 처리를 사용한다. 이 범위는 Bun TypeScript 와 Node 호환 API 로 대응 가능하다.
  - 근거: `plugins/sd-wiki/hooks/wiki_login.py` 는 lock 파일·로그 파일·detached worker 프로세스·세션 skip-lock 만 사용하고, `plugins/sd-wiki/hooks/user-prompt-submit.py`, `plugins/sd-wiki/hooks/session-start-rules.py`, `plugins/sd-wiki/hooks/session-start-rootmap.py` 는 stdout 주입·파일 읽기·stdin JSON·공유 코어 호출·fail-open 흐름으로 구성되어 Bun TypeScript 에서 재현 가능하다.
  - 근거: 동일 저장소의 `plugins/sd/hooks/hooks.json` 은 `bun "${CLAUDE_PLUGIN_ROOT}/hooks/*.ts"` 형태의 Claude plugin hook 실행 계약을 이미 사용한다.
  - 동반 변경: 실제 전환 시 `plugins/sd-wiki/hooks/hooks.json`, `plugins/sd-wiki/rules/wiki.md`, `plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md` 의 `python ...*.py` 실행 계약을 `bun ...*.ts` 실행 계약으로 함께 바꿔야 한다.
  - 경계: 기존 `python "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.py"` 실행 문자열을 유지해야 한다는 별도 조건이 생기면 순수 Bun TypeScript 전환과 충돌하므로 재검토한다.

- 2026-06-28: sd-wiki 실행 산출물을 Python 에서 Bun TypeScript 로 순수 전환한다.
  - 근거: 사용자가 순수 전환 방식(기존 `.py` 삭제, `.ts` 대체, 실행 계약 갱신)을 선택했다.
  - 적용 범위: `plugins/sd-wiki/scripts/wiki.ts`, `plugins/sd-wiki/scripts/wiki_core.ts`, `plugins/sd-wiki/hooks/wiki_login.ts`, `plugins/sd-wiki/hooks/user-prompt-submit.ts`, `plugins/sd-wiki/hooks/session-start-rules.ts`, `plugins/sd-wiki/hooks/session-start-rootmap.ts`, `plugins/sd-wiki/hooks/hooks.json`, `plugins/sd-wiki/rules/wiki.md`, `plugins/sd-wiki/skills/sd-wiki-lint/SKILL.md`.
  - 검증 기준: TypeScript noEmit 검사, Bun build, CLI 정상 JSON 출력, 쓰기 충돌 종료코드 3, SessionStart ROOT MAP 주입, SessionStart 규칙 주입, UserPromptSubmit 문구 출력.

- 2026-06-28 [제외]: `__pycache__/*.pyc` 파일은 분석 대상 산출물에서 제외한다.
  - 근거: 동일 디렉터리에 원본 Python 소스가 존재했고, `__pycache__` 파일은 Python 실행 산출물로 소스 계약을 추가 정의하지 않는다.
  - 후속 처리: 전환 후 spec 은 `.ts`·`.json`·`.md` 원본 산출물을 기준으로 유지한다.
  - 자료 위치: `plugins/sd-wiki/hooks/__pycache__/`, `plugins/sd-wiki/scripts/__pycache__/`
