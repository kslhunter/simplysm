# OPUS Agent Wiki — 구현 TODO (전체 순서)

위키 시스템 구현을 **의존 순서대로** 나열. 수행 위치 구분:
- **[여기]** = 이 레포(simplysm) — 주로 `plugins/sd`. spec 에 없으므로 메모를 충실히 둠.
- **[opus]** = `simplysm-opus` — 상세는 spec(`D:/workspaces-14/simplysm-opus/.specs/260609155814_opus-기반/spec.md`). spec impl 단위는 **§4~6**(화면·자동처리·기반기능). §8 모델·§9 인터페이스는 §4~6 에 딸려옴(독립 항목 아님).

opus(2~5)가 먼저 있어야 plugins(6~8)가 붙는다.

---

## 1. [여기] service-server 인증 만료 인자 — [x] 완료

- [x] `signJwt` / `signAuthToken` 에 `expiresHours` 추가

메모:
- jose `setExpirationTime` 은 숫자를 절대시각(epoch)으로 해석 → `` `${expiresHours}h` `` 문자열로 발급. 기본 12h(기존 호환).
- 테스트: `packages/service-server/tests/jwt-manager.spec.ts`
- → opus(3번)가 이 인자로 발급처별 수명(웹 12h / 플러그인 7d)을 발급.

## 2. [opus] WikiService — spec §6.11 — [x] 완료

- [x] 목차조회 · read · write · 검색 메서드

핵심:
- `employee.service.ts` 패턴 (`defineService` + `getOrm` + `db.엔티티()` + `auth()`). service-server 가 HTTP 로 자동 노출.
- **쓰는 모델 = §8.21 지식페이지** (직원 FK, opus 동일 schema, topic 유니크, version, 본문 마크다운). 테이블 생성도 이 작업에 포함 — 모델은 독립 impl 단위 아님.
- 검색(§6.13) = 키워드 (simplysm ORM 이 tsvector 네이티브 없음 → 부분일치 `like` / raw query).
- 동시성(§6.12) = version 낙관락 (ORM optimistic 자동 없음 → version 컬럼 + 조건부 update 수동).
- 의존: 없음

## 3. [opus] 인증 확장 — spec §6.14 — [x] 완료

- [x] `buildAuthResult`/`login` 발급처별 수명·표식 + `refresh` 슬라이딩
- [x] authorization-code 흐름 (로그인 → localhost 콜백으로 토큰 전달)

핵심:
- 발급처(웹 12h / CLI 7d) 구분 → 토큰에 발급처 표식. `refresh` 가 그 표식으로 같은 수명 갱신. 표식 없는(구) 토큰은 웹(12h) 간주.
- `redirect_uri` 는 **localhost / 127.0.0.1 만 허용** (open redirect 차단).
- stateless — 토큰 서버 저장·취소 없음.
- 의존: 1(완료)

## 4. [opus] 로그인 화면 CLI 인증 모드 — spec §4.1 — [x] 완료

- [x] 브라우저 로그인 후 토큰을 콜백으로 전달

핵심:
- `redirect_uri` 가 있으면 CLI 인증 모드, 없으면 일반 웹 로그인.
- 의존: 3 (인증)

## 5. [opus] 위키 페이지 화면 + 권한 — spec §4.23 (§6.1 앱 구조)

- [ ] 위키 페이지 화면 (목록·검색·마크다운 열람·사람 검수)
- [ ] 앱 구조에 위키 카테고리·권한 추가 (§6.1 · §7.2 권한 코드)

핵심:
- 같은 DB·schema 라 client ORM 으로 직접 조회·편집 (REST 는 에이전트 CLI 전용).
- 지식 큐레이션(§6.15)의 사람 검수 창구. 검수 흐름 자체는 [OPEN].
- 의존: 2 (WikiService / 모델)

---
**↓ 여기부터 plugins/sd — 위 opus(2~5)가 있어야 실연동·테스트 가능**
---

