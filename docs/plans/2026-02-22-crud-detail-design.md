# CrudDetail 컴포넌트 설계

## 목표

단건 CRUD 데이터 화면의 반복 boilerplate를 제거하는 컴포넌트.
**하나의 Detail 컴포넌트를 작성하면 page/modal/control 모든 모드에서 동작**한다.

**설계 원칙:**
- CrudSheet과 일관된 패턴 (createControllableStore, sub-component, opt-in)
- 모드 자동 감지 (page/modal/control)
- 쉬운 기본 + 가능한 커스텀

## API 개요

```tsx
<CrudDetail<UserData>
  // 필수
  load={async () => ({
    data: await api.getUser(userId),
    info: { isNew: false, isDeleted: false, lastModifiedAt, lastModifiedBy: "관리자" },
  })}

  // 기능 opt-in
  submit={async (data) => { await api.saveUser(data); return true; }}
  toggleDelete={async (del) => { await api.toggleDelete(id, del); return true; }}
  canEdit={() => perms().edit}

  // Controllable data
  data={externalData}
  onDataChange={setExternalData}

  // Style
  class="..."
>
  {(ctx) => (
    <>
      <CrudDetail.Tools>
        <Button onClick={() => ctx.refresh()}>커스텀 버튼</Button>
      </CrudDetail.Tools>

      <CrudDetail.Before>
        <SubItemSheet dataId={ctx.data.id} />
      </CrudDetail.Before>

      <FormGroup>
        <FormGroup.Item label="이름">
          <TextInput value={ctx.data.name} onValueChange={v => ctx.setData("name", v)} />
        </FormGroup.Item>
      </FormGroup>

      <CrudDetail.After>
        <ChangeHistoryList dataId={ctx.data.id} />
      </CrudDetail.After>
    </>
  )}
</CrudDetail>
```

## Props 설계

### 필수

| Prop | 타입 | 설명 |
|------|------|------|
| `load` | `() => Promise<{ data: TData; info: CrudDetailInfo }>` | 데이터 + 메타정보 로드 |
| `children` | `(ctx: CrudDetailContext<TData>) => JSX.Element` | 폼 내용 render prop |

### 기능 opt-in

| Prop | 타입 | 설명 |
|------|------|------|
| `submit` | `(data: TData) => Promise<boolean \| undefined>` | 저장. truthy → 성공, undefined → 취소 |
| `toggleDelete` | `(del: boolean) => Promise<boolean \| undefined>` | 삭제/복구. 제공하면 버튼 자동 생성 |
| `canEdit` | `() => boolean` | 편집 권한. 기본값 `() => true` |

### Controllable data

| Prop | 타입 | 설명 |
|------|------|------|
| `data` | `TData` | 외부 store (생략 시 내부 관리) |
| `onDataChange` | `(data: TData) => void` | store 변경 콜백 |

`createControllableStore` 패턴 적용. CrudSheet의 `items`/`onItemsChange`와 동일.

### 스타일

| Prop | 타입 | 설명 |
|------|------|------|
| `class` | `string` | 루트 요소 클래스 |

## 타입 정의

```typescript
interface CrudDetailProps<TData extends object> {
  // 필수
  load: () => Promise<{ data: TData; info: CrudDetailInfo }>;
  children: (ctx: CrudDetailContext<TData>) => JSX.Element;

  // 기능 opt-in
  submit?: (data: TData) => Promise<boolean | undefined>;
  toggleDelete?: (del: boolean) => Promise<boolean | undefined>;
  canEdit?: () => boolean;

  // Controllable data
  data?: TData;
  onDataChange?: (data: TData) => void;

  // 스타일
  class?: string;
}

interface CrudDetailInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}

interface CrudDetailContext<TData> {
  data: TData;                       // store (reactive)
  setData: SetStoreFunction<TData>;
  info: () => CrudDetailInfo;
  busy: () => boolean;
  hasChanges: () => boolean;
  save: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

## Sub-components

CrudSheet과 동일한 패턴 (plain object 반환 + type guard).

| Sub-component | children 타입 | 설명 |
|---------------|---------------|------|
| `CrudDetail.Tools` | `JSX.Element` | toolbar에 커스텀 버튼 추가 |
| `CrudDetail.Before` | `JSX.Element` | form 바깥 위쪽 영역 |
| `CrudDetail.After` | `JSX.Element` | form 바깥 아래쪽 영역 |

**참고:** CrudSheet.Tools는 `(ctx) => JSX.Element` render prop이지만, CrudDetail.Tools는 **plain children**이다.
CrudDetail의 children 자체가 `(ctx) => ...` render prop이므로 ctx가 이미 closure에 있기 때문.

```typescript
interface CrudDetailToolsDef {
  __type: "crud-detail-tools";
  children: JSX.Element;
}

interface CrudDetailBeforeDef {
  __type: "crud-detail-before";
  children: JSX.Element;
}

interface CrudDetailAfterDef {
  __type: "crud-detail-after";
  children: JSX.Element;
}
```

## 모드 자동 감지

```typescript
const dialogInstance = useDialogInstance();
const topbarCtx = useContext(TopbarContext);

