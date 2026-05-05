# Eval: sd-demo

## 행동 Eval

### 시나리오 1: 신규 데모 생성 (생성 모드, 전체)

- 사전 조건:
  - workspace에 `.tasks/order/wbs.md`가 다음 내용으로 사전 배치된다:

    ````markdown
    # WBS: 발주 관리 시스템

    ## 프로젝트 개요

    - **배경:** 구매 담당자의 발주 입력 효율화
    - **환경:** packages/order-app (Angular 21)
    - **전제조건:** 없음
    - **기술적 제약:** 없음

    ## Impact Mapping

    - **Goal:** 발주 처리 효율화
      - **Actor:** 구매 담당자
        - **Impact:** 발주 입력 시간 단축
          - **Deliverable:** 발주 입력 화면

    ## USM Backbone

    ### Activity 1. 발주 입력

    #### [ ] Task 1.1 발주 입력 — 기본

    **의존성:** 없음

    **경계:**

    - 승인 워크플로 제외

    **근거:**

    - Impact Mapping Deliverable: "발주 입력 화면"

    **Stories:**

    ##### Story 1.1.1 품목 행 추가

    - 담당자가 품목명·수량·단가를 입력하여 발주 행을 추가한다. (근거: 요구사항)

    ##### Story 1.1.2 합계 자동 계산

    - 담당자가 수량 또는 단가를 입력하면 행별 합계와 전체 합계가 자동 계산된다. (근거: 요구사항)

    ##### Story 1.1.3 품목 검색

    - 담당자가 품목명 일부로 기존 품목 목록을 필터링하여 검색한다. (근거: 요구사항)

    ## 의존성 매트릭스

    | Task | 의존 대상 |
    | ---- | --------- |
    | 1.1  | 없음      |

    ## 수행 순서

    1단계
      - Task 1.1: 발주 입력 — 기본
    ````

  - workspace에 `packages/order-app/src/` 빈 디렉토리가 존재한다.

- 입력: "/sd-demo .tasks/order/wbs.md"

- 성공 행동:
  - [ ] `packages/order-app/src/` 하위에 발주 입력 화면 컴포넌트 파일이 생성된다
  - [ ] 생성된 컴포넌트 안에 박힌 값(품목 목록·수량·단가 등 더미 데이터)이 컴포넌트 파일 내부에 직접 선언되어 있다
  - [ ] 컴포넌트가 외부 store·service·별도 fixture 파일·mock 모듈을 import하지 않는다
  - [ ] 합계 자동 계산이 컴포넌트 내부 로직(템플릿 바인딩 또는 메서드)으로 동작 가능하게 작성되어 있다 (Story 1.1.2 반영)
  - [ ] 품목 검색이 컴포넌트 내부 상태·필터링 로직으로 동작 가능하게 작성되어 있다 (Story 1.1.3 반영)
  - [ ] 라우팅 또는 메뉴 등록이 적절한 위치에 추가되어 화면 진입이 가능하다
  - [ ] `.tasks/order/wbs.md` 파일이 수정되지 않는다 (생성 모드)

- 보조 assertion:
  - [ ] 생성된 컴포넌트 파일이 `packages/order-app/src/` 하위 경로에 존재한다
  - [ ] `.tasks/order/demo/` 같은 격리 폴더에 데모 코드가 생성되지 않는다

- Judge rubric:
  - PASS: `packages/order-app/src/` 하위에 데모 컴포넌트 파일이 생성되고, 박힌 값이 컴포넌트 내부에 직접 선언되며, 외부 store/service/fixture import가 없고, Story 1.1.2/1.1.3에 명시된 인터랙션이 컴포넌트 내부 로직으로 작성됨. wbs.md 파일은 변경되지 않음.
  - FAIL: 격리 폴더(`.tasks/order/demo/`)에 생성, 외부 store/service/별도 fixture import 존재, 정적 마크업만 있어 인터랙션 로직 부재, 박힌 값이 외부 파일에 분리됨, wbs.md가 수정됨.

### 시나리오 2: 차이 동기화 (--sync 모드)

