import { For } from "solid-js";
import { Button } from "@simplysm/solid";

const themes = ["primary", "info", "success", "warning", "danger", "base"] as const;
const variants = ["solid", "outline", "ghost"] as const;

export default function ButtonPage() {
  return (
    <div class="space-y-8 p-6">
      {/* Variants by Theme */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Themes & Variants</h2>
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
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Sizes</h2>
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
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">States</h2>
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
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Click Event</h2>
        <Button theme="success" variant="solid" onClick={() => alert("Button clicked!")}>
          Click Me
        </Button>
      </section>

      {/* Default (Gray Outline) */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Default Button (base outline)
        </h2>
        <Button>Default Button</Button>
      </section>
    </div>
  );
}
