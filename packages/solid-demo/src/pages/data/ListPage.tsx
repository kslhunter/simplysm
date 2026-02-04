import { createSignal, For } from "solid-js";
import { Icon, List, ListItem, Topbar, TopbarContainer } from "@simplysm/solid";
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
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">List</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
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
                  <Icon icon={IconSettings} class="mr-2 size-4" />
                  Settings
                </ListItem>
                <ListItem onClick={() => alert("Profile clicked")}>
                  <Icon icon={IconUser} class="mr-2 size-4" />
                  Profile
                </ListItem>
                <ListItem onClick={() => alert("Messages clicked")}>
                  <Icon icon={IconMail} class="mr-2 size-4" />
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
                  <Icon icon={IconFolder} class="mr-2 size-4 text-yellow-500" />
                  Documents
                  <ListItem.Children>
                    <ListItem onClick={() => alert("Report.pdf")}>
                      <Icon icon={IconFile} class="mr-2 size-4 text-gray-500" />
                      Report.pdf
                    </ListItem>
                    <ListItem onClick={() => alert("Notes.txt")}>
                      <Icon icon={IconFile} class="mr-2 size-4 text-gray-500" />
                      Notes.txt
                    </ListItem>
                  </ListItem.Children>
                </ListItem>
                <ListItem open={treeOpen2()} onOpenChange={setTreeOpen2}>
                  <Icon icon={IconFolder} class="mr-2 size-4 text-yellow-500" />
                  Photos
                  <ListItem.Children>
                    <ListItem onClick={() => alert("Vacation.jpg")}>
                      <Icon icon={IconFile} class="mr-2 size-4 text-gray-500" />
                      Vacation.jpg
                    </ListItem>
                    <ListItem>
                      <Icon icon={IconFolder} class="mr-2 size-4 text-yellow-500" />
                      2024
                      <ListItem.Children>
                        <ListItem onClick={() => alert("January.jpg")}>
                          <Icon icon={IconFile} class="mr-2 size-4 text-gray-500" />
                          January.jpg
                        </ListItem>
                        <ListItem onClick={() => alert("February.jpg")}>
                          <Icon icon={IconFile} class="mr-2 size-4 text-gray-500" />
                          February.jpg
                        </ListItem>
                      </ListItem.Children>
                    </ListItem>
                  </ListItem.Children>
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
      </div>
    </TopbarContainer>
  );
}
