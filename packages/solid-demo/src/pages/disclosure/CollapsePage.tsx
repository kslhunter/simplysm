import { createSignal } from "solid-js";
import { Button, Collapse, Topbar } from "@simplysm/solid";

export default function CollapsePage() {
  const [collapseOpen, setCollapseOpen] = createSignal(false);
  const [multiOpen1, setMultiOpen1] = createSignal(false);
  const [multiOpen2, setMultiOpen2] = createSignal(false);
  const [initiallyOpen, setInitiallyOpen] = createSignal(true);

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Collapse</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Basic Toggle */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Basic Toggle</h2>
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
                <div class="rounded-lg border border-base-200 bg-base-50 p-4 dark:border-base-700 dark:bg-base-800">
                  <p>This is the collapsible content.</p>
                  <p class="mt-2 text-sm text-base-600 dark:text-base-400">
                    The content smoothly animates when toggling.
                  </p>
                </div>
              </Collapse>
            </div>
          </section>

          {/* Multiple Collapse */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Multiple Collapse (Accordion-like)</h2>
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
                  <div class="rounded-b-lg border border-t-0 border-base-200 bg-white p-4 dark:border-base-700 dark:bg-base-800">
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
                  <div class="rounded-b-lg border border-t-0 border-base-200 bg-white p-4 dark:border-base-700 dark:bg-base-800">
                    <p>Content of Section 2</p>
                  </div>
                </Collapse>
              </div>
            </div>
          </section>

          {/* Initially Open */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Initially Open</h2>
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
      </div>
    </Topbar.Container>
  );
}
