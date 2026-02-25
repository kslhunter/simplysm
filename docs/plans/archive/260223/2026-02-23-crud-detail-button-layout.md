# CrudDetail 버튼 배치 수정 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** CrudDetail의 page/control/modal 3가지 모드에서 버튼 배치를 올바르게 분리하여 중복 렌더링 버그 수정

**Architecture:** Topbar actions에 삭제 버튼 추가, inline toolbar를 control-mode 전용 버튼과 독립적 Tools로 분리

**Tech Stack:** SolidJS, @simplysm/solid

---

### Task 1: CrudDetail 버튼 배치 수정

**Files:**

- Modify: `packages/solid/src/components/data/crud-detail/CrudDetail.tsx:189-293`
- Test: `packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx`

**Step 1: Write the failing tests**

기존 테스트 중 `editable=false` 테스트의 새로고침 assertion을 수정하고, 모드별 버튼 배치 테스트를 추가한다.

`packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx` 에 추가:

```tsx
// 기존 import에 추가
import { createSignal, type Accessor, type JSX } from "solid-js";
import { Topbar, useTopbarActionsAccessor } from "../../../../src";

// Helper: TopbarContext에서 actions accessor를 추출
function ActionsReader(props: { onCapture: (actions: Accessor<JSX.Element | undefined>) => void }) {
  const actions = useTopbarActionsAccessor();
  props.onCapture(actions);
  return null;
}

describe("CrudDetail button layout by mode", () => {
  it("control 모드: toolbar에 저장/새로고침/삭제가 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          submit={() => Promise.resolve(true)}
          toggleDelete={() => Promise.resolve(true)}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("저장");
    expect(container.textContent).toContain("새로고침");
    expect(container.textContent).toContain("삭제");
  });

  it("control 모드 + editable=false: 새로고침만 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          submit={() => Promise.resolve(true)}
          toggleDelete={() => Promise.resolve(true)}
          editable={false}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("저장");
    expect(container.textContent).toContain("새로고침");
    expect(container.textContent).not.toContain("삭제");
  });

  it("page 모드: topbar에 저장/삭제/새로고침이 등록되고 toolbar에는 표시되지 않는다", async () => {
    let actionsAccessor!: Accessor<JSX.Element | undefined>;

    const { container } = render(() => (
      <TestWrapper>
        <Topbar.Container>
          <ActionsReader onCapture={(a) => (actionsAccessor = a)} />
          <CrudDetail<TestData>
            load={() =>
              Promise.resolve({
                data: { id: 1, name: "홍길동" },
                info: { isNew: false, isDeleted: false },
              })
            }
            submit={() => Promise.resolve(true)}
            toggleDelete={() => Promise.resolve(true)}
          >
            {(ctx) => <div>{ctx.data.name}</div>}
          </CrudDetail>
        </Topbar.Container>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));

    // topbar에 actions가 등록됨
    expect(actionsAccessor()).toBeTruthy();

    // container(toolbar 영역)에는 저장/새로고침/삭제가 없어야 함
    const toolbarArea = container.querySelector("[data-topbar-container]")!;
    const contentText = toolbarArea.textContent ?? "";

    // topbar actions 영역이 아닌 content 영역만 확인하기 위해
    // toolbar 내부 버튼 텍스트가 중복되지 않는지 확인
    const buttons = toolbarArea.querySelectorAll("button");
    const toolbarButtons = Array.from(buttons).filter(
      (btn) => !btn.closest("[data-topbar-actions]"),
    );
    const toolbarText = toolbarButtons.map((b) => b.textContent).join("");
    expect(toolbarText).not.toContain("저장");
    expect(toolbarText).not.toContain("새로고침");
    expect(toolbarText).not.toContain("삭제");
  });

  it("page 모드 + Tools: toolbar에 tools만 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <Topbar.Container>
          <CrudDetail<TestData>
            load={() =>
              Promise.resolve({
                data: { id: 1, name: "홍길동" },
                info: { isNew: false, isDeleted: false },
              })
            }
            submit={() => Promise.resolve(true)}
          >
            {(ctx) => (
              <>
                <CrudDetail.Tools>
                  <button>커스텀도구</button>
                </CrudDetail.Tools>
                <div>{ctx.data.name}</div>
              </>
            )}
          </CrudDetail>
        </Topbar.Container>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("커스텀도구");
  });

  it("control 모드 + Tools: toolbar에 저장/새로고침과 tools가 함께 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          submit={() => Promise.resolve(true)}
        >
          {(ctx) => (
            <>
              <CrudDetail.Tools>
                <button>커스텀도구</button>
              </CrudDetail.Tools>
              <div>{ctx.data.name}</div>
            </>
          )}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("저장");
    expect(container.textContent).toContain("새로고침");
    expect(container.textContent).toContain("커스텀도구");
  });

  it("control 모드 + editable=false + Tools: 새로고침과 tools만 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={() =>
            Promise.resolve({
              data: { id: 1, name: "홍길동" },
              info: { isNew: false, isDeleted: false },
            })
          }
          submit={() => Promise.resolve(true)}
          editable={false}
        >
          {(ctx) => (
            <>
              <CrudDetail.Tools>
                <button>커스텀도구</button>
              </CrudDetail.Tools>
              <div>{ctx.data.name}</div>
            </>
          )}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("저장");
    expect(container.textContent).toContain("새로고침");
    expect(container.textContent).toContain("커스텀도구");
  });
});
```

