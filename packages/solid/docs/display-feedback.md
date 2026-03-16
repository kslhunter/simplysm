# 디스플레이 & 피드백

## Card

그림자와 호버 효과가 있는 카드 컨테이너. 페이드 인 애니메이션 포함.

```tsx
import { Card } from "@simplysm/solid";

<Card>카드 내용</Card>
<Card class="p-4">커스텀 패딩</Card>
```

`<div>` HTML 속성을 모두 상속한다.

---

## Alert

의미론적 테마의 알림 배너.

```tsx
import { Alert } from "@simplysm/solid";

<Alert theme="success">저장되었습니다.</Alert>
<Alert theme="danger">오류가 발생했습니다.</Alert>
<Alert theme="warning">주의가 필요합니다.</Alert>
<Alert theme="info">참고 사항입니다.</Alert>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `theme` | `SemanticTheme` | `"base"` | 색상 테마 |

`<div>` HTML 속성을 모두 상속한다.

---

## Icon

Tabler Icons 래퍼.

```tsx
import { Icon } from "@simplysm/solid";
import { IconUser, IconSettings } from "@tabler/icons-solidjs";

<Icon icon={IconUser} size="1.5em" />
<Icon icon={IconSettings} size={24} />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `icon` | `Component<TablerIconProps>` | (필수) | Tabler 아이콘 컴포넌트 |
| `size` | `string \| number` | `"1.25em"` | 아이콘 크기 |

Tabler `IconProps`의 나머지 속성(`class`, `color` 등)을 모두 상속한다.

---

## Link

테마 색상의 링크 컴포넌트.

```tsx
import { Link } from "@simplysm/solid";

<Link href="/users">사용자 목록</Link>
<Link theme="danger" onClick={handleDelete}>삭제</Link>
<Link disabled>비활성 링크</Link>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `theme` | `SemanticTheme` | `"primary"` | 색상 테마 |
| `disabled` | `boolean` | `false` | 비활성화 |

`<a>` HTML 속성을 모두 상속한다.

---

## Tag

테마 색상의 태그/배지.

```tsx
import { Tag } from "@simplysm/solid";

<Tag>기본</Tag>
<Tag theme="primary">Primary</Tag>
<Tag theme="success">완료</Tag>
<Tag theme="danger">긴급</Tag>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `theme` | `SemanticTheme` | `"base"` | 색상 테마 |

`<span>` HTML 속성을 모두 상속한다.

---

## Barcode

바코드/QR 코드 생성 (bwip-js 기반).

```tsx
import { Barcode } from "@simplysm/solid";

<Barcode type="qrcode" value="https://example.com" />
<Barcode type="code128" value="1234567890" />
<Barcode type="ean13" value="4006381333931" />
```

| Prop | 타입 | 설명 |
|------|------|------|
| `type` | `BarcodeType` | 바코드 타입 (필수). `"qrcode"`, `"code128"`, `"ean13"` 등 100+ 타입 |
| `value` | `string` | 바코드 값 |

`<div>` HTML 속성을 모두 상속한다.

---

## Echarts

ECharts 차트 래퍼. 자동 리사이즈, 로딩 상태 지원. `echarts` peer dependency 필요.

```tsx
import { Echarts } from "@simplysm/solid";

<Echarts
  option={{
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed"] },
    yAxis: { type: "value" },
    series: [{ data: [120, 200, 150], type: "bar" }],
  }}
  busy={loading()}
/>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `option` | `EChartsOption` | ECharts 옵션 (필수) |
| `busy` | `boolean` | 로딩 상태 (`showLoading`/`hideLoading`) |

`<div>` HTML 속성을 모두 상속한다. 내부적으로 SVG 렌더러를 사용하며, 컨테이너 크기 변경 시 자동 리사이즈한다.

---

## Dialog

모달/플로팅 다이얼로그. 리사이즈, 드래그, z-index 자동 관리.

```tsx
import { Dialog } from "@simplysm/solid";

<Dialog open={isOpen()} onOpenChange={setIsOpen} width="600px" resizable draggable>
  <Dialog.Header>제목</Dialog.Header>
  <div>내용</div>
  <Dialog.Action>
    <Button onClick={() => setIsOpen(false)}>닫기</Button>
  </Dialog.Action>
</Dialog>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `open` | `boolean` | | 열림 상태 |
| `onOpenChange` | `(v: boolean) => void` | | 상태 콜백 |
| `mode` | `"float" \| "fill"` | `"float"` | 모드 |
| `resizable` | `boolean` | `false` | 리사이즈 가능 |
| `draggable` | `boolean` | `false` | 드래그 가능 |
| `width` | `string` | | 너비 |
| `height` | `string` | | 높이 |
| `closeOnEscape` | `boolean` | `true` | ESC 닫기 |
| `beforeClose` | `() => boolean` | | 닫기 전 확인 (false 반환 시 취소) |

### 서브 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `Dialog.Header` | 다이얼로그 헤더 (닫기 버튼 포함) |
| `Dialog.Action` | 하단 액션 영역 |

### 프로그래밍 방식 다이얼로그

```tsx
const dialog = useDialog();

const result = await dialog.show(MyComponent, { data: "value" }, {
  header: "제목",
  width: "500px",
  resizable: true,
});
```

