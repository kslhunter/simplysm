import { createSignal, For } from "solid-js";
import { Button, Dropdown } from "@simplysm/solid";

const menuItems = ["복사", "붙여넣기", "잘라내기", "삭제"];
const longMenuItems = Array.from({ length: 20 }, (_, i) => `항목 ${i + 1}`);

export default function DropdownPage() {
  // 기본 드롭다운 상태
  const [basicSelected, setBasicSelected] = createSignal<string | null>(null);

  // 컨텍스트 메뉴 상태
  const [contextOpen, setContextOpen] = createSignal(false);
  const [contextPosition, setContextPosition] = createSignal({ x: 0, y: 0 });
  const [contextSelected, setContextSelected] = createSignal<string | null>(null);

  // 최대 높이 상태
  const [maxHeightSelected, setMaxHeightSelected] = createSignal<string | null>(null);

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setContextPosition({ x: e.clientX, y: e.clientY });
    setContextOpen(true);
  };

  return (
    <div class="space-y-8 p-6">
      {/* 기본 드롭다운 메뉴 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          기본 드롭다운 메뉴
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          외부 클릭, Escape, Tab, 스크롤 시 자동으로 닫힙니다.
        </p>
        <div class="flex items-center gap-4">
          <Dropdown>
            <Dropdown.Trigger>
              <Button theme="primary" variant="solid">
                메뉴 열기
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Content>
              <ul class="py-1">
                <For each={menuItems}>
                  {(item) => (
                    <li
                      role="menuitem"
                      tabIndex={0}
                      class="cursor-pointer px-4 py-2 outline-none hover:bg-base-100 focus:bg-base-100 dark:hover:bg-base-700 dark:focus:bg-base-700"
                      onClick={() => {
                        setBasicSelected(item);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setBasicSelected(item);
                        }
                      }}
                    >
                      {item}
                    </li>
                  )}
                </For>
              </ul>
            </Dropdown.Content>
          </Dropdown>
          {basicSelected() != null && (
            <span class="text-sm text-base-600 dark:text-base-400">선택: {basicSelected()}</span>
          )}
        </div>
      </section>

      {/* 컨텍스트 메뉴 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">컨텍스트 메뉴</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">아래 영역에서 우클릭하세요.</p>
        <div
          class="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-base-300 bg-base-50 dark:border-base-600 dark:bg-base-800"
          onContextMenu={handleContextMenu}
        >
          <span class="text-base-500 dark:text-base-400">우클릭 영역</span>
        </div>
        {contextSelected() != null && (
          <p class="mt-2 text-sm text-base-600 dark:text-base-400">선택: {contextSelected()}</p>
        )}
        <Dropdown position={contextPosition()} open={contextOpen()} onOpenChange={setContextOpen}>
          <Dropdown.Content>
            <ul class="py-1">
              <For each={menuItems}>
                {(item) => (
                  <li
                    role="menuitem"
                    tabIndex={0}
                    class="cursor-pointer px-4 py-2 outline-none hover:bg-base-100 focus:bg-base-100 dark:hover:bg-base-700 dark:focus:bg-base-700"
                    onClick={() => {
                      setContextSelected(item);
                      setContextOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setContextSelected(item);
                        setContextOpen(false);
                      }
                    }}
                  >
                    {item}
                  </li>
                )}
              </For>
            </ul>
          </Dropdown.Content>
        </Dropdown>
      </section>

      {/* 위치 자동 조정 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">위치 자동 조정</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          화면 하단에서 열면 위쪽으로 펼쳐집니다. 브라우저 창 크기를 줄여 테스트해 보세요.
        </p>
        <Dropdown>
          <Dropdown.Trigger>
            <Button theme="info" variant="solid">
              드롭다운 열기
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <ul class="py-1">
              <For each={menuItems}>
                {(item) => (
                  <li
                    role="menuitem"
                    tabIndex={0}
                    class="cursor-pointer px-4 py-2 outline-none hover:bg-base-100 focus:bg-base-100 dark:hover:bg-base-700 dark:focus:bg-base-700"
                  >
                    {item}
                  </li>
                )}
              </For>
            </ul>
          </Dropdown.Content>
        </Dropdown>
      </section>

      {/* 최대 높이 설정 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">최대 높이 설정</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          maxHeight prop으로 최대 높이를 설정하면 내용이 넘칠 때 스크롤됩니다.
        </p>
        <div class="flex items-center gap-4">
          <Dropdown maxHeight={200}>
            <Dropdown.Trigger>
              <Button theme="success" variant="solid">
                긴 목록 열기
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Content>
              <ul class="py-1">
                <For each={longMenuItems}>
                  {(item) => (
                    <li
                      role="menuitem"
                      tabIndex={0}
                      class="cursor-pointer px-4 py-2 outline-none hover:bg-base-100 focus:bg-base-100 dark:hover:bg-base-700 dark:focus:bg-base-700"
                      onClick={() => {
                        setMaxHeightSelected(item);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setMaxHeightSelected(item);
                        }
                      }}
                    >
                      {item}
                    </li>
                  )}
                </For>
              </ul>
            </Dropdown.Content>
          </Dropdown>
          {maxHeightSelected() != null && (
            <span class="text-sm text-base-600 dark:text-base-400">
              선택: {maxHeightSelected()}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