기존 테스트 수정 — `editable=false` 테스트(L203-224)에서 새로고침 assertion 변경:

```tsx
// 변경 전:
expect(container.textContent).not.toContain("새로고침");
// 변경 후:
expect(container.textContent).toContain("새로고침");
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx --project=solid --run`
Expected: 새 테스트들 FAIL (page 모드에서 toolbar에 저장/새로고침 중복, tools 독립 표시 안 됨)

**Step 3: Implement — Topbar actions에 삭제 버튼 추가**

`packages/solid/src/components/data/crud-detail/CrudDetail.tsx` L189-209를 다음으로 교체:

```tsx
  // -- Topbar Actions (Page mode) --
  if (topbarCtx) {
    createTopbarActions(() => (
      <>
        <Show when={canEdit() && local.submit}>
          <Button
            size="lg"
            variant="ghost"
            theme="primary"
            onClick={() => formRef?.requestSubmit()}
          >
            <Icon icon={IconDeviceFloppy} class="mr-1" />
            저장
          </Button>
        </Show>
        <Show
          when={
            canEdit() &&
            local.toggleDelete &&
            info() &&
            !info()!.isNew &&
            (local.deletable ?? true)
          }
        >
          {(_) => (
            <Button
              size="lg"
              variant="ghost"
              theme="danger"
              onClick={() => void handleToggleDelete()}
            >
              <Icon icon={info()!.isDeleted ? IconTrashOff : IconTrash} class="mr-1" />
              {info()!.isDeleted ? "복구" : "삭제"}
            </Button>
          )}
        </Show>
        <Button size="lg" variant="ghost" theme="info" onClick={() => void handleRefresh()}>
          <Icon icon={IconRefresh} class="mr-1" />
          새로고침
        </Button>
      </>
    ));
  }
```

**Step 4: Implement — Toolbar 분리**

`packages/solid/src/components/data/crud-detail/CrudDetail.tsx` L258-293 (toolbar 영역)을 다음으로 교체:

```tsx
        {/* Toolbar */}
        <Show when={(!isModal && !topbarCtx) || defs().tools}>
          <div class="flex gap-2 p-2 pb-0">
            <Show when={!topbarCtx && !isModal}>
              <Show when={canEdit() && local.submit}>
                <Button
                  size="sm"
                  theme="primary"
                  variant="ghost"
                  onClick={() => formRef?.requestSubmit()}
                >
                  <Icon icon={IconDeviceFloppy} class="mr-1" />
                  저장
                </Button>
              </Show>
              <Show
                when={
                  canEdit() &&
                  local.toggleDelete &&
                  info() &&
                  !info()!.isNew &&
                  (local.deletable ?? true)
                }
              >
                {(_) => (
                  <Button
                    size="sm"
                    theme="danger"
                    variant="ghost"
                    onClick={() => void handleToggleDelete()}
                  >
                    <Icon icon={info()!.isDeleted ? IconTrashOff : IconTrash} class="mr-1" />
                    {info()!.isDeleted ? "복구" : "삭제"}
                  </Button>
                )}
              </Show>
              <Button size="sm" theme="info" variant="ghost" onClick={() => void handleRefresh()}>
                <Icon icon={IconRefresh} class="mr-1" />
                새로고침
              </Button>
            </Show>
            <Show when={defs().tools}>{(toolsDef) => toolsDef().children}</Show>
          </div>
        </Show>
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx --project=solid --run`
Expected: ALL PASS

**Step 6: Typecheck**

Run: `pnpm typecheck packages/solid`
Expected: No errors

**Step 7: Commit**

```bash
git add packages/solid/src/components/data/crud-detail/CrudDetail.tsx packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx
git commit -m "fix(solid): separate CrudDetail button layout by mode"
```
