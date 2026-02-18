import { createSignal, For } from "solid-js";
import { Icon, List, Topbar } from "@simplysm/solid";
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

export default function ListPage() {
  const [selectedItem, setSelectedItem] = createSignal<string | null>(null);
  const [treeOpen1, setTreeOpen1] = createSignal(false);
  const [treeOpen2, setTreeOpen2] = createSignal(true);

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">List</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Basic List */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Basic List</h2>
            <List>
              <List.Item>Item 1</List.Item>
              <List.Item>Item 2</List.Item>
              <List.Item>Item 3</List.Item>
            </List>
          </section>

          {/* Selectable List */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Selectable List</h2>
            <p class="mb-2 text-sm text-base-600 dark:text-base-400">
              Selected: {selectedItem() ?? "None"}
            </p>
            <List>
              <For each={["Apple", "Banana", "Cherry", "Date"]}>
                {(item) => (
                  <List.Item
                    selected={selectedItem() === item}
                    selectedIcon={IconCheck}
                    onClick={() => setSelectedItem(item)}
                  >
                    {item}
                  </List.Item>
                )}
              </For>
            </List>
          </section>

          {/* List with Icons */}
          <section>
            <h2 class="mb-4 text-xl font-bold">List with Icons</h2>
            <List>
              <List.Item onClick={() => alert("Settings clicked")}>
                <Icon icon={IconSettings} class="mr-2" />
                Settings
              </List.Item>
              <List.Item onClick={() => alert("Profile clicked")}>
                <Icon icon={IconUser} class="mr-2" />
                Profile
              </List.Item>
              <List.Item onClick={() => alert("Messages clicked")}>
                <Icon icon={IconMail} class="mr-2" />
                Messages
              </List.Item>
            </List>
          </section>

          {/* Nested List (Tree View) */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Nested List (Tree View)</h2>
            <p class="mb-2 text-sm text-base-600 dark:text-base-400">
              Use Arrow keys to navigate, Arrow Right/Left to expand/collapse
            </p>
            <List>
              <List.Item open={treeOpen1()} onOpenChange={setTreeOpen1}>
                <Icon icon={IconFolder} class="mr-2 text-yellow-500" />
                Documents
                <List.Item.Children>
                  <List.Item onClick={() => alert("Report.pdf")}>
                    <Icon icon={IconFile} class="mr-2 text-base-500 dark:text-base-400" />
                    Report.pdf
                  </List.Item>
                  <List.Item onClick={() => alert("Notes.txt")}>
                    <Icon icon={IconFile} class="mr-2 text-base-500 dark:text-base-400" />
                    Notes.txt
                  </List.Item>
                </List.Item.Children>
              </List.Item>
              <List.Item open={treeOpen2()} onOpenChange={setTreeOpen2}>
                <Icon icon={IconFolder} class="mr-2 text-yellow-500" />
                Photos
                <List.Item.Children>
                  <List.Item onClick={() => alert("Vacation.jpg")}>
                    <Icon icon={IconFile} class="mr-2 text-base-500 dark:text-base-400" />
                    Vacation.jpg
                  </List.Item>
                  <List.Item>
                    <Icon icon={IconFolder} class="mr-2 text-yellow-500" />
                    2024
                    <List.Item.Children>
                      <List.Item onClick={() => alert("January.jpg")}>
                        <Icon icon={IconFile} class="mr-2 text-base-500 dark:text-base-400" />
                        January.jpg
                      </List.Item>
                      <List.Item onClick={() => alert("February.jpg")}>
                        <Icon icon={IconFile} class="mr-2 text-base-500 dark:text-base-400" />
                        February.jpg
                      </List.Item>
                    </List.Item.Children>
                  </List.Item>
                </List.Item.Children>
              </List.Item>
            </List>
          </section>

          {/* States */}
          <section>
            <h2 class="mb-4 text-xl font-bold">States</h2>
            <List>
              <List.Item>Normal item</List.Item>
              <List.Item selected>Selected item</List.Item>
              <List.Item readonly>Readonly item</List.Item>
              <List.Item disabled>Disabled item</List.Item>
            </List>
          </section>

          {/* Inset Style */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Inset Style</h2>
            <List inset>
              <List.Item selectedIcon={IconStar} selected>
                Starred item
              </List.Item>
              <List.Item selectedIcon={IconStar}>Regular item</List.Item>
              <List.Item selectedIcon={IconHeart}>Another item</List.Item>
            </List>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