- 사전 조건:
  - workspace에 `.tasks/order/wbs.md`가 시나리오 1과 동일한 내용으로 사전 배치된다.
  - workspace에 `packages/order-app/src/pages/order-page.component.ts`가 사용자가 데모를 수정한 결과(품목별 "비고" 컬럼 추가)로 사전 배치된다:

    ````typescript
    import { Component, signal } from "@angular/core";

    interface OrderItem {
      name: string;
      qty: number;
      price: number;
      note: string;
    }

    @Component({
      selector: "app-order-page",
      template: `
        <input [(ngModel)]="keyword" placeholder="품목 검색" />
        <table>
          <tr>
            <th>품목</th>
            <th>수량</th>
            <th>단가</th>
            <th>비고</th>
            <th>합계</th>
          </tr>
          @for (it of filtered(); track it.name) {
            <tr>
              <td>{{ it.name }}</td>
              <td><input type="number" [(ngModel)]="it.qty" /></td>
              <td><input type="number" [(ngModel)]="it.price" /></td>
              <td><input [(ngModel)]="it.note" /></td>
              <td>{{ it.qty * it.price }}</td>
            </tr>
          }
        </table>
      `,
    })
    export class OrderPageComponent {
      keyword = signal("");
      items = signal<OrderItem[]>([
        { name: "사과", qty: 5, price: 1000, note: "신선" },
        { name: "배", qty: 3, price: 2000, note: "대형" },
      ]);
      filtered() {
        return this.items().filter((it) => it.name.includes(this.keyword()));
      }
    }
    ````

- 입력: "/sd-demo .tasks/order/wbs.md --sync"

- 성공 행동:
  - [ ] 데모 코드와 wbs.md 차이를 분석하여 "비고" 컬럼/입력이 wbs.md에 누락되어 있다는 차이를 보고한다
  - [ ] 차이 항목에 sd-clarify 분류(`VERIFIED`/`INFERRED-High`/`INFERRED-Medium`/`INFERRED-Low`/`ASSUMED` 중 하나)를 적용한 결과가 보고에 포함된다
  - [ ] 자동 갱신 가능 항목 또는 사용자 답변으로 결정된 항목이 `.tasks/order/wbs.md`에 반영된다
  - [ ] 갱신 후 `.tasks/order/wbs.md` 본문에 "비고" 또는 등가 표현이 신규 Story 또는 기존 Story 확장 형태로 추가된다
  - [ ] 갱신 시 기존 Story 1.1.1, 1.1.2, 1.1.3의 항목별 근거(`(근거: ...)`)와 체크박스 상태가 보존된다

- 보조 assertion:
  - [ ] 변경 보고에 자동 반영된 차이 / 사용자 답변으로 결정된 차이 / 보류된 차이가 구분되어 출력된다
  - [ ] `packages/order-app/src/pages/order-page.component.ts` 파일이 임의로 수정되지 않는다 (--sync는 wbs.md만 수정)

- Judge rubric:
  - PASS: 데모 코드의 "비고" 추가가 차이로 보고되고, sd-clarify 분류가 적용되며, wbs.md가 갱신되거나 사용자 답변으로 결정됨. 기존 Story 보존. 데모 코드 파일은 임의 수정되지 않음.
  - FAIL: 차이 분석을 수행하지 않음, sd-clarify 분류 적용 흔적 없음, wbs.md 갱신 시 기존 Story·근거 손실, 비고 추가가 무시됨, 데모 코드 파일이 임의로 변경됨.

## 안티패턴 Eval

모든 시나리오에 공통으로 적용된다.

- [ ] 외부 store/service/fixture 의존 금지 — 생성된 데모 컴포넌트가 store·service·별도 fixture 파일·mock 모듈을 import하지 않는다 (모든 박힌 값은 컴포넌트 내부 선언)
- [ ] 격리 폴더 생성 금지 — `.tasks/{topic}/demo/` 같은 격리 폴더에 데모 코드가 생성되지 않는다 (본 위치 `packages/{app}/src/`만 사용)
- [ ] 정적 마크업만 생성 금지 — 컴포넌트가 마크업 + 박힌 값만 가지고 있고 wbs.md Story에 명시된 인터랙션 로직(검색·필터·합계 계산 등)이 작성되지 않는 형태로 종료되지 않는다
- [ ] sd-tdd/sd-plan 흐름 변경 안내 금지 — sd-demo 출력 안내에 sd-plan·sd-tdd의 입력 형식·실행 흐름을 변경하라는 지시가 등장하지 않는다
- [ ] 생성 모드에서 wbs.md 수정 금지 — 생성 모드(인자 없음 또는 Task 번호) 호출에서 입력 wbs.md가 수정되지 않는다
- [ ] --sync 모드에서 데모 코드 수정 금지 — `--sync` 호출에서 `packages/{app}/src/` 하위 데모 코드 파일이 어떤 이유로도 수정되지 않는다 (개선·미완성 보강·빌드 오류 수정 포함 일체 금지)
