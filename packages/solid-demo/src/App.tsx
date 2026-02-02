import { createSignal, For } from "solid-js";
import { Button, Collapse } from "@simplysm/solid";

const themes = ["primary", "info", "success", "warning", "danger", "gray"] as const;
const variants = ["solid", "outline", "ghost"] as const;

export const App = () => {
  const [collapseOpen, setCollapseOpen] = createSignal(false);
  const [multiOpen1, setMultiOpen1] = createSignal(false);
  const [multiOpen2, setMultiOpen2] = createSignal(false);
  const [initiallyOpen, setInitiallyOpen] = createSignal(true);

  return (
    <div class="space-y-8 p-8">
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
          <Button theme="primary" variant="solid" size="sm">Small</Button>
          <Button theme="primary" variant="solid">Default</Button>
          <Button theme="primary" variant="solid" size="lg">Large</Button>
        </div>
      </section>

      {/* States */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">States</h2>
        <div class="flex items-center gap-4">
          <Button theme="primary" variant="solid">Normal</Button>
          <Button theme="primary" variant="solid" disabled>Disabled</Button>
          <Button theme="primary" variant="solid" inset>Inset</Button>
          <Button theme="primary" variant="solid" inset disabled>Inset + Disabled</Button>
        </div>
      </section>

      {/* Click Event */}
      <section>
        <h2 class="mb-4 text-xl font-semibold">Click Event</h2>
        <Button
          theme="success"
          variant="solid"
          onClick={() => alert("Button clicked!")}
        >
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
              <p class="mt-2 text-sm text-gray-600">
                The content smoothly animates when toggling.
              </p>
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
    </div>
  );
};
