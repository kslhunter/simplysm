import { createSignal } from "solid-js";
import { Numpad } from "@simplysm/solid";

export default function NumpadPage() {
  const [basicValue, setBasicValue] = createSignal<number | undefined>();
  const [initialValue, setInitialValue] = createSignal<number | undefined>(123.45);
  const [enterValue, setEnterValue] = createSignal<number | undefined>();
  const [disabledValue, setDisabledValue] = createSignal<number | undefined>();

  return (
    <div class="space-y-12 p-6">
      {/* 기본 사용 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">기본 사용</h2>
        <div class="space-y-6">
          <div>
            <Numpad
              value={basicValue()}
              onValueChange={setBasicValue}
              placeholder="숫자를 입력하세요"
            />
            <p class="mt-2 text-sm text-base-600 dark:text-base-400">
              값:{" "}
              <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                {JSON.stringify(basicValue())}
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* 초기값 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">초기값</h2>
        <div class="space-y-6">
          <div>
            <Numpad value={initialValue()} onValueChange={setInitialValue} />
            <p class="mt-2 text-sm text-base-600 dark:text-base-400">
              값:{" "}
              <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                {JSON.stringify(initialValue())}
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* ENT & Minus 버튼 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">ENT & Minus 버튼</h2>
        <div class="space-y-6">
          <div>
            <Numpad
              value={enterValue()}
              onValueChange={setEnterValue}
              useEnterButton
              useMinusButton
              onEnterButtonClick={() => alert(`입력 값: ${enterValue()}`)}
            />
            <p class="mt-2 text-sm text-base-600 dark:text-base-400">
              값:{" "}
              <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                {JSON.stringify(enterValue())}
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* 입력 비활성화 & 필수 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          입력 비활성화 & 필수
        </h2>
        <div class="space-y-6">
          <div>
            <Numpad
              value={disabledValue()}
              onValueChange={setDisabledValue}
              inputDisabled
              required
              useEnterButton
              onEnterButtonClick={() => alert(`입력 값: ${disabledValue()}`)}
            />
            <p class="mt-2 text-sm text-base-600 dark:text-base-400">
              값:{" "}
              <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                {JSON.stringify(disabledValue())}
              </code>
            </p>
            <p class="mt-1 text-sm text-base-500 dark:text-base-400">
              텍스트 필드 직접 입력 비활성화, 값이 없으면 ENT 버튼 비활성화
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
