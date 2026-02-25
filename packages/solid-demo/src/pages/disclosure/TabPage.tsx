import { createSignal } from "solid-js";
import { Show } from "solid-js";
import { Tabs } from "@simplysm/solid";

export default function TabPage() {
  const [tab1, setTab1] = createSignal("general");
  const [tab2, setTab2] = createSignal("a");

  return (
    <div class="space-y-12 p-6">
      {/* Basic usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Usage</h2>
        <div class="space-y-4">
          <Tabs value={tab1()} onValueChange={setTab1}>
            <Tabs.Tab value="general">General</Tabs.Tab>
            <Tabs.Tab value="advanced">Advanced</Tabs.Tab>
            <Tabs.Tab value="about">About</Tabs.Tab>
          </Tabs>
          <div class="rounded border border-base-200 p-4 dark:border-base-700">
            <Show when={tab1() === "general"}>
              <p>General settings content.</p>
            </Show>
            <Show when={tab1() === "advanced"}>
              <p>Advanced settings content.</p>
            </Show>
            <Show when={tab1() === "about"}>
              <p>About page.</p>
            </Show>
          </div>
          <p class="text-sm text-base-600 dark:text-base-400">
            Selected: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{tab1()}</code>
          </p>
        </div>
      </section>

      {/* Disabled */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Disabled</h2>
        <Tabs value="a">
          <Tabs.Tab value="a">Active</Tabs.Tab>
          <Tabs.Tab value="b" disabled>
            Disabled
          </Tabs.Tab>
          <Tabs.Tab value="c">Active</Tabs.Tab>
        </Tabs>
      </section>

      {/* Size */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Size</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Small</h3>
            <Tabs size="sm" value={tab2()} onValueChange={setTab2}>
              <Tabs.Tab value="a">Tab A</Tabs.Tab>
              <Tabs.Tab value="b">Tab B</Tabs.Tab>
              <Tabs.Tab value="c">Tab C</Tabs.Tab>
            </Tabs>
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">Default</h3>
            <Tabs value={tab2()} onValueChange={setTab2}>
              <Tabs.Tab value="a">Tab A</Tabs.Tab>
              <Tabs.Tab value="b">Tab B</Tabs.Tab>
              <Tabs.Tab value="c">Tab C</Tabs.Tab>
            </Tabs>
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">Large</h3>
            <Tabs size="lg" value={tab2()} onValueChange={setTab2}>
              <Tabs.Tab value="a">Tab A</Tabs.Tab>
              <Tabs.Tab value="b">Tab B</Tabs.Tab>
              <Tabs.Tab value="c">Tab C</Tabs.Tab>
            </Tabs>
          </div>
        </div>
      </section>
    </div>
  );
}