---

## Dropdown

팝업 메뉴/드롭다운.

```tsx
import { Dropdown } from "@simplysm/solid";

<Dropdown>
  <Dropdown.Trigger>
    <Button>메뉴</Button>
  </Dropdown.Trigger>
  <Dropdown.Content>
    <div>메뉴 항목 1</div>
    <div>메뉴 항목 2</div>
  </Dropdown.Content>
</Dropdown>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `open` | `boolean` | | 열림 상태 |
| `onOpenChange` | `(v: boolean) => void` | | 상태 콜백 |
| `position` | `{ x: number; y: number }` | | 절대 위치 (컨텍스트 메뉴용) |
| `maxHeight` | `number` | `300` | 최대 높이 (px) |
| `disabled` | `boolean` | `false` | 비활성화 |
| `keyboardNav` | `boolean` | `false` | 키보드 네비게이션 (Select 등에서 사용) |

### 서브 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `Dropdown.Trigger` | 드롭다운 트리거 |
| `Dropdown.Content` | 드롭다운 콘텐츠 |

---

## Collapse

접기/펼치기 (아코디언).

```tsx
import { Collapse } from "@simplysm/solid";

<Button aria-expanded={expanded()} onClick={() => setExpanded(!expanded())}>
  토글
</Button>
<Collapse open={expanded()}>
  <div>접힌 내용</div>
</Collapse>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `open` | `boolean` | `false` | 열림 상태 |

`<div>` HTML 속성을 모두 상속한다. 높이 애니메이션이 자동 적용된다.

---

## Tabs

탭 전환.

```tsx
import { Tabs } from "@simplysm/solid";

<Tabs value={tab()} onValueChange={setTab}>
  <Tabs.Tab value="info">정보</Tabs.Tab>
  <Tabs.Tab value="settings">설정</Tabs.Tab>
</Tabs>
```

| Prop (Tabs) | 타입 | 설명 |
|------------|------|------|
| `value` | `string` | 선택된 탭 값 |
| `onValueChange` | `(v: string) => void` | 변경 콜백 |
| `size` | `ComponentSize` | 크기 |

| Prop (Tabs.Tab) | 타입 | 설명 |
|-----------------|------|------|
| `value` | `string` | 탭 식별 값 |
| `disabled` | `boolean` | 비활성화 |

---

## Notification

알림 시스템. `NotificationProvider`로 감싸고 `useNotification()` 훅으로 사용.

```tsx
import { NotificationProvider, useNotification, NotificationBell, NotificationBanner } from "@simplysm/solid";

// 프로바이더 설정
<NotificationProvider>
  <NotificationBanner />
  <NotificationBell />
  <App />
</NotificationProvider>

// 사용
const noti = useNotification();

noti.success("저장 완료", "데이터가 성공적으로 저장되었습니다.");
noti.danger("오류", "서버 연결에 실패했습니다.");
noti.info("안내", "새 버전이 있습니다.");
noti.warning("경고", "저장되지 않은 변경사항이 있습니다.");

// 에러 자동 처리
noti.error(err, "작업 실패");

// 업데이트
const id = noti.info("업로드 중...");
noti.update(id, { message: "업로드 완료!" });

// 액션 버튼 포함 알림
noti.info("업데이트 가능", "새 버전이 있습니다.", {
  action: {
    label: "새로고침",
    onClick: () => window.location.reload(),
  },
});

// 읽음 처리
noti.markAsRead(id);
noti.markAllAsRead();
noti.clear();
```

---

## Busy

로딩 오버레이. 중첩 호출 지원.

```tsx
import { BusyProvider, useBusy, BusyContainer } from "@simplysm/solid";

<BusyProvider variant="spinner">
  <App />
</BusyProvider>

const busy = useBusy();

busy.show("로딩 중...");
// ... 작업 ...
busy.hide();

// 프로그레스 바
busy.show("업로드 중...");
busy.setProgress(50); // 50%
busy.setProgress(100);
busy.hide();
```

### BusyContainer

로컬 영역에 로딩 오버레이를 표시한다.

```tsx
<BusyContainer busy={isLoading()} variant="bar">
  <div>컨텐츠</div>
</BusyContainer>
```

---

## Progress

프로그레스 바.

```tsx
import { Progress } from "@simplysm/solid";

<Progress value={progress()} />
<Progress value={75} theme="success" />

// 커스텀 콘텐츠
<Progress value={50} theme="primary" size="lg">
  <span>50% 완료</span>
</Progress>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `number` | (필수) | 진행률 (0-100) |
| `theme` | `SemanticTheme` | `"primary"` | 색상 테마 |
| `size` | `ComponentSize` | `"md"` | 크기 |
| `inset` | `boolean` | `false` | 테두리 없음 |

`<div>` HTML 속성을 모두 상속한다. children이 있으면 퍼센트 텍스트 대신 커스텀 콘텐츠를 표시한다.

---

## Print

인쇄 기능. `PrintProvider`로 감싸고 `usePrint()` 훅으로 사용.

```tsx
import { PrintProvider, usePrint } from "@simplysm/solid";

<PrintProvider>
  <App />
</PrintProvider>

const print = usePrint();
// print 호출로 인쇄 다이얼로그 표시
```
