# sd-wiki 재설계 — LLM 위키 확장성 (재귀 트리 + 서버 파생 ROOT MAP)

> 이 문서 하나만으로 **빈(cold) 세션이 한 Phase를 끝까지 수행**할 수 있게 작성됨.
> 한 세션 = 한 Phase. 시작 전 아래 [작업 규약]·[확정 설계]·[현재 코드 지점]을 읽고, 해당 Phase의 `선행`이 끝났는지 확인 후 진행.
> `OPEN` 표시 항목은 미확정 — 임의로 정하지 말고 해당 Phase에서 사용자에게 질문해 확정.

---

## 작업 규약 (모든 Phase 공통)

**두 리포지토리에 걸침:**

| 역할 | 경로 |
| --- | --- |
| 플러그인(CLI·훅·규칙) | `D:\workspaces-14\simplysm` (이 리포) — `plugins/sd-wiki/` |
| 서버·DB·사람용 UI | `D:\workspaces-14\simplysm-opus` |

**opus 기반 spec 동기화** (`simplysm-opus`를 수정하는 Phase = P1·P2·P6 에서 필수):

- opus 코드를 바꾸는 Phase에서는 `simplysm-opus/.specs/260609155814_opus-기반/spec.md`(opus 기반 설계 문서, 위키 포함)의 **위키 관련 부분(데이터 모델·서비스·화면)도 같은 세션에서 함께 갱신**해 코드와 일치시킴. 해당 Phase 시작 시 그 spec의 위키 섹션을 열어 확인 후 반영.

**검증 명령** (각 리포 루트에서):

- `pnpm check --fix` — typecheck + lint (자동수정). `npx tsc`/`npx eslint` 직접 호출은 훅 차단됨.
- `pnpm test` — vitest.
- **dev 서버·상시 프로세스 직접 실행 금지** (`pnpm dev`/`dev@db-server`/`watch` 등) — 포트 충돌. 빌드·체크·테스트 같은 단발 명령만. 화면 동작 확인이 필요하면 사용자에게 실행 요청.
- Edit/Write/Bash pre-tool 훅 존재. 차단 시 우회 말고 원인 해결.

**DB 사실** (opus `sd.config.ts` 확인):

- ORM MAIN = postgres, DB `SIMPLYSM_OPUS`, 격리수준 `READ_UNCOMMITTED`.
- `pnpm dev` → `host: localhost` (로컬 개발 DB). `pnpm dev@db-server` → `host: simplysm.co.kr` (원격 운영 DB).
- 운영 위키 데이터는 원격 DB에 있음(플러그인은 `opus.simplysm.co.kr` 서버 경유).
- **DB 스키마 적용은 사용자가 직접 수행** — 에이전트는 코드(Table 정의)만 수정하고, 로컬·원격 **어느 DB에도 스키마를 반영하지 않음**(마이그레이션·sync 명령 실행 금지). 코드 정의가 끝나면 사용자가 DB에 적용.

---

## 배경·목표 (WHY)

- **현행 문제**: `WikiService.toc`가 전체 페이지의 `(topic,title,summary)`를 반환하고, `session-start.py`가 이를 매 세션 컨텍스트에 통째 주입 → 주입량이 페이지 수에 **비례(O(n))**. 일정 크기(~1만자) 초과 시 truncation + context rot(컨텍스트 길수록 회상 저하)로 목차·지식 누락.
- **목표 불변식**: **세션 자동 주입량 = O(1)** (전체 지식 규모와 무관하게 일정).

---

## 확정 설계 (LOCKED)

**아키텍처 척추**: full-TOC 자동 주입 폐기 → 세션엔 bounded **ROOT MAP**만 주입 + `root → hub → leaf` **온디맨드 pull**(JIT/페이징 모델).

**구조 = 재귀 트리(forest), 서버 파생 관계형**:

- 모든 페이지가 균일 노드. `hub`(자식 있음)/`leaf`(자식 없음)는 **파생** — 종류 컬럼 불필요.
- 스키마 델타: `WikiPage`에 **`parentId`(nullable, 자기참조 FK → `WikiPage.id`) 1개만** 추가. 기존 컬럼 불변.
- **ROOT MAP** = `parentId IS NULL`인 최상위 노드들. **hub 뷰** = 그 노드의 직속 자식들. 둘 다 **서버가 쿼리로 생성**(저장된 인덱스 아님 → drift·동시편집 hotspot 구조적 소멸).
- **정체성/분류 분리**: leaf `topic` **불변**. 재분류 = `parentId` 1행 `update`(원자적). 키 rename·멀티페이지 편집 없음.
- write API는 에이전트가 topic 공간에서 동작하므로 **`parentTopic`**(부모 topic 문자열)을 받아 서버가 `parentId`로 resolve. 루트 노드는 `parentTopic` 생략.
- 교차 주제(여러 hub에 걸침)는 body의 **cross-link**(다른 topic 언급)로 처리 — 다중부모 DAG 불채택.

