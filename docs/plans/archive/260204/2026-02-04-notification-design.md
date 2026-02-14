# Notification System 설계

> Toast 대신 접근성을 고려한 Notification Center + Persist + Live Region 방식

## 배경

기존 Angular Toast의 접근성 문제:

- 자동 사라짐으로 인한 타이밍 문제 (WCAG 2.2.1 위반)
- 스크린 리더 미지원
- 키보드 접근 불가

## 사용자 스토리

### 일반 사용자

1. 파일 업로드 버튼 클릭
2. 다른 작업하러 페이지 이동
3. 업로드 실패 발생
4. 헤더의 🔔 아이콘에 빨간 뱃지 (1) 표시
   - 상단에 슬라이드 배너: "업로드 실패: file1.png" [확인] [닫기]
   - 배너는 사용자가 닫기 전까지 유지
5. 배너에서 [닫기] 클릭 → 배너 사라짐, 🔔에는 여전히 기록 남음
6. 나중에 🔔 클릭하면 지난 알림 히스토리 확인 가능

### 스크린 리더 사용자

1. 실패 발생 시 음성: "알림: 업로드 실패 file1.png"
2. 현재 작업 흐름은 끊기지 않음 (non-modal)
3. 원할 때 🔔으로 이동 → "알림 버튼, 1개의 새 알림"
4. Enter로 열면 알림 목록 탐색 가능

### 연속 알림 발생 시

- 배너는 최신 것으로 교체됨
- 🔔 뱃지 숫자 증가
- 스크린 리더는 각 알림을 순서대로 읽어줌
- 모든 알림은 🔔에서 히스토리로 확인 가능

## 컴포넌트 구조

```
NotificationProvider (Context + 전역 상태)
├── NotificationBanner (상단 슬라이드 배너)
│
└── NotificationBell (🔔 아이콘)
    └── Dropdown (기존)
        └── List (기존)
            └── ListItem (기존)
```

### 파일 구조

`packages/solid/src/components/notification/`

```
notification/
├── NotificationContext.ts     # Context, 타입 정의
├── NotificationProvider.tsx   # Provider + 상태 관리
├── NotificationBanner.tsx     # 상단 배너 (신규)
├── NotificationBell.tsx       # 🔔 + Dropdown/List/ListItem 조합
└── index.ts                   # export
```

### 사용 예시

```tsx
// App.tsx (최상위)
<NotificationProvider>
  <Header>
    <NotificationBell />
  </Header>
  <NotificationBanner />
  <Main>...</Main>
</NotificationProvider>
```

## API 설계

### 알림 발생시키기

```tsx
import { useNotification } from "@simplysm/solid";

function UploadButton() {
  const notification = useNotification();

  const handleUpload = async () => {
    try {
      await uploadFile(file);
      notification.success("업로드 완료", "file1.png 업로드 성공");
    } catch (e) {
      notification.danger("업로드 실패", e.message);
    }
  };

  return <Button onClick={handleUpload}>업로드</Button>;
}
```

### API 메서드

```tsx
const notification = useNotification();

// 기본 메서드 (theme, title, message)
notification.info("제목", "메시지");
notification.success("제목", "메시지");
notification.warning("제목", "메시지");
notification.danger("제목", "메시지");

// 옵션 포함
notification.success("제목", "메시지", {
  action: { label: "확인", onClick: () => navigate("/detail") },
});

// 알림 목록 접근 (🔔 구현용)
notification.items; // Accessor<NotificationItem[]>
notification.unreadCount; // Accessor<number>
notification.markAsRead(id);
notification.clear();
```

### 타입 정의

```tsx
interface NotificationItem {
  id: string;
  theme: "info" | "success" | "warning" | "danger";
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  createdAt: Date;
  read: boolean;
}

interface NotificationOptions {
  action?: { label: string; onClick: () => void };
}
```

## 상태 관리

### NotificationContextValue

