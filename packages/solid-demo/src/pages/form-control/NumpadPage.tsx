import { createSignal } from "solid-js";
import { Numpad } from "@simplysm/solid";

export default function NumpadPage() {
  const [basicValue, setBasicValue] = createSignal<number | undefined>();
  const [initialValue, setInitialValue] = createSignal<number | undefined>(123.45);
  const [enterValue, setEnterValue] = createSignal<number | undefined>();
  const [disabledValue, setDisabledValue] = createSignal<number | undefined>();

  return (
    <div class="space-y-12 p-6">
      {/* Basic usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Usage</h2>
        <div class="space-y-6">
          <div>
            <Numpad
              value={basicValue()}
              onValueChange={setBasicValue}
              placeholder="Enter a number"
            />
            <p class="mt-2 text-sm text-base-600 dark:text-base-400">
              Value:{" "}
              <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                {JSON.stringify(basicValue())}
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* Initial value */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Initial Value</h2>
        <div class="space-y-6">
          <div>
            <Numpad value={initialValue()} onValueChange={setInitialValue} />
            <p class="mt-2 text-sm text-base-600 dark:text-base-400">
              Value:{" "}
              <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                {JSON.stringify(initialValue())}
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* ENT & Minus button */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">ENT & Minus Button</h2>
        <div class="space-y-6">
          <div>
            <Numpad
              value={enterValue()}
              onValueChange={setEnterValue}
              useEnterButton
              useMinusButton
              onEnterButtonClick={() => alert(`Entered value: ${enterValue()}`)}
            />
            <p class="mt-2 text-sm text-base-600 dark:text-base-400">
              Value:{" "}
              <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                {JSON.stringify(enterValue())}
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* Input disabled & required */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Input Disabled & Required
        </h2>
        <div class="space-y-6">
          <div>
            <Numpad
              value={disabledValue()}
              onValueChange={setDisabledValue}
              inputDisabled
              required
              useEnterButton
              onEnterButtonClick={() => alert(`Entered value: ${disabledValue()}`)}
            />
            <p class="mt-2 text-sm text-base-600 dark:text-base-400">
              Value:{" "}
              <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                {JSON.stringify(disabledValue())}
              </code>
            </p>
            <p class="mt-1 text-sm text-base-500 dark:text-base-400">
              Direct text field input is disabled. ENT button is disabled when there is no value.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