**근거(요약)**: 컨텍스트는 한정 자원이며 길수록 회상 저하(context rot, 다수 프런티어 모델 보편). 업계 정설 = 전부 사전 적재 대신 가벼운 식별자 유지 + 온디맨드 pull(JIT). 서버를 소유하므로 계층을 LLM 텍스트가 아닌 관계형으로 두어 서버가 인덱스를 파생 → drift·hotspot 제거.

---

## 현재 코드 지점 (확인된 사실)

| 대상 | 경로 |
| --- | --- |
| 스키마 정의 | `simplysm-opus/packages/common/src/db-main/tables/wiki/wiki-page.ts` |
| DbContext 등록 | `simplysm-opus/packages/common/src/db-main/main.db-context.ts` (`wikiPage = this.queryable(WikiPage)`) |
| 서비스 | `simplysm-opus/packages/server/src/services/wiki.service.ts` (`read`/`write`/`search`/`toc`) |
| 사람용 UI | `simplysm-opus/packages/client-admin/src/app/home/wiki/wiki-page/{wiki-page.view.ts, wiki-page.detail.ts}`, `.../client-admin/src/routes.ts` (같은 DB를 ORM으로 직접 접근, 서비스 미경유) |
| CLI 래퍼 | `simplysm/plugins/sd-wiki/scripts/wiki.py` |
| 주입 훅 | `simplysm/plugins/sd-wiki/hooks/session-start.py` (`_fetch_remote_wiki_text` → `wiki.call_service("toc", ...)`, `_format_remote_wiki_toc`) |
| 규칙 문서 | `simplysm/plugins/sd-wiki/rules/wiki.md` |
| CLI 테스트 | `simplysm/plugins/sd-wiki/tests/{test_wiki.py, test_session_start.py}` |

**현재 `WikiPage` 컬럼**: `id`(bigint PK), `topic`(varchar100, unique), `title`(varchar200), `summary`(varchar500), `body`(text), `version`(int). 계층 컬럼 없음.

**ORM 패턴 참고** (그대로 따를 것):

- nullable 컬럼: `c.bigint().nullable()`
- FK: `.relations((r) => ({ taxInvoice: r.foreignKey(["taxInvoiceId"], () => TaxInvoice) }))` — 예: `tax-invoice-line.ts`
- 역방향: `r.foreignKeyTarget(() => Child, "relationName")` — 예: `partner.ts`

---

## Phase별 작업

### Phase 1 — 스키마: `parentId` 추가  · 선행: 없음

- **대상**: `wiki-page.ts`
- **변경**:
  - `columns`에 `parentId: c.bigint().nullable()` 추가.
  - `.relations((r) => ({ parent: r.foreignKey(["parentId"], () => WikiPage), children: r.foreignKeyTarget(() => WikiPage, "parent") }))` 추가(자기참조).
- **DB 반영 금지**: 에이전트는 코드 정의(`wiki-page.ts`)만 수정. 실제 postgres에 스키마를 적용하는 것은 **사용자가 직접** 함 — 로컬·원격 어느 DB에도 반영하지 말 것.
- **완료기준**: `pnpm check` 통과. `parentId`가 nullable이라 기존 행·기존 `wikiPage` 쿼리 무영향.
- **검증**: `pnpm check`(코드 한정). DB 반영·런타임 동작 검증은 사용자 몫.
- **opus spec 동기화**: `simplysm-opus/.specs/260609155814_opus-기반/spec.md`의 위키 **데이터 모델** 부분을 `parentId`(자기참조) 추가에 맞춰 갱신.

### Phase 2 — 서버: 트리 메서드 + write `parentTopic`  · 선행: P1