const isModal = dialogInstance !== undefined;
const isPage = !isModal && topbarCtx != null;
const isControl = !isModal && !isPage;
```

### 모드별 UI 차이

| 영역 | Page | Modal | Control |
|------|------|-------|---------|
| Topbar 액션 | 저장/새로고침 | 없음 | 없음 |
| Toolbar | 저장/새로고침/삭제 | 없음 | 저장/새로고침/삭제 |
| Dialog headerAction | 없음 | 새로고침 아이콘 | 없음 |
| Dialog 하단 | 없음 | 확인/삭제/복구 버튼 | 없음 |
| 저장 후 동작 | refresh | dialogInstance.close(result) | refresh |

## 내부 동작 흐름

```
1. 초기화
   data ← createControllableStore 패턴 (내부 store 또는 외부 store)
   info ← createSignal<CrudDetailInfo>()
   originalData ← undefined (snapshot용)
   모드 감지 (isModal / isPage / isControl)

2. 자동 로드 (onMount)
   → busy ON
   → load() 호출
   → data에 reconcile, originalData에 objClone (snapshot)
   → info 설정
   → busy OFF, ready = true

3. 새로고침 (Ctrl+Alt+L)
   → dirty check: hasChanges() && !confirm("변경사항을 무시하시겠습니까?")
   → busy ON → load() → snapshot → busy OFF

4. 저장 (Ctrl+S / form submit)
   → !isNew && !hasChanges() → "변경사항이 없습니다."
   → busy ON → submit(data)
   → 결과 truthy → 성공 토스트
     → modal: dialogInstance.close(result)
     → page/control: 자동 refresh
   → busy OFF

5. 삭제/복구
   → busy ON → toggleDelete(del)
   → 결과 truthy → 성공 토스트
     → modal: dialogInstance.close(result)
     → page/control: 자동 refresh
   → busy OFF

6. 변경감지
   hasChanges = () => !ObjectUtils.equal(data, originalData)
```

## 렌더링 구조

```
CrudDetail
  └── BusyContainer (ready, busy)
       ├── Toolbar (page/control 모드, canEdit일 때)
       │    ├── [자동] 저장 버튼 (submit 있을 때)
       │    ├── [자동] 새로고침 버튼
       │    ├── [자동] 삭제/복구 버튼 (toggleDelete 있을 때)
       │    └── CrudDetail.Tools (커스텀)
       │
       ├── CrudDetail.Before (form 바깥, 위)
       │
       ├── <form> (Ctrl+S → submit)
       │    └── children(ctx)에서 Tools/Before/After 제외한 나머지
       │
       ├── 최종수정일시 (info.lastModifiedAt/By)
       │
       ├── CrudDetail.After (form 바깥, 아래)
       │
       └── [Modal 모드] Dialog 하단 바
            ├── 삭제/복구 버튼 (toggleDelete 있을 때)
            └── 확인 버튼 (submit 있을 때)
```

## 사용 패턴

**하나의 Detail 컴포넌트를 작성하면 모든 모드에서 동작:**

```tsx
// UserDetail.tsx — 하나만 작성
function UserDetail(props: { userId?: number }) {
  return (
    <CrudDetail<UserData>
      load={async () => {
        if (props.userId == null) {
          return {
            data: { name: "", email: "" },
            info: { isNew: true, isDeleted: false },
          };
        }
        const result = await api.getUser(props.userId);
        return {
          data: result,
          info: {
            isNew: false,
            isDeleted: result.isDeleted,
            lastModifiedAt: result.updatedAt,
            lastModifiedBy: result.updatedBy,
          },
        };
      }}
      submit={async (data) => { await api.saveUser(data); return true; }}
      toggleDelete={async (del) => { await api.toggleDeleteUser(props.userId!, del); return true; }}
      canEdit={() => perms().edit}
    >
      {(ctx) => (
        <>
          <CrudDetail.Before>
            <SubItemSheet userId={ctx.data.id} />
          </CrudDetail.Before>

          <FormGroup>
            <FormGroup.Item label="이름">
              <TextInput value={ctx.data.name} onValueChange={v => ctx.setData("name", v)} />
            </FormGroup.Item>
            <FormGroup.Item label="이메일">
              <TextInput value={ctx.data.email} onValueChange={v => ctx.setData("email", v)} />
            </FormGroup.Item>
          </FormGroup>

          <CrudDetail.After>
            <ChangeHistoryList userId={ctx.data.id} />
          </CrudDetail.After>
        </>
      )}
    </CrudDetail>
  );
}

// Page 모드 — 라우트에서 사용
<Route path="/user/:id" component={UserDetail} />

// Modal 모드 — dialog.show()에서 사용
const result = await dialog.show(
  () => <UserDetail userId={123} />,
  { title: "사용자 수정" }
);

// Control 모드 — 다른 컴포넌트에 임베딩
function SomePage() {
  return (
    <div>
      <SomeOtherContent />
      <UserDetail userId={456} />
    </div>
  );
}
```

## 파일 배치

```
packages/solid/src/components/data/crud-detail/
  ├── CrudDetail.tsx
  ├── CrudDetailTools.tsx
  ├── CrudDetailBefore.tsx
  ├── CrudDetailAfter.tsx
  └── types.ts
```

## 예상 효과

단건 편집 화면 기준: **~60줄 boilerplate → ~15줄** (약 75% 감소)
- 제거: busy 상태, dirty check, save/refresh 핸들러, 키보드 단축키, topbar, 모드별 UI 분기
- 잔존: load/submit/toggleDelete 로직, 폼 필드 정의