```tsx
interface NotificationContextValue {
  // 상태
  items: Accessor<NotificationItem[]>;
  unreadCount: Accessor<number>;
  latestUnread: Accessor<NotificationItem | undefined>; // 배너용

  // 액션
  info: (title: string, message?: string, options?: NotificationOptions) => void;
  success: (title: string, message?: string, options?: NotificationOptions) => void;
  warning: (title: string, message?: string, options?: NotificationOptions) => void;
  danger: (title: string, message?: string, options?: NotificationOptions) => void;

  markAsRead: (id: string) => void;
  dismissBanner: () => void; // 배너만 닫기 (items에는 유지)
  clear: () => void; // 전체 삭제
}
```

### Provider 내부 상태

```tsx
const [items, setItems] = createSignal<NotificationItem[]>([]);
const [dismissedBannerId, setDismissedBannerId] = createSignal<string | null>(null);

// 파생 상태
const unreadCount = createMemo(() => items().filter((i) => !i.read).length);
const latestUnread = createMemo(() => {
  const latest = items()
    .filter((i) => !i.read)
    .at(-1);
  // 배너 닫기 했으면 표시 안 함
  return latest?.id === dismissedBannerId() ? undefined : latest;
});
```

### 알림 히스토리

- 메모리에만 저장 (페이지 새로고침 시 초기화)
- 최대 50개 유지, 초과 시 오래된 것부터 삭제

## 접근성 구현

### Live Region (스크린 리더 알림)

```tsx
// NotificationProvider 내부에 숨겨진 live region
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="visually-hidden" // 시각적으로 숨김, 스크린 리더는 읽음
>
  <Show when={latestUnread()}>{`알림: ${latestUnread()!.title} ${latestUnread()!.message ?? ""}`}</Show>
</div>
```

### NotificationBell (🔔 버튼)

```tsx
<button aria-label={`알림 ${unreadCount()}개`} aria-haspopup="true" aria-expanded={open()}>
  <Icon name="bell" />
  <Show when={unreadCount() > 0}>
    <span aria-hidden="true">{unreadCount()}</span>
  </Show>
</button>
```

### NotificationBanner

```tsx
<div role="alert">
  <span>{title}</span>
  <span>{message}</span>
  <button onClick={onAction}>{action.label}</button>
  <button aria-label="알림 닫기" onClick={onDismiss}>
    ✕
  </button>
</div>
```

### 키보드 지원

- `Escape`: Dropdown 닫기
- `Arrow Up/Down`: 알림 목록 탐색 (기존 List 컴포넌트 활용)
- 단축키(선택): `Alt+N`으로 🔔에 포커스 이동

## 스타일링 / 애니메이션

### NotificationBanner 위치 및 애니메이션

```css
/* 상단 고정, 헤더 아래 */
.notification-banner {
  position: fixed;
  top: var(--header-height, 3rem);
  left: 0;
  right: 0;
  z-index: 1000;

  /* 슬라이드 애니메이션 */
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* prefers-reduced-motion 존중 */
@media (prefers-reduced-motion: reduce) {
  .notification-banner {
    animation: none;
  }
}
```

### 테마별 색상

```css
.notification-banner[data-theme="info"] {
  background: var(--color-info);
}
.notification-banner[data-theme="success"] {
  background: var(--color-success);
}
.notification-banner[data-theme="warning"] {
  background: var(--color-warning);
}
.notification-banner[data-theme="danger"] {
  background: var(--color-danger);
}
```

### 모바일 대응 (520px 미만)

- 배너: 하단에서 슬라이드
- Dropdown: 전체 화면 모달로 전환

## 참고 자료

- [GitHub Primer - Accessible Notifications](https://primer.style/accessibility/patterns/accessible-notifications-and-messages/)
- [Replacing Toasts with Accessible User Feedback Patterns](https://dev.to/miasalazar/replacing-toasts-with-accessible-user-feedback-patterns-1p8l)
- [Defining Toast Messages - Adrian Roselli](https://adrianroselli.com/2020/01/defining-toast-messages.html)