- **대상**: `wiki.service.ts` (+ 필요 시 `IWiki*` 인터페이스)
- **변경**:
  - `write` 입력에 `parentTopic?: string` 추가 → 서버가 그 topic으로 부모 행 조회해 `parentId` 설정. **부모가 없으면 throw**(silent skip 금지). `parentTopic` 생략 = 루트.
  - 신규 `rootMap()`: `parentId IS NULL` 노드의 라우팅 항목 반환.
  - 신규 `children(parentTopic)`: 해당 노드의 직속 자식 라우팅 항목 반환.
  - `toc`는 유지하되 "전체 평면(온디맨드 fallback)"으로 주석화. 자동 주입에서 떼는 것은 Phase 4.
  - **OPEN**: 반환 항목에 `hasChildren`(자식 유무) 포함 여부 — 네비게이션 힌트로 유용. 이 Phase에서 사용자와 확정.
- **완료기준**: `pnpm check` 통과. 서버 측 wiki 테스트가 있으면 갱신·추가.
- **검증**: `pnpm test`(wiki 관련).
- **opus spec 동기화**: 위 `spec.md`의 위키 **서비스/API** 부분을 신규 메서드(`rootMap`/`children`)·`parentTopic`에 맞춰 갱신.

### Phase 3 — CLI: 네비게이션 명령  · 선행: P2

- **대상**: `wiki.py`
- **변경**: `rootmap`, `children <topic>` 명령 추가. `write`에 `--parent <topic>` 추가. argparse·JSON 출력은 기존 명령 패턴 그대로.
- **완료기준**: `test_wiki.py` 갱신·통과.

### Phase 4 — 주입 훅: `toc` → `rootMap`  · 선행: P2

- **대상**: `session-start.py` (`_fetch_remote_wiki_text`, `_format_remote_wiki_toc`)
- **변경**: `call_service("toc")` → `call_service("rootMap")`. 포맷터를 ROOT MAP(최상위 노드 라우팅 목록)으로. 기존 청킹/`--part` 슬롯/경고 로직은 유지.
- **OPEN**: 주입 깊이(최상위만 vs +1단계까지)·토큰 상한 — 이 Phase에서 확정.
- **완료기준**: `test_session_start.py` 갱신·통과.

### Phase 5 — 규칙 재작성  · 선행: P2

- **대상**: `rules/wiki.md`
- **변경**: 트리 모델 반영 — 네비게이션 규약(root → `children` → `read`로 페이징), write 시 부모 지정·중복 `search` 선행·재분류=`parentTopic` 변경. LLM 문서 작성 규칙(얇게·표준용어·산문 명사형 종결) 준수.
- **OPEN**: 분할/머지 트리거 임계값(노드 자식 수 N 초과 시 sub-hub 분할 등) — 검증된 규칙 없으므로 이 Phase에서 사용자와 정함.

### Phase 6 — 사람용 UI 트리 반영  · 선행: P1

- **대상**: `client-admin` wiki 화면.
- **변경**: 먼저 현 화면 구조(`wiki-page.view.ts`/`detail.ts`/`routes.ts`)를 읽고 패턴 파악 후, `parentId` 기반 트리 표시·편집 반영.
- **완료기준**: `pnpm check` 통과. 화면 동작은 사용자에게 실행·확인 요청(직접 dev 서버 실행 금지).
- **opus spec 동기화**: 위 `spec.md`의 위키 **화면** 부분을 트리 표시·편집 UI에 맞춰 갱신.

### Phase 7 — 데이터 마이그레이션  · **사용자 직접 수행 (에이전트 작업 아님)**

- 기존 flat 페이지를 트리에 편입(hub 노드 생성 + 기존 leaf 부모 지정)하는 작업은 **사용자가 DB 마이그레이션 후 직접 수행**. 에이전트는 진행하지 않음.

---

## OPEN 결정 (해당 Phase에서 확정, 임의 진행 금지)

- 검색 방식: keyword(현행) 유지 vs 시맨틱/임베딩 — 기본값 "유지".
- `rootMap`/`children` 반환에 `hasChildren` 포함 (P2) — [확정: 포함].
- ROOT MAP 주입 깊이·토큰 상한 (P4).
- 분할/머지 트리거 임계값 (P5).

---

## 진행 상태

- [x] P1 — 스키마(`parentId`)
- [x] P2 — 서버(트리 메서드 + write `parentTopic`)
- [x] P3 — CLI(네비게이션 명령)
- [x] P4 — 주입 훅(`toc`→`rootMap`)
- [x] P5 — 규칙 재작성
- [x] P6 — 사람용 UI
- (사용자 직접 수행) P7 — 데이터 마이그레이션
