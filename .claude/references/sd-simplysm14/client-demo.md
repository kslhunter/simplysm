# 클라이언트 데모 작성 매뉴얼

`@simplysm/angular` v14 로 spec.md §4.x 화면을 **데모** 로 옮길 때의 추가 처방. 컴포넌트 일반 규약(파일명·시그널·DI·핸들러·시트·폼·버튼·모달 호출·합성 패턴 등)은 [client-component.md](./client-component.md). 본 문서는 spec § → 산출물 매핑과 데모 한정 패턴만 다룬다.

## §4.x 화면 유형 → 파일 역할

| §4.x 패턴                                                | 파일 역할                                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 마스터(체크박스·`[E N]`·5버튼바) / 시트 단일             | `<domain>.list.ts`                                                                              |
| 단건 입력 폼                                             | `<domain>.detail.ts`                                                                            |
| 좌 목록 + 우 단건                                        | `<domain>.view.ts` + `.list.ts` + `.detail.ts`                                                  |
| 좌 헤더 목록 + 우(헤더 정보 + 라인 시트) 마스터-라인     | `<domain>.view.ts` + `.list.ts` + `.detail.ts` — 우 라인 영역은 `.detail.ts` (헤더 단건 + 라인) |
| 모달 (§동작에 `→ [화면.X] 을 모달로 띄움`)               | `<domain>.modal.ts`                                                                             |
| 프린트 양식                                              | `<domain>.print-template.ts`                                                                    |

`<domain>` = 화면명 dash-case 영문 음역 슬러그. 같은 도메인 폴더에 같은 역할이 2개 이상이면 `<domain>-<갈래>.<역할>.ts`.

## 와이어프레임 권위

§4.x 와이어프레임이 모든 시각 요소(버튼·필터·시트·탭·검색)의 **존재·영역·순서** 결정의 1순위. 표준 슬롯/기본 UI 와 충돌 시 와이어프레임에 맞춰 슬롯을 비우거나 컴포넌트 교체. 줄 수·픽셀 좌표는 권위 X (폼 inline 자동 wrap 등 표현 한계).

`sd-crud-list` 의 표준 출력(`(create)/(delete)/(restore)`) 이 와이어프레임의 명시 버튼 위치를 가린다면 표준 출력 채택을 포기하고 슬롯 안에 `sd-button` 으로 직접 배치.

## 항목표 `종류` → 입력 컨트롤

[client-component.md "표준 입력 컨트롤"](./client-component.md) 표 적용. spec 의 `종류` 가 표 외 표기면 가장 가까운 매핑 + `// sd-demo: 종류 매핑 임의 — 확인 필요` 마커.

## 도메인 데이터 (더미)

- 컴포넌트 파일 안에 `interface DemoXxx { ... }` 로 spec §7 필드명만 일치하게 선언. 위에 `// sd-demo: 더미 타입 — 구현 단계에서 @모델/X 로 교체` 마커.
- list 의 `items` / detail 의 `data` 는 이 인라인 타입으로 signal 선언.
- 더미 데이터 1~수건 인라인 + `// sd-demo: 더미 — 구현 단계에서 교체` 마커.

## 권한 path

spec 에 권한 path 명시 없으면 임의 추정 + 마커:

```ts
perms = injectPermsSignal(
  ["임의 권한 path"], // sd-demo: 권한 path 임의 — 확인 필요
  ["use", "edit"],
);
```

`restricted`/`readonly` 인라인 전달은 [client-component.md "권한 (perms)"](./client-component.md) 그대로.

## 액션 핸들러 (시뮬레이션 X)

데이터 변경 결과 반영 금지. 본문은 마커만:

```ts
async onSaveClick() {
  if (this.busyCount() > 0) return;
  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // sd-demo: 미구현 — 동작 자리
  });
  this.busyCount.update((v) => v - 1);
}
```

## 모달

호출 측 후처리도 마커:

```ts
const result = await this._sdModal.showAsync({ ... });
if (!result) return;
// sd-demo: 미구현 — 동작 자리
```

영역 한정 호출 (`→ [화면.Y] 의 <영역> — 선택 전용` 등) 은 모달 입력 시그널(`selectMode` 등)로 전달.

피호출 모달: `<sd-crud-detail>` 루트(`viewType='modal'` 자동 주입). 임의 `close` output 약속 만들지 X — `_sdModal.showAsync` 의 페이로드 회수 약속만 사용.

**동반 모달**: §동작에 `→ [화면.Y] 을 모달로 띄움` 으로 등장하는 모든 모달은 같은 호출에서 함께 생성. 이미 존재하면 재사용.

## 양식 매핑 (엑셀 업/다운로드)

§4.x 에 양식 매핑 표 있으면 `#toolTpl` 에 버튼만 (핸들러 본문은 마커):

```html
<ng-template #toolTpl>
  <sd-button [size]="'sm'" [theme]="'link-success'" (click)="onExcelUploadClick()">
    <ng-icon [svg]="tablerFileExcel" /> 엑셀 업로드
  </sd-button>
  <sd-button [size]="'sm'" [theme]="'link-primary'" (click)="onExcelDownloadClick()">
    <ng-icon [svg]="tablerDownload" /> 엑셀 다운로드
  </sd-button>
</ng-template>
```

## 상태별 와이어프레임

spec 이 `와이어프레임 (확정 전):` / `와이어프레임 (확정 후):` 로 분리하면:

```ts
// sd-demo: 더미 — 구현 단계에서 교체
state = signal<"draft" | "confirmed">("draft");
```

```html
@if (state() === "draft") {
  <!-- 확정 전 와이어프레임 반영 -->
} @else {
  <!-- 확정 후 와이어프레임 반영 -->
}
```

## "선택하세요." 빈 화면

list+detail 합성 view 의 빈 상태는 시연 시 눈에 띄게:

```html
<div
  class="flex-fill tx-theme-gray-default p-xxl"
  style="font-size: 48px; line-height: 1.5em"
>
  <ng-icon [svg]="tablerArrowLeft" />
  선택하세요.
</div>
```

[client-component.md "list + detail 합성"](./client-component.md) 의 단순 `<div class="flex-fill p-default">선택하세요.</div>` 를 본 사례로 대체.

## 라우팅·메뉴 답습

답습 화면 1개의 라우팅·메뉴 등록 위치·방식 그대로. 라우트 경로는 화면명 dash-case 영문 음역 슬러그 (기존 슬러그 규칙 일관 시 답습). 메뉴 라벨은 spec 의 화면명 그대로.