## 6. [여기] 브라우저 로그인 콜백 · 토큰 저장 — [x] 완료 (dev 서버 E2E 검증)

- [x] localhost 콜백 서버 + 브라우저 열기 + 토큰 수신·저장

산출: `plugins/sd/scripts/wiki_auth.py` (인증 모듈 + CLI). 7·8 이 import.
- 함수: `browser_login`(127.0.0.1 단발 콜백 서버 + 브라우저 열기 + state 왕복검증 + 토큰 저장) / `refresh_token`(`POST /api/AuthService/refresh`, 401→`WikiAuthExpired`) / `get_token`(저장 토큰 refresh 슬라이딩 갱신 → 만료·없음이면 재로그인 or None) / `load·save·clear_token`.
- CLI: `login`(브라우저 로그인) · `token`(비차단 — 브라우저 안 띄우고 유효 토큰 stdout, 없으면 exit 1, 서버오류 exit 2) · `logout`.
- 접속(상수 + env override): `LOGIN_URL`=`https://opus.simplysm.co.kr/client-admin/#/login` (`SD_WIKI_LOGIN_URL`), `API_BASE`=`https://opus.simplysm.co.kr` (`SD_WIKI_API_URL`), `x-sd-client-name`=`sd-wiki`.
- 저장: `${CLAUDE_PLUGIN_DATA}/wiki-token.json` — **토큰만**(비밀번호는 브라우저에만).
- 해시 라우팅이라 `redirect_uri`·`state` 는 `#/login?...`(해시 뒤 쿼리) — opus `queryParamMap` 과 정합. opus 가 `redirect_uri` 를 localhost/127.0.0.1 로 제한하므로 콜백은 127.0.0.1 고정. 콜백 서버는 단발.
- 7 메모의 `POST /AuthService/<method>` 는 부정확 — 실제 라우트는 `/api/:service/:method` (`service-server.ts` L200). 7 작성 시 `/api/` 접두사 반영.
- 검증: 콜백 왕복·state CSRF 거부·favicon 부수요청 무시·저장/로드 로컬 통과. dev 서버 실연동 — `login`(plugin 토큰 발급)·`refresh` 슬라이딩 갱신·`get_token`·무효토큰 401→`WikiAuthExpired` 통과. 실제 브라우저 클릭 로그인→콜백→저장→`refresh` 재검증 E2E 통과.
- 의존: 3 · 4 (opus 인증 · 로그인 CLI 모드 — 완료)

## 7. [여기] 위키 CLI 래퍼 — [x] 완료 (코드·로컬검증)

- [x] read / write / search / 목차조회 명령 (`scripts/`)

메모:
- 산출: `plugins/sd/scripts/wiki.py` (원격 위키 CLI 래퍼). 6번의 `wiki_auth.py` 를 import 해 토큰을 가져온다.
- 명령: `read <topic>` / `write <topic> --title ... --summary ... (--body ... | --body-file ... | stdin) [--base-version N]` / `search <keyword>` / `toc`.
- opus `WikiService` 를 HTTP 호출 — `POST /api/WikiService/<method>`, 본문은 JSON 인자 배열. 헤더 `Authorization: Bearer <token>` + `x-sd-client-name`.
- 에이전트가 Bash 로 호출하는 얇은 래퍼. **MCP 아님**. stdout 은 서비스 응답 JSON.
- write 충돌(opus 가 거부) 시 최신 `read` 로 version 을 다시 받은 뒤 1회 재시도.
- 검증: `python -m unittest plugins.sd.tests.test_wiki`
- 의존: 2 (opus WikiService)

## 8. [여기] session-start.py 원격 전환 — [x] 완료 (코드·로컬검증)

- [x] 로컬 `~/.claude/wiki` read → 원격 목차 API fetch + 인증 분기

