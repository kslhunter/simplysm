import { createSignal, For } from "solid-js";
import { Button, Dropdown } from "@simplysm/solid";

const menuItems = ["Copy", "Paste", "Cut", "Delete"];
const longMenuItems = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`);

export default function DropdownPage() {
  // Basic dropdown state
  const [basicSelected, setBasicSelected] = createSignal<string | null>(null);

  // Context menu state
  const [contextOpen, setContextOpen] = createSignal(false);
  const [contextPosition, setContextPosition] = createSignal({ x: 0, y: 0 });
  const [contextSelected, setContextSelected] = createSignal<string | null>(null);

  // Max height state
  const [maxHeightSelected, setMaxHeightSelected] = createSignal<string | null>(null);

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setContextPosition({ x: e.clientX, y: e.clientY });
    setContextOpen(true);
  };

  return (
    <div class="space-y-8 p-6">
      {/* Basic dropdown menu */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Basic Dropdown Menu
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Automatically closes on outside click, Escape, Tab, or scroll.
        </p>
        <div class="flex items-center gap-4">
          <Dropdown>
            <Dropdown.Trigger>
              <Button theme="primary" variant="solid">
                Open Menu
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
            <span class="text-sm text-base-600 dark:text-base-400">Selected: {basicSelected()}</span>
          )}
        </div>
      </section>

      {/* Context menu */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Context Menu</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">Right-click in the area below.</p>
        <div
          class="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-base-300 bg-base-50 dark:border-base-600 dark:bg-base-800"
          onContextMenu={handleContextMenu}
        >
          <span class="text-base-500 dark:text-base-400">Right-click area</span>
        </div>
        {contextSelected() != null && (
          <p class="mt-2 text-sm text-base-600 dark:text-base-400">Selected: {contextSelected()}</p>
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

      {/* Auto position adjustment */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Auto Position Adjustment</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          When opened near the bottom of the screen, it expands upward. Try resizing the browser window to test.
        </p>
        <Dropdown>
          <Dropdown.Trigger>
            <Button theme="info" variant="solid">
              Open Dropdown
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

      {/* Max height setting */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Max Height Setting</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Set max height with the maxHeight prop to enable scrolling when content overflows.
        </p>
        <div class="flex items-center gap-4">
          <Dropdown maxHeight={200}>
            <Dropdown.Trigger>
              <Button theme="success" variant="solid">
                Open Long List
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
              Selected: {maxHeightSelected()}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
