# 클라이언트 데모 작성 매뉴얼

`@simplysm/angular` v14 로 spec.md 의 화면 정의 섹션(4번 섹션) 을 **데모** 로 옮길 때의 추가 지침. 컴포넌트 일반 규약(파일명·시그널·DI(의존성 주입)·핸들러·시트·폼·버튼·모달 호출·합성 패턴 등) 은 [client-component.md](./client-component.md) 를 따름. 본 문서는 spec 섹션과 산출물의 매핑 및 데모 한정 패턴만 다룸.

## 화면 정의 섹션(4번 섹션) 의 화면 유형별 파일 역할

| 화면 유형 패턴                                           | 파일 역할                                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 마스터(체크박스·`[E N]`·5버튼바) / 시트 단일             | `<domain>.list.ts`                                                                              |
| 단건 입력 폼                                             | `<domain>.detail.ts`                                                                            |
| 좌 목록 + 우 단건                                        | `<domain>.view.ts` + `.list.ts` + `.detail.ts`                                                  |
| 좌 헤더 목록 + 우(헤더 정보 + 라인 시트) 마스터-라인     | `<domain>.view.ts` + `.list.ts` + `.detail.ts` — 우 라인 영역은 `.detail.ts` (헤더 단건 + 라인) |
| 모달 전용 비-CRUD 화면 (도구·검색·설정 등)               | `<domain>.modal.ts`                                                                             |
| 프린트 양식                                              | `<domain>.print-template.ts`                                                                    |

`<domain>` 은 화면명을 dash-case 영문으로 음역한 슬러그. 같은 도메인 폴더에 같은 역할의 파일이 2개 이상이면 `<domain>-<갈래>.<역할>.ts` 형식 사용.

동작 섹션의 `→ [화면.X] 을 모달로 띄움` 표기는 표시 방식일 뿐 파일 역할이 아님. 화면.X 가 단건 편집이면 `.detail.ts` 를 `showAsync` 로 띄우고(= 위 "단건 입력 폼" 행), 모달 전용 비-CRUD UI 일 때만 `.modal.ts`. 판별 기준은 [client-component.md "detail 과 modal 구분"](./client-component.md) 참조.

## 와이어프레임 기준

화면 정의 섹션(4번 섹션) 의 와이어프레임이 모든 시각 요소(버튼·필터·시트·탭·검색) 의 **존재·영역·순서** 결정의 1순위. 표준 슬롯이나 기본 UI(사용자 인터페이스) 와 충돌하면 와이어프레임에 맞춰 슬롯을 비우거나 컴포넌트를 교체. 줄 수·픽셀 좌표는 기준이 아님 (폼 inline 자동 wrap 등의 표현 한계 때문).

`sd-crud-list` 의 표준 출력(`(create)/(delete)/(restore)`) 이 와이어프레임에 명시된 버튼 위치를 가린다면 표준 출력 사용을 포기하고 슬롯 안에 `sd-button` 으로 직접 배치.

## 항목표의 `종류` 컬럼을 입력 컨트롤로 매핑

[client-component.md "표준 입력 컨트롤"](./client-component.md) 의 매핑 표를 적용. spec 의 `종류` 값이 매핑 표에 없는 표기이면 가장 가까운 매핑을 적용하고 `// sd-demo: 종류 매핑 임의 — 확인 필요` 마커를 부착.

## 도메인 데이터 (더미)

- 컴포넌트 파일 안에 `interface DemoXxx { ... }` 형태로, spec 의 데이터 모델 섹션(7번 섹션) 필드명과 일치하게 선언. 인터페이스 위에 `// sd-demo: 더미 타입 — 구현 단계에서 @모델/X 로 교체` 마커를 부착.
- list 의 `items` 와 detail 의 `data` 는 이 인라인 타입으로 signal 선언.
- 더미 데이터 1건 이상을 인라인으로 두고 `// sd-demo: 더미 — 구현 단계에서 교체` 마커를 부착.

## 권한 path

spec 에 권한 path 가 명시되지 않으면 임의 추정값을 사용하고 마커를 부착:

```ts
perms = injectPermsSignal(
  ["임의 권한 path"], // sd-demo: 권한 path 임의 — 확인 필요
  ["use", "edit"],
);
```

`restricted`/`readonly` 인라인 전달 방식은 [client-component.md "권한 (perms)"](./client-component.md) 의 규약을 그대로 따름.

## 액션 핸들러 (시뮬레이션 금지)

데이터 변경 결과를 화면에 반영하지 말 것. 핸들러 본문은 마커만 둘 것:

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

호출 측 후처리도 마커만 둘 것:

```ts
const result = await this._sdModal.showAsync({ ... });
if (!result) return;
// sd-demo: 미구현 — 동작 자리
```

영역 한정 호출(`→ [화면.Y] 의 <영역> — 선택 전용` 등) 은 모달의 입력 시그널(`selectMode` 등) 로 전달. spec 마커 매핑: "선택 전용"·multiselect 는 `selectMode`(`single`/`multi`) 로, "편집 가능 여부" 는 `readonly` 로 따로 전달. "선택 전용" 은 선택 목적을 뜻할 뿐 편집을 막지 않으므로(readonly 아님), 편집까지 차단하려면 `readonly=true` 를 함께 줄 것.

단건 편집을 모달로 띄우는 경우 피호출 화면은 `.detail.ts`(`<sd-crud-detail>` 루트, `viewType='modal'` 자동 주입)이며 모달 표시용 별도 `.modal.ts` 를 만들지 않음. 모달 전용 비-CRUD 화면(`.modal.ts`)은 `sd-crud-detail` 대신 `sd-busy-container` 등으로 자체 구성. 어느 경우든 임의 `close` output 규약을 만들지 말 것 — `_sdModal.showAsync` 의 페이로드 반환 규약만 사용.

**동반 모달**: 동작 섹션에 `→ [화면.Y] 을 모달로 띄움` 으로 등장하는 모든 모달은 같은 호출에서 함께 생성. 이미 존재하면 재사용.

## 양식 매핑 (엑셀 업로드·다운로드)

화면 정의 섹션(4번 섹션) 에 양식 매핑 표가 있으면 `#toolTpl` 에 버튼만 배치 (핸들러 본문은 마커만):

```html
<ng-template #toolTpl>
  <sd-button [size]="'sm'" [theme]="'link-success'" (click)="onExcelUploadClick()">
    <ng-icon [svg]="tablerFileExcel" /> 엑셀 업로드
  </sd-button>
  <sd-button [size]="'sm'" [theme]="'link-success'" (click)="onExcelDownloadClick()">
    <ng-icon [svg]="tablerDownload" /> 엑셀 다운로드
  </sd-button>
</ng-template>
```

## 상태별 와이어프레임

spec 에서 와이어프레임이 `와이어프레임 (확정 전):` 과 `와이어프레임 (확정 후):` 로 분리되어 있으면 다음과 같이 처리:

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

list 와 detail 의 합성 view 에서 항목 미선택 빈 상태는 [client-component.md "list + detail 합성"](./client-component.md) 의 빈 상태 규약(`p-xxl` + `font-size: 48px` + `tablerArrowLeft` 아이콘) 을 그대로 따름.

## 라우팅·메뉴 따라가기

기존 화면 1개의 라우팅·메뉴 등록 위치·방식을 그대로 따름. 라우트 경로는 화면명을 dash-case 영문으로 음역한 슬러그 사용 (프로젝트의 기존 슬러그 규칙이 일관되어 있다면 그 규칙을 따름). 메뉴 라벨은 spec 의 화면명을 그대로 사용.
