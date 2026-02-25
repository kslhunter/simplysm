import { createSignal } from "solid-js";
import { Checkbox, Radio, Button } from "@simplysm/solid";

export default function CheckboxRadioPage() {
  const [controlledCheck, setControlledCheck] = createSignal(false);
  const [selectedRadio, setSelectedRadio] = createSignal<string>("A");

  return (
    <div class="space-y-12 p-6">
      {/* Checkbox */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Checkbox</h2>
        <div class="space-y-6">
          {/* Basic usage */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Basic Usage</h3>
            <div class="flex flex-col items-start gap-3">
              <Checkbox>I agree to the terms of service</Checkbox>
              <Checkbox>I agree to receive marketing emails</Checkbox>
              <Checkbox />
            </div>
          </div>

          {/* Size */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Size</h3>
            <div class="flex flex-col items-start gap-3">
              <Checkbox size="sm">Small</Checkbox>
              <Checkbox>Default</Checkbox>
              <Checkbox size="lg">Large</Checkbox>
            </div>
          </div>

          {/* State */}
          <div>
            <h3 class="mb-3 text-lg font-bold">State</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled (unchecked)</p>
                <Checkbox disabled>Disabled</Checkbox>
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled (checked)</p>
                <Checkbox disabled value={true}>
                  Disabled (checked)
                </Checkbox>
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Inset</p>
                <Checkbox inset>Inset style</Checkbox>
              </div>
            </div>
          </div>

          {/* Inline */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Inline</h3>
            <p class="text-base-700 dark:text-base-300">
              You can place <Checkbox inline>agree</Checkbox> checkbox within text. It can also be{" "}
              <Checkbox inline value={true}>
                selected
              </Checkbox>{" "}
              in this way.
            </p>
          </div>
        </div>
      </section>

      {/* Radio */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Radio</h2>
        <div class="space-y-6">
          {/* Basic usage */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Basic Usage</h3>
            <div class="flex flex-col items-start gap-3">
              <Radio>Option A</Radio>
              <Radio>Option B</Radio>
              <Radio>Option C</Radio>
            </div>
          </div>

          {/* Size */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Size</h3>
            <div class="flex flex-col items-start gap-3">
              <Radio size="sm">Small</Radio>
              <Radio>Default</Radio>
              <Radio size="lg">Large</Radio>
            </div>
          </div>

          {/* State */}
          <div>
            <h3 class="mb-3 text-lg font-bold">State</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <Radio disabled>Disabled</Radio>
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled (selected)</p>
                <Radio disabled value={true}>
                  Disabled (selected)
                </Radio>
              </div>
            </div>
          </div>

          {/* Inline */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Inline</h3>
            <p class="text-base-700 dark:text-base-300">
              You can place <Radio inline>option</Radio> radio button within text. It can also be{" "}
              <Radio inline value={true}>
                selected
              </Radio>{" "}
              in this way.
            </p>
          </div>
        </div>
      </section>

      {/* Validation */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Validation</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Required</h3>
            <div class="flex flex-col items-start gap-3">
              <Checkbox required value={false}>
                Required checkbox
              </Checkbox>
              <Radio required value={false}>
                Required selection
              </Radio>
            </div>
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">touchMode (displays after blur)</h3>
            <div class="flex flex-col items-start gap-3">
              <Checkbox required touchMode value={false}>
                touchMode required checkbox
              </Checkbox>
            </div>
          </div>
        </div>
      </section>

      {/* Controlled */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Controlled</h2>
        <div class="space-y-6">
          {/* Checkbox Controlled */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Checkbox</h3>
            <div class="flex flex-col items-start gap-3">
              <Checkbox value={controlledCheck()} onValueChange={setControlledCheck}>
                I agree
              </Checkbox>
              <p class="text-sm text-base-600 dark:text-base-400">
                Current value:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {String(controlledCheck())}
                </code>
              </p>
              <Button
                theme="primary"
                variant="solid"
                size="sm"
                onClick={() => setControlledCheck((v) => !v)}
              >
                Toggle
              </Button>
            </div>
          </div>

          {/* Radio Controlled (group) */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Radio (Group)</h3>
            <div class="flex flex-col items-start gap-3">
              <Radio value={selectedRadio() === "A"} onValueChange={() => setSelectedRadio("A")}>
                Option A
              </Radio>
              <Radio value={selectedRadio() === "B"} onValueChange={() => setSelectedRadio("B")}>
                Option B
              </Radio>
              <Radio value={selectedRadio() === "C"} onValueChange={() => setSelectedRadio("C")}>
                Option C
              </Radio>
              <p class="text-sm text-base-600 dark:text-base-400">
                Selected:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">{selectedRadio()}</code>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
