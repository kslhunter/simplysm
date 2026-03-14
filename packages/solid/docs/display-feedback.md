# 디스플레이 & 피드백

## Card

그림자와 호버 효과가 있는 카드 컨테이너.

```tsx
import { Card } from "@simplysm/solid";

<Card>카드 내용</Card>
```

---

## Alert

의미론적 테마의 알림 배너.

```tsx
import { Alert } from "@simplysm/solid";

<Alert theme="success">저장되었습니다.</Alert>
<Alert theme="danger">오류가 발생했습니다.</Alert>
```

---

## Icon

Tabler Icons 래퍼.

```tsx
import { Icon } from "@simplysm/solid";
import { IconUser } from "@tabler/icons-solidjs";

<Icon icon={IconUser} size="1.5em" />
```

---

## Link / Tag

```tsx
import { Link, Tag } from "@simplysm/solid";

<Link href="/users">사용자 목록</Link>
<Tag>라벨</Tag>
```

---

## Barcode

바코드/QR 코드 생성.

```tsx
import { Barcode } from "@simplysm/solid";

<Barcode value="1234567890" />
```

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

| Prop | 타입 | 설명 |
|------|------|------|
| `open` | `boolean` | 열림 상태 |
| `onOpenChange` | `(v: boolean) => void` | 상태 콜백 |
| `mode` | `"float" \| "fill"` | 모드 |
| `resizable` | `boolean` | 리사이즈 가능 |
| `draggable` | `boolean` | 드래그 가능 |
| `width`, `height` | `string` | 크기 |
| `closeOnEscape` | `boolean` | ESC 닫기 |
| `beforeClose` | `() => boolean` | 닫기 확인 |

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

---

## Collapse

접기/펼치기 (아코디언).

```tsx
import { Collapse } from "@simplysm/solid";

<Collapse open={expanded()}>
  <div>접힌 내용</div>
</Collapse>
```

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
```

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
