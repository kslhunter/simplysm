import { createSignal } from "solid-js";
import {
  TextInput,
  Textarea,
  NumberInput,
  DatePicker,
  DateTimePicker,
  TimePicker,
  Invalid,
  Button,
} from "@simplysm/solid";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";

export default function FieldPage() {
  // Signals for controlled example
  const [controlledText, setControlledText] = createSignal<string | undefined>("controlled value");
  const [controlledNumber, setControlledNumber] = createSignal<number | undefined>(12345);
  const [controlledTextArea, setControlledTextArea] = createSignal<string | undefined>(
    "You can enter\nmultiple lines\nof text",
  );

  return (
    <div class="space-y-12 p-6">
      {/* TextInput */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">TextInput</h2>
        <div class="space-y-6">
          {/* Basic usage */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Basic Usage</h3>
            <TextInput placeholder="Enter your name" />
          </div>

          {/* Type */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Type</h3>
            <div class="flex flex-col items-start gap-3">
              <TextInput placeholder="text (default)" />
              <TextInput type="password" placeholder="password" />
              <TextInput type="email" placeholder="email" />
            </div>
          </div>

          {/* Format */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Format (Phone Number)</h3>
            <TextInput placeholder="phone number" format="XXX-XXXX-XXXX" />
          </div>

          {/* Size */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Size</h3>
            <div class="flex flex-col items-start gap-3">
              <TextInput size="sm" placeholder="Small" />
              <TextInput placeholder="Default" />
              <TextInput size="lg" placeholder="Large" />
            </div>
          </div>

          {/* State */}
          <div>
            <h3 class="mb-3 text-lg font-bold">State</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <TextInput disabled value="disabled" />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Invalid</p>
                <Invalid message="Example error message">
                  <TextInput placeholder="error state" />
                </Invalid>
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Inset (No Border)</p>
                <TextInput inset placeholder="inset style" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Textarea */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Textarea</h2>
        <div class="space-y-6">
          {/* Basic usage */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Basic Usage</h3>
            <Textarea placeholder="Enter content" />
          </div>

          {/* minRows */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Minimum Lines (minRows)</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">minRows=1 (default)</p>
                <Textarea placeholder="1 line" />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">minRows=3</p>
                <Textarea minRows={3} placeholder="minimum 3 lines" />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">minRows=5</p>
                <Textarea minRows={5} placeholder="minimum 5 lines" />
              </div>
            </div>
          </div>

          {/* Size */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Size</h3>
            <div class="flex flex-col items-start gap-3">
              <Textarea size="sm" placeholder="Small" />
              <Textarea placeholder="Default" />
              <Textarea size="lg" placeholder="Large" />
            </div>
          </div>

          {/* State */}
          <div>
            <h3 class="mb-3 text-lg font-bold">State</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <Textarea disabled value="disabled" />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Invalid</p>
                <Invalid message="Example error message">
                  <Textarea placeholder="error state" />
                </Invalid>
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Inset (No Border)</p>
                <Textarea inset placeholder="inset style" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NumberInput */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">NumberInput</h2>
        <div class="space-y-6">
          {/* Basic usage */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Basic Usage</h3>
            <NumberInput placeholder="Enter a number" />
          </div>

          {/* Thousands comma */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Thousands Separator</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">comma=true (default)</p>
                <NumberInput value={1234567} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">comma=false</p>
                <NumberInput value={1234567} comma={false} />
              </div>
            </div>
          </div>

          {/* Decimal places */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Decimal Places (minDigits)</h3>
            <NumberInput value={100} minDigits={2} placeholder="minDigits=2" />
          </div>

          {/* State */}
          <div>
            <h3 class="mb-3 text-lg font-bold">State</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <NumberInput disabled value={9999} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">Invalid</p>
                <Invalid message="Example error message">
                  <NumberInput placeholder="error state" />
                </Invalid>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DatePicker */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">DatePicker</h2>
        <div class="space-y-6">
          {/* By type */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Type</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">date (default)</p>
                <DatePicker value={new DateOnly(2024, 6, 15)} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">month</p>
                <DatePicker unit="month" value={new DateOnly(2024, 6, 1)} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">year</p>
                <DatePicker unit="year" value={new DateOnly(2024, 1, 1)} />
              </div>
            </div>
          </div>

          {/* State */}
          <div>
            <h3 class="mb-3 text-lg font-bold">State</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <DatePicker disabled value={new DateOnly(2024, 1, 1)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DateTimePicker */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">DateTimePicker</h2>
        <div class="space-y-6">
          {/* By type */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Type</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">datetime (default)</p>
                <DateTimePicker value={new DateTime(2024, 6, 15, 14, 30)} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">datetime-sec (with seconds)</p>
                <DateTimePicker unit="second" value={new DateTime(2024, 6, 15, 14, 30, 45)} />
              </div>
            </div>
          </div>

          {/* State */}
          <div>
            <h3 class="mb-3 text-lg font-bold">State</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <DateTimePicker disabled value={new DateTime(2024, 1, 1, 12, 0)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TimePicker */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">TimePicker</h2>
        <div class="space-y-6">
          {/* By type */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Type</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">time (default)</p>
                <TimePicker value={new Time(14, 30)} />
              </div>
              <div>
                <p class="mb-1 text-sm text-base-500">time-sec (with seconds)</p>
                <TimePicker unit="second" value={new Time(14, 30, 45)} />
              </div>
            </div>
          </div>

          {/* State */}
          <div>
            <h3 class="mb-3 text-lg font-bold">State</h3>
            <div class="flex flex-col items-start gap-3">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <TimePicker disabled value={new Time(9, 0)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Validation */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Validation</h2>
        <div class="space-y-6">
          {/* TextInput Validation */}
          <div>
            <h3 class="mb-3 text-lg font-semibold">TextInput</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.currentTarget.reportValidity();
              }}
            >
              <div class="flex flex-col items-start gap-3">
                <TextInput required placeholder="Required input" />
                <TextInput required minLength={3} placeholder="Minimum 3 characters" />
                <TextInput pattern="^[0-9]+$" placeholder="Numbers only" />
                <TextInput
                  validate={(v) => (v.includes("@") ? undefined : "@ character is required")}
                  placeholder="Custom validation"
                />
                <TextInput required touchMode placeholder="touchMode (displays after blur)" />
                <NumberInput required min={0} max={100} placeholder="0-100" />
                <Textarea required minLength={10} placeholder="Minimum 10 characters" />
                <Button type="submit" theme="primary" variant="solid">
                  Submit
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Controlled */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Controlled</h2>
        <div class="space-y-6">
          {/* TextInput Controlled */}
          <div>
            <h3 class="mb-3 text-lg font-bold">TextInput</h3>
            <div class="flex flex-col items-start gap-3">
              <TextInput
                value={controlledText()}
                onValueChange={setControlledText}
                placeholder="Enter a value"
              />
              <p class="text-sm text-base-600 dark:text-base-400">
                Current value:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledText() ?? "(None)"}
                </code>
              </p>
              <Button
                theme="primary"
                variant="solid"
                size="sm"
                onClick={() => setControlledText("New value!")}
              >
                Change Value
              </Button>
            </div>
          </div>

          {/* NumberInput Controlled */}
          <div>
            <h3 class="mb-3 text-lg font-bold">NumberInput</h3>
            <div class="flex flex-col items-start gap-3">
              <NumberInput
                value={controlledNumber()}
                onValueChange={setControlledNumber}
                placeholder="Enter a number"
              />
              <p class="text-sm text-base-600 dark:text-base-400">
                Current value:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledNumber() ?? "(None)"}
                </code>
              </p>
              <div class="flex gap-2">
                <Button
                  theme="primary"
                  variant="solid"
                  size="sm"
                  onClick={() => setControlledNumber((v) => (v ?? 0) + 100)}
                >
                  +100
                </Button>
                <Button
                  theme="primary"
                  variant="solid"
                  size="sm"
                  onClick={() => setControlledNumber((v) => (v ?? 0) - 100)}
                >
                  -100
                </Button>
                <Button variant="solid" size="sm" onClick={() => setControlledNumber(undefined)}>
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Textarea Controlled */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Textarea</h3>
            <div class="flex flex-col items-start gap-3">
              <Textarea
                value={controlledTextArea()}
                onValueChange={setControlledTextArea}
                placeholder="Enter content"
                minRows={3}
              />
              <p class="text-sm text-base-600 dark:text-base-400">
                Current value:{" "}
                <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                  {controlledTextArea() ?? "(None)"}
                </code>
              </p>
              <Button
                theme="primary"
                variant="solid"
                size="sm"
                onClick={() => setControlledTextArea("Changed the value\nprogrammatically")}
              >
                Change Value
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
