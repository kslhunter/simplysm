import { createSignal, For } from "solid-js";
import { A } from "@solidjs/router";
import { Button, Collapse, List, ListItem } from "@simplysm/solid";
import {
  IconCheck,
  IconFile,
  IconFolder,
  IconHeart,
  IconMail,
  IconSettings,
  IconStar,
  IconUser,
} from "@tabler/icons-solidjs";

const themes = ["primary", "info", "success", "warning", "danger", "gray"] as const;
const variants = ["solid", "outline", "ghost"] as const;

export const App = () => {
  const [collapseOpen, setCollapseOpen] = createSignal(false);
  const [multiOpen1, setMultiOpen1] = createSignal(false);
  const [multiOpen2, setMultiOpen2] = createSignal(false);
  const [initiallyOpen, setInitiallyOpen] = createSignal(true);

  // List demo state
  const [selectedItem, setSelectedItem] = createSignal<string | null>(null);
  const [treeOpen1, setTreeOpen1] = createSignal(false);
  const [treeOpen2, setTreeOpen2] = createSignal(true);

  return (
    <div class="space-y-8 p-8">
      {/* Navigation */}
      <section>
        <A href="/sidebar" class="text-primary-600 hover:underline">
          → Sidebar Demo
        </A>
      </section>

      <hr class="my-8 border-gray-300" />

      <h1 class="mb-4 text-2xl font-bold">Button Demo</h1>

      {/* Variants by Theme */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Themes & Variants</h2>
        <div class="space-y-4">
          <For each={themes}>
            {(theme) => (
              <div class="flex items-center gap-4">
                <span class="w-20 text-sm font-medium">{theme}</span>
                <For each={variants}>
                  {(variant) => (
                    <Button theme={theme} variant={variant}>
                      {variant}
                    </Button>
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* Sizes */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Sizes</h2>
        <div class="flex items-center gap-4">
          <Button theme="primary" variant="solid" size="sm">
            Small
          </Button>
          <Button theme="primary" variant="solid">
            Default
          </Button>
          <Button theme="primary" variant="solid" size="lg">
            Large
          </Button>
        </div>
      </section>

      {/* States */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">States</h2>
        <div class="flex items-center gap-4">
          <Button theme="primary" variant="solid">
            Normal
          </Button>
          <Button theme="primary" variant="solid" disabled>
            Disabled
          </Button>
          <Button theme="primary" variant="solid" inset>
            Inset
          </Button>
          <Button theme="primary" variant="solid" inset disabled>
            Inset + Disabled
          </Button>
        </div>
      </section>

      {/* Click Event */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Click Event</h2>
        <Button theme="success" variant="solid" onClick={() => alert("Button clicked!")}>
          Click Me
        </Button>
      </section>

      {/* Default (Gray Outline) */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Default Button (gray outline)</h2>
        <Button>Default Button</Button>
      </section>

      <hr class="my-8 border-gray-300" />

      {/* Collapse Demo */}
      <h1 class="mb-4 text-2xl font-bold">Collapse Demo</h1>

      {/* Basic Toggle */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Basic Toggle</h2>
        <div class="space-y-2">
          <Button
            theme="primary"
            variant="solid"
            aria-expanded={collapseOpen()}
            aria-controls="basic-collapse"
            onClick={() => setCollapseOpen(!collapseOpen())}
          >
            {collapseOpen() ? "Close" : "Open"} Content
          </Button>
          <Collapse id="basic-collapse" open={collapseOpen()}>
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p>This is the collapsible content.</p>
              <p class="mt-2 text-sm text-gray-600">The content smoothly animates when toggling.</p>
            </div>
          </Collapse>
        </div>
      </section>

      {/* Multiple Collapse */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Multiple Collapse (Accordion-like)</h2>
        <div class="space-y-2">
          <div>
            <Button
              variant="outline"
              aria-expanded={multiOpen1()}
              aria-controls="multi-collapse-1"
              onClick={() => setMultiOpen1(!multiOpen1())}
            >
              Section 1 {multiOpen1() ? "▲" : "▼"}
            </Button>
            <Collapse id="multi-collapse-1" open={multiOpen1()}>
              <div class="rounded-b-lg border border-t-0 border-gray-200 bg-white p-4">
                <p>Content of Section 1</p>
              </div>
            </Collapse>
          </div>
          <div>
            <Button
              variant="outline"
              aria-expanded={multiOpen2()}
              aria-controls="multi-collapse-2"
              onClick={() => setMultiOpen2(!multiOpen2())}
            >
              Section 2 {multiOpen2() ? "▲" : "▼"}
            </Button>
            <Collapse id="multi-collapse-2" open={multiOpen2()}>
              <div class="rounded-b-lg border border-t-0 border-gray-200 bg-white p-4">
                <p>Content of Section 2</p>
              </div>
            </Collapse>
          </div>
        </div>
      </section>

      {/* Initially Open */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Initially Open</h2>
        <div class="space-y-2">
          <Button
            theme="info"
            variant="solid"
            aria-expanded={initiallyOpen()}
            aria-controls="initially-open-collapse"
            onClick={() => setInitiallyOpen(!initiallyOpen())}
          >
            {initiallyOpen() ? "Close" : "Open"}
          </Button>
          <Collapse id="initially-open-collapse" open={initiallyOpen()}>
            <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p>This collapse starts in the open state.</p>
            </div>
          </Collapse>
        </div>
      </section>

      <hr class="my-8 border-gray-300" />

      {/* List Demo */}
      <h1 class="mb-4 text-2xl font-bold">List Demo</h1>

      {/* Basic List */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Basic List</h2>
        <div class="max-w-md">
          <List>
            <ListItem>Item 1</ListItem>
            <ListItem>Item 2</ListItem>
            <ListItem>Item 3</ListItem>
          </List>
        </div>
      </section>

      {/* Selectable List */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Selectable List</h2>
        <p class="mb-2 text-sm text-gray-600">Selected: {selectedItem() ?? "None"}</p>
        <div class="max-w-md">
          <List>
            <For each={["Apple", "Banana", "Cherry", "Date"]}>
              {(item) => (
                <ListItem
                  selected={selectedItem() === item}
                  selectedIcon={IconCheck}
                  onClick={() => setSelectedItem(item)}
                >
                  {item}
                </ListItem>
              )}
            </For>
          </List>
        </div>
      </section>

      {/* List with Icons */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">List with Icons</h2>
        <div class="max-w-md">
          <List>
            <ListItem onClick={() => alert("Settings clicked")}>
              <IconSettings class="mr-2 size-4" />
              Settings
            </ListItem>
            <ListItem onClick={() => alert("Profile clicked")}>
              <IconUser class="mr-2 size-4" />
              Profile
            </ListItem>
            <ListItem onClick={() => alert("Messages clicked")}>
              <IconMail class="mr-2 size-4" />
              Messages
            </ListItem>
          </List>
        </div>
      </section>

      {/* Nested List (Tree View) */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Nested List (Tree View)</h2>
        <p class="mb-2 text-sm text-gray-600">Use Arrow keys to navigate, Arrow Right/Left to expand/collapse</p>
        <div class="max-w-md">
          <List>
            <ListItem open={treeOpen1()} onOpenChange={setTreeOpen1}>
              <IconFolder class="mr-2 size-4 text-yellow-500" />
              Documents
              <List>
                <ListItem onClick={() => alert("Report.pdf")}>
                  <IconFile class="mr-2 size-4 text-gray-500" />
                  Report.pdf
                </ListItem>
                <ListItem onClick={() => alert("Notes.txt")}>
                  <IconFile class="mr-2 size-4 text-gray-500" />
                  Notes.txt
                </ListItem>
              </List>
            </ListItem>
            <ListItem open={treeOpen2()} onOpenChange={setTreeOpen2}>
              <IconFolder class="mr-2 size-4 text-yellow-500" />
              Photos
              <List>
                <ListItem onClick={() => alert("Vacation.jpg")}>
                  <IconFile class="mr-2 size-4 text-gray-500" />
                  Vacation.jpg
                </ListItem>
                <ListItem>
                  <IconFolder class="mr-2 size-4 text-yellow-500" />
                  2024
                  <List>
                    <ListItem onClick={() => alert("January.jpg")}>
                      <IconFile class="mr-2 size-4 text-gray-500" />
                      January.jpg
                    </ListItem>
                    <ListItem onClick={() => alert("February.jpg")}>
                      <IconFile class="mr-2 size-4 text-gray-500" />
                      February.jpg
                    </ListItem>
                  </List>
                </ListItem>
              </List>
            </ListItem>
          </List>
        </div>
      </section>

      {/* States */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">States</h2>
        <div class="max-w-md">
          <List>
            <ListItem>Normal item</ListItem>
            <ListItem selected>Selected item</ListItem>
            <ListItem readonly>Readonly item</ListItem>
            <ListItem disabled>Disabled item</ListItem>
          </List>
        </div>
      </section>

      {/* Inset Style */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Inset Style</h2>
        <div>
          <List inset>
            <ListItem selectedIcon={IconStar} selected>
              Starred item
            </ListItem>
            <ListItem selectedIcon={IconStar}>Regular item</ListItem>
            <ListItem selectedIcon={IconHeart}>Another item</ListItem>
          </List>
        </div>
      </section>
    </div>
  );
};
