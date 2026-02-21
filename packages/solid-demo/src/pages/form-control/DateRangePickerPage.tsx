import { createSignal } from "solid-js";
import { DateRangePicker } from "@simplysm/solid";
import type { DateRangePeriodType } from "@simplysm/solid";
import { DateOnly } from "@simplysm/core-common";

export default function DateRangePickerPage() {
  // Controlled 예제용 시그널
  const [periodType, setPeriodType] = createSignal<DateRangePeriodType>("range");
  const [from, setFrom] = createSignal<DateOnly | undefined>(new DateOnly(2025, 3, 1));
  const [to, setTo] = createSignal<DateOnly | undefined>(new DateOnly(2025, 3, 31));

  return (
    <div class="space-y-12 p-6">
      {/* 기본 사용 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">기본 사용</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">기본 (범위 모드)</h3>
            <DateRangePicker />
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">초기값 설정</h3>
            <DateRangePicker
              periodType="range"
              from={new DateOnly(2025, 1, 1)}
              to={new DateOnly(2025, 12, 31)}
            />
          </div>
        </div>
      </section>

      {/* 기간 타입별 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">기간 타입</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">일</h3>
            <DateRangePicker periodType="day" from={new DateOnly(2025, 3, 15)} />
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">월</h3>
            <DateRangePicker periodType="month" from={new DateOnly(2025, 3, 1)} />
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">범위</h3>
            <DateRangePicker
              periodType="range"
              from={new DateOnly(2025, 3, 1)}
              to={new DateOnly(2025, 3, 31)}
            />
          </div>
        </div>
      </section>

      {/* 상태 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">상태</h2>
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

      {/* 사이즈 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">사이즈</h2>
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
            <h3 class="mb-3 text-lg font-bold">상태 추적</h3>
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
                  기간 타입:{" "}
                  <code class="rounded bg-base-200 px-1 dark:bg-base-700">{periodType()}</code>
                </p>
                <p>
                  From:{" "}
                  <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                    {from()?.toFormatString("yyyy-MM-dd") ?? "(없음)"}
                  </code>
                </p>
                <p>
                  To:{" "}
                  <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                    {to()?.toFormatString("yyyy-MM-dd") ?? "(없음)"}
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