메모:
- 산출: `plugins/sd/hooks/session-start.py` 가 `wiki_auth.get_token(allow_browser=False)` 로 저장 토큰을 refresh 한 뒤 `WikiService.toc` 원격 목차를 stdout 주입용 마크다운으로 변환.
- 미인증·만료: 현재 세션은 위키 없이 진행하고, `wiki-login.lock` 으로 중복을 막은 뒤 백그라운드 작업자가 `wiki_auth.browser_login()` 을 실행. 같은 `session_id` 에서는 로그인 완료 후에도 다음 세션까지 위키 주입을 생략.
- **stdout 직접 출력 유지** — 위키 fetch·인증 실패·서버 무응답은 fail-open, 진단은 stdout 에 섞지 않음.
- 브라우저 불가(원격·SSH): 백그라운드 로그인 stderr 는 `${CLAUDE_PLUGIN_DATA}/wiki-login.log` 로 남김. 즉시 사용자 노출 정책은 [미정].
- 검증: `python -m unittest plugins.sd.tests.test_wiki plugins.sd.tests.test_session_start`
- 의존: 6 · 7

## 9. [여기] 위키 정책·안내 문서 갱신 (로컬 개인 위키 → 원격 공용 위키) — [x] 완료

- [x] 위키를 전제하는 정책·안내 문서 4건을 원격 공용 위키 기준으로 갱신

대상 파일:
- `rules/wiki.md` — 정책 재작성. "개인 지식 위키" → "원격 공용 위키", 로컬 파일 Read/Write·`<topic>.md`·`index.md` → 위키 CLI(7번 `wiki.py`) 경유 read/write/검색/목차로. "무엇을 담는가/안 담는가" 기준도 공용 관점으로 재검토.
- `hooks/user-prompt-submit.py` — "[위키] 반영" 리마인더 문구(20~24행)의 `~/.claude/wiki` → 원격 위키 기준으로.
- `README.md` — hooks 설명(L31)·"개인 지식 위키 → `~/.claude/wiki`"(L39) 갱신.
- `rules/_host-codex.md` — 위키 페이지 참조 경로(L15 `~/.claude/wiki/codex-cli-plugin-hooks.md`) 조정.

메모:
- 전부 플러그인 문서·훅 작업이라 opus spec 에 없음. 8번(`session-start.py`)은 목차 *주입* 만 원격 전환 — 9번은 위키 *정책·안내* 라 별개.
- 위키 관련 plugins/sd 파일 전수(9개) 점검 완료: session-start.py(8)·wiki.py·wiki_auth.py(6·7)·test_*·위 4건. 누락 없음.
- 호출 경로: `${CLAUDE_PLUGIN_ROOT}` 는 hook command 에서만 치환되고 에이전트의 일반 Bash/PowerShell 도구 셸엔 미노출(이 세션에서 둘 다 빈 값 확인). 그래서 wiki.md 는 정확한 실행 경로를 빼고 `read`/`write`/`search`/`toc` 명령 메커니즘만 기재. 동일 패턴을 쓰는 `skills/sd-unpack/SKILL.md` L12 의 `python "${CLAUDE_PLUGIN_ROOT}/.../unpack.py"` 호출도 같은 문제일 수 있어 별도 점검 필요.

## 10. [여기] 기존 로컬 위키 데이터 마이그레이션 (마지막 단계) — 의존: 1~9 전부

- [ ] 각 개발자 로컬 `~/.claude/wiki` 의 기존 페이지를 원격 공용 위키로 1회 이전

메모:
- **반드시 마지막** — opus(2~5) · plugins(6~8) · 정책 문서(9)가 모두 끝나 원격 위키가 정상 동작한 뒤에 실제 데이터를 옮긴다.
- 이전 수단: 위키 CLI(7번 `wiki.py write`)로 로컬 `index.md`·`<topic>.md` 들을 원격에 등록.
- 4명의 로컬 위키가 제각각이라 **통합·중복·충돌 처리 필요** — 누구 것을 기준으로 할지/합칠지·동명 페이지 충돌 해소 [OPEN].
- 이전 후 로컬 `~/.claude/wiki` 처리(폐기/보존) + `session-start` 가 더는 로컬을 안 읽는지 확인 [OPEN].
