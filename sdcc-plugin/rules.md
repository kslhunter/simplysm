# @simplysm 14 앱 공통 규칙

@simplysm 14 (angular·orm·service·core·excel·sd-cli·capacitor) 로 만드는 업무용 앱이 어느 repo 든 같아야 하는 규칙입니다. 사용자와 논의해 확정한 것만 있으며, 승인 없이 추가하지 않습니다. 각 라이브러리의 API·배선은 같은 플러그인의 `angular`·`orm`·`service`·`core`·`excel`·`sd-cli`·`capacitor` 스킬을 부르세요.

## 아키텍처

- 업무 로직의 기본 작성 위치는 클라이언트 패키지. 서버 패키지(`@simplysm/service-server` 기반)에는 두 경우만 둔다 — 클라이언트에 노출 불가한 자격증명·키·권한 우회 위험이 있는 처리, 브라우저·모바일 런타임에서 실행 불가능한 기능. ORM 호출·파일 변환·비즈니스 로직은 이 두 경우가 아니면 클라이언트에 직접 둔다. "서버에 두는 게 관행"이라는 이유로 이관하지 않는다.
- 앱 구조(메뉴·권한·모듈)는 common 패키지의 `AppStructureItem[]` 한 벌이 정본. 클라이언트마다 자기 배열만 정의해 import 하고 서버에는 등록하지 않는다.
  - 메뉴를 거치지 않고 직접 진입하는 화면(main, my-info)은 배열 맨 앞에 root leaf 로 `isNotMenu: true`, `perms` 없이 둔다.
  - 새 화면은 기존 화면 1개의 등록 방식을 본뜬다. `title` = 화면명, `code` = 화면명을 dash-case 영문으로 음역한 슬러그.
- 로그는 `@simplysm/core-common` 의 `createLogger(tag)` 인스턴스로만. `console.*` 직접 호출과 `eslint-disable no-console` 우회 금지 — CLI 도움말처럼 stdout 이 곧 사용자 출력 채널인 곳, consola 자체가 죽었을 수 있는 ErrorHandler 최후 catch 만 예외이고 그 줄 위에 사유를 1줄 적는다. 메시지에 `[패키지명]` 수동 prefix 금지(tag 가 그 역할).

## 화면 규칙

- 화면 파일명은 `<domain>.<역할>.ts`, 전부 dash-case. 역할: `view`(합성·분할 화면), `list`(목록, `sd-crud-list`), `detail`(단건, `sd-crud-detail`), `modal`(모달 전용 비-CRUD), `print-template`, `types`, 접미사 없음(재사용 컨트롤).
  - `.detail` 과 `.modal` 은 표시 방식이 아니라 본질로 가른다 — 한 레코드를 로드·저장하는 단건 화면이면 모달로 띄워도 `.detail`. `.modal` 은 모달로만 뜨는 도구·검색·설정 UI.
  - 도메인 있는 파일은 도메인 폴더, 범용 파일은 `src/<역할>s/`. 같은 역할이 한 폴더에 둘 이상이면 `<domain>-<갈래>.<역할>.ts`.
