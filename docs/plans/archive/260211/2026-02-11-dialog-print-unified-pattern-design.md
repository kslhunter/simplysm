# Dialog/Print/PDF 통일 패턴 디자인

## 배경

Angular에서 SolidJS로 마이그레이션하면서 Dialog의 프로그래매틱 API가 불완전하게 이전됨.

- Angular: `ISdModalInfo`에 `inputs` 필드로 props 전달 + `close.emit()`으로 결과 반환
- 현재 SolidJS Dialog: `Component` 타입만 받고 props 전달 불가, `props.close()` 콜백 방식
- 현재 SolidJS Print: `() => JSX.Element` 팩토리 + `data-print-ready` 속성 기반

## 설계 원칙

- **NiceModal 패턴 채택**: 팩토리 함수 + Context 기반 제어
- **Dialog/Print/PDF 패턴 통일**: 동일한 팩토리 + Context 구조
- **겸용 가능**: 모달 전용 / 일반 컴포넌트 / 겸용 모두 지원

## Dialog API

### useDialog()

```typescript
interface DialogShowOptions {
  title: string;
  hideHeader?: boolean;
  closable?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  resizable?: boolean;
  movable?: boolean;
  float?: boolean;
  fill?: boolean;
  widthPx?: number;
  heightPx?: number;
  minWidthPx?: number;
  minHeightPx?: number;
  position?: "bottom-right" | "top-right";
  headerStyle?: JSX.CSSProperties | string;
  canDeactivate?: () => boolean;
}

interface DialogContextValue {
  show<T>(factory: () => JSX.Element, options: DialogShowOptions): Promise<T | undefined>;
}
```

### useDialogInstance()

```typescript
interface DialogInstance<T> {
  close: (result?: T) => void;
}

// Dialog 밖에서 호출 시 undefined 반환 (겸용 지원)
function useDialogInstance<T>(): DialogInstance<T> | undefined;
```

### 사용 예시

```tsx
// 열기
const address = await useDialog().show<IAddress>(() => <AddressSearch defaultAddress="서울시..." />, {
  title: "주소 검색",
  widthPx: 500,
});

// AddressSearch 내부
const AddressSearch = (props: { defaultAddress?: string }) => {
  const dialog = useDialogInstance<IAddress>();

  return <button onClick={() => dialog?.close({ postNumber: "12345", address: "..." })}>선택</button>;
};
```

## Print/PDF API

### usePrint()

```typescript
interface PrintOptions {
  size?: string;
  margin?: string;
}

interface UsePrintReturn {
  toPrinter: (factory: () => JSX.Element, options?: PrintOptions) => Promise<void>;
  toPdf: (factory: () => JSX.Element, options?: PrintOptions) => Promise<Uint8Array>;
}
```

시그니처는 현재와 동일. 내부적으로 Context 제공 방식만 변경.

### usePrintInstance()

```typescript
interface PrintInstance {
  ready: () => void;
}

// Print 밖에서 호출 시 undefined 반환 (겸용 지원)
function usePrintInstance(): PrintInstance | undefined;
```

### 자동 ready 감지 로직

```
Provider 렌더링
  → factory() 실행
  → usePrintInstance() 호출됨?
    → Yes: ready() 호출까지 대기
    → No: 마운트 즉시 ready 처리
```

### 사용 예시

```tsx
// 간단한 경우: ready() 안 불러도 됨
const pdf = await usePrint().toPdf(() => <SimpleInvoice data={invoiceData} />, { size: "A4" });

// 비동기 로딩 경우
const AsyncInvoice = (props: { orderId: string }) => {
  const print = usePrintInstance();
  const [data, setData] = createSignal();

  onMount(async () => {
    const result = await fetchInvoice(props.orderId);
    setData(result);
    print?.ready();
  });

  return (
    <Show when={data()}>
      <div>...</div>
    </Show>
  );
};
```

## 겸용 컴포넌트 패턴

### Modal/일반 겸용

```tsx
interface UserSelectorProps {
  filter?: string;
  onSelect?: (user: IUser) => void;
}

const UserSelector = (props: UserSelectorProps) => {
  const dialog = useDialogInstance<IUser>();

  const handleSelect = (user: IUser) => {
    props.onSelect?.(user);
    dialog?.close(user);
  };

  return <UserList onItemClick={handleSelect} />;
};

// 모달로 사용
const user = await useDialog().show<IUser>(() => <UserSelector filter="admin" />, { title: "사용자 선택" });

// 일반 컴포넌트로 사용
<UserSelector filter="admin" onSelect={(user) => setSelectedUser(user)} />;
```

### Print 겸용

```tsx
const Invoice = (props: { data: InvoiceData }) => {
  const print = usePrintInstance();
  onMount(() => print?.ready());

  return <div>청구서 내용...</div>;
};

// PDF로 출력
const pdf = await usePrint().toPdf(() => <Invoice data={invoiceData} />);

// 화면에 표시
<Invoice data={invoiceData} />;
```

## 수정 대상

### 신규 파일

| 파일                                             | 설명                               |
| ------------------------------------------------ | ---------------------------------- |
| `components/disclosure/DialogInstanceContext.ts` | `useDialogInstance()` Context 정의 |
| `components/print/PrintInstanceContext.ts`       | `usePrintInstance()` Context 정의  |

### 수정 파일

| 파일                 | 변경 내용                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `DialogContext.ts`   | `show()` 시그니처 변경: `Component` → `() => JSX.Element`                                        |
| `DialogProvider.tsx` | `<Dynamic>` 제거 → `DialogInstanceContext.Provider` + `factory()` 실행                           |
| `usePrint.ts`        | `renderAndWait()` 내부에 `PrintInstanceContext.Provider` 추가, 속성 기반 → Context 기반으로 변경 |
| `Print.tsx`          | `data-print-root`, `data-print-ready` 속성 제거                                                  |
| `index.ts`           | `useDialogInstance`, `usePrintInstance` export 추가                                              |

### 삭제 대상

| 항목                               | 이유                       |
| ---------------------------------- | -------------------------- |
| `DialogContentProps<T>` 인터페이스 | Context로 대체             |
| `data-print-ready` 속성 감지 로직  | Context의 `ready()`로 대체 |
