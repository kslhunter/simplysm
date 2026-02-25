import { createSignal } from "solid-js";
import { DateRangePicker } from "@simplysm/solid";
import type { DateRangePeriodType } from "@simplysm/solid";
import { DateOnly } from "@simplysm/core-common";

export default function DateRangePickerPage() {
  // Signals for controlled example
  const [periodType, setPeriodType] = createSignal<DateRangePeriodType>("range");
  const [from, setFrom] = createSignal<DateOnly | undefined>(new DateOnly(2025, 3, 1));
  const [to, setTo] = createSignal<DateOnly | undefined>(new DateOnly(2025, 3, 31));

  return (
    <div class="space-y-12 p-6">
      {/* Basic usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Usage</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Default (Range Mode)</h3>
            <DateRangePicker />
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">Set Initial Values</h3>
            <DateRangePicker
              periodType="range"
              from={new DateOnly(2025, 1, 1)}
              to={new DateOnly(2025, 12, 31)}
            />
          </div>
        </div>
      </section>

      {/* By period type */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Period Type</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Day</h3>
            <DateRangePicker periodType="day" from={new DateOnly(2025, 3, 15)} />
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">Month</h3>
            <DateRangePicker periodType="month" from={new DateOnly(2025, 3, 1)} />
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">Range</h3>
            <DateRangePicker
              periodType="range"
              from={new DateOnly(2025, 3, 1)}
              to={new DateOnly(2025, 3, 31)}
            />
          </div>
        </div>
      </section>

      {/* State */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">State</h2>
        <div class="space-y-6">
          <div>
            <p class="mb-1 text-sm text-base-500">Disabled</p>
            <DateRangePicker
              disabled
              periodType="range"
              from={new DateOnly(2025, 1, 1)}
              to={new DateOnly(2025, 12, 31)}
            />
          </div>
        </div>
      </section>

      {/* Size */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Size</h2>
        <div class="space-y-6">
          <div>
            <p class="mb-1 text-sm text-base-500">Small</p>
            <DateRangePicker
              size="sm"
              from={new DateOnly(2025, 3, 1)}
              to={new DateOnly(2025, 3, 31)}
            />
          </div>
          <div>
            <p class="mb-1 text-sm text-base-500">Default</p>
            <DateRangePicker from={new DateOnly(2025, 3, 1)} to={new DateOnly(2025, 3, 31)} />
          </div>
          <div>
            <p class="mb-1 text-sm text-base-500">Large</p>
            <DateRangePicker
              size="lg"
              from={new DateOnly(2025, 3, 1)}
              to={new DateOnly(2025, 3, 31)}
            />
          </div>
        </div>
      </section>

      {/* Controlled */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Controlled</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Track State</h3>
            <div class="flex flex-col items-start gap-3">
              <DateRangePicker
                periodType={periodType()}
                onPeriodTypeChange={setPeriodType}
                from={from()}
                onFromChange={setFrom}
                to={to()}
                onToChange={setTo}
              />
              <div class="text-sm text-base-600 dark:text-base-400">
                <p>
                  Period Type:{" "}
                  <code class="rounded bg-base-200 px-1 dark:bg-base-700">{periodType()}</code>
                </p>
                <p>
                  From:{" "}
                  <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                    {from()?.toFormatString("yyyy-MM-dd") ?? "(None)"}
                  </code>
                </p>
                <p>
                  To:{" "}
                  <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                    {to()?.toFormatString("yyyy-MM-dd") ?? "(None)"}
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