- 컴포넌트 데코레이터: `changeDetection: OnPush`, `encapsulation: ViewEncapsulation.None`, `standalone: true`, 인라인 `template`. selector 는 앱 `app-`, 라이브러리 `sd-`. `styles` 를 쓰면 첫 줄 `/* language=SCSS */`, 내부 클래스는 `_` prefix.
- `inject()` 한 의존은 `private readonly _xxx`. 시그널·input·output·공개 메서드는 prefix 없음.
- 와이어프레임이 시각 요소(버튼·필터·시트·탭·검색)의 존재·영역·순서 1순위. 표준 슬롯이나 기본 UI 와 충돌하면 슬롯을 비우거나 컴포넌트를 교체한다. 줄 수·픽셀 좌표는 기준이 아니다.
- 시트 셀 본문 div 는 `p-xs-sm`. 숫자 셀은 `tx-right` + `| number` 기본. 그 외 정렬 클래스(`tx-*`)와 컬럼·영역 px 폭은 사용자가 명시 지시한 경우만 — px 폭은 근거를 바로 위 주석으로 남긴다(주석 없는 px 폭은 비-합의). "라벨은 가운데" 같은 자동 휴리스틱 금지.
- 버튼 `theme`·`size`: 데이터를 통으로 바꾸는 최상위 액션(저장·삭제·생성) = 일반 시리즈(`primary`/`danger`/…), 그 옆 유틸(양식 다운로드·인쇄) = `link-*`, 시트 위·셀 안 나열 = `link-*` + `sm`.
- 아이콘은 `@ng-icons/tabler-icons` 로 통일. 레이아웃·배치는 flex 유틸 클래스(`flex-row`/`flex-column`/`fill`/`flex-fill`/`flex-min`/`gap-*`/`p-*`) 우선, 자체 styles 는 최후 수단.
- 목록+상세 합성의 미선택 빈 상태는 `tablerArrowLeft` 아이콘 + 무엇을 고르는지 드러내는 문구("역할을 선택하세요.") 구조로 통일한다.
- 편집 가능한 detail 은 미저장 변경 가드 필수 — 페이지 이탈과 마스터 전환 양쪽. 화면 이탈이 아닌 마스터 전환(좌측 목록 클릭)만 막는 걸 빠뜨리면 편집이 경고 없이 사라진다.
- 엑셀 다운로드는 페이징을 무시한 현재 검색·필터 결과 전체. 파일명 `<화면제목>_<yyMMdd>.xlsx`. 양식 컬럼 = 화면 표시 컬럼 + `삭제`(참/거짓) + `수정일시`·`수정자`, 참조 마스터는 명칭으로 출력.
- 엑셀 업로드는 다운로드와 같은 zod 스키마(`ExcelWrapper`)를 공유하고 `edit` 권한일 때만 노출. 0건 파일은 throw. 참조 마스터는 명칭→ID 역변환하되 미매칭은 throw(일부만 건너뛰지 않음). 기존 행의 비즈니스키(명칭) 변경은 행 밀림 사고일 수 있어 변경 건수를 입력받아 확인한다. 저장은 한 트랜잭션으로 일괄(하나라도 실패하면 전체 롤백).

## 데이터 규칙

- 컬럼은 NOT NULL 기본. `.nullable()` 은 도메인상 값이 없을 수 있을 때만(선택 입력, 미발생 이벤트 시각, 선택적 FK), `.default()` 는 사용자가 명시 지시한 경우만. "초기값 애매", "마이그레이션 중간 단계"는 근거가 아니다 — 호출자가 값을 넣게 하거나 backfill 후 NOT NULL 로.
- 삭제 전략: 기초정보(마스터)는 soft delete(`isDeleted`)로 FK 무결성 보존. 프로세스 문서(트랜잭션)는 물리 delete 로 상세 행까지 캐스케이드하되, 다른 테이블이 FK 로 참조 중이면 삭제를 차단하고 사유를 toast 로 안내.
  - 삭제는 `confirm` 후, 복구는 `confirm` 없이. 복구 경로에서는 활성 유니크 재검증 필수 — 단건은 복구 전 `exists` 선검증, 벌크는 update 후 한 쿼리로 후검증하고 충돌 시 throw 로 전체 롤백.
- 유니크 전략: 명칭·코드는 활성(`isDeleted=false`) 유니크 — DB 유니크 제약을 두지 말고 앱 검증(`where(컬럼, isDeleted=false, id≠self).exists()`)으로, DB 에는 검증 성능용 `(컬럼, isDeleted)` 비유니크 인덱스만. 이유: 엑셀·외부 업로드가 코드·명칭으로 기존 레코드에 매핑되므로 삭제값이 재사용돼야 한다. 자격증명(loginId 등)은 완전 유니크 — DB 유니크 인덱스 + 앱 선검증(메시지용) 병행.
- 변경 이력: 데이터 변경과 같은 트랜잭션 안에서 변경한 모델의 queryable 로 `insertDataLog`. "최종 수정자/일시", "최초 등록자/일시"는 별도 컬럼을 두지 말고 `joinLastDataLog`/`joinFirstDataLog` 로 표시 — 시트에서는 `[hidden]="true"` 기본, 엑셀 다운로드에는 항상 포함. `action` 문자열(`등록`/`수정`/`삭제`/`복구`/`초기화`)은 프로젝트 단위로 고정. 마스터 CRUD 후에는 공유데이터 `emitAsync` 통지를 빠뜨리지 않는다(트랜잭션 커밋 뒤).
- 조회는 단일 쿼리 우선 — 연관 데이터는 `joinSingle`/`include` 로 한 쿼리에 모은다. `execute()` 결과를 코드에서 필터·정렬·중복 제거·집계·페이징하지 않는다(ORM 절로). 예외는 페이징 없이 전건을 이미 화면에 들고 있는 목록의 요약 행 합산뿐이며, 페이징 목록의 요약은 `orderBy`·`limit` 전 쿼리로 따로 집계한다. 이종 엔티티 합치기는 코드 merge 가 아니라 `Queryable.union`. ORM 으로 표현 불가하면 작성 전에 사용자에게 보고하고 멈춘다.
