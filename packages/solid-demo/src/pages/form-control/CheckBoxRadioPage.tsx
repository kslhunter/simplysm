import { createSignal, For } from "solid-js";
import { CheckBox, Radio, Topbar, TopbarContainer } from "@simplysm/solid";
import type { CheckBoxTheme } from "@simplysm/solid";

const themes: CheckBoxTheme[] = ["primary", "info", "success", "warning", "danger"];

export default function CheckBoxRadioPage() {
  const [controlledCheck, setControlledCheck] = createSignal(false);
  const [selectedRadio, setSelectedRadio] = createSignal<string>("A");

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">CheckBox & Radio</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
          {/* CheckBox */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">CheckBox</h2>
            <div class="space-y-6">
              {/* 기본 사용 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
                <div class="flex flex-col gap-3">
                  <CheckBox>이용약관에 동의합니다</CheckBox>
                  <CheckBox>마케팅 수신에 동의합니다</CheckBox>
                  <CheckBox />
                </div>
              </div>

              {/* 테마 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">테마</h3>
                <div class="flex flex-wrap gap-3">
                  <For each={themes}>
                    {(theme) => (
                      <CheckBox theme={theme} value={true}>
                        {theme}
                      </CheckBox>
                    )}
                  </For>
                </div>
              </div>

              {/* 사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">사이즈</h3>
                <div class="flex flex-col gap-3">
                  <CheckBox size="sm">Small</CheckBox>
                  <CheckBox>Default</CheckBox>
                  <CheckBox size="lg">Large</CheckBox>
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">상태</h3>
                <div class="flex flex-col gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled (unchecked)</p>
                    <CheckBox disabled>비활성화</CheckBox>
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled (checked)</p>
                    <CheckBox disabled value={true}>비활성화 (체크됨)</CheckBox>
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">Inset</p>
                    <CheckBox inset>인셋 스타일</CheckBox>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Radio */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">Radio</h2>
            <div class="space-y-6">
              {/* 기본 사용 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
                <div class="flex flex-col gap-3">
                  <Radio>옵션 A</Radio>
                  <Radio>옵션 B</Radio>
                  <Radio>옵션 C</Radio>
                </div>
              </div>

              {/* 테마 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">테마</h3>
                <div class="flex flex-wrap gap-3">
                  <For each={themes}>
                    {(theme) => (
                      <Radio theme={theme} value={true}>
                        {theme}
                      </Radio>
                    )}
                  </For>
                </div>
              </div>

              {/* 사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">사이즈</h3>
                <div class="flex flex-col gap-3">
                  <Radio size="sm">Small</Radio>
                  <Radio>Default</Radio>
                  <Radio size="lg">Large</Radio>
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">상태</h3>
                <div class="flex flex-col gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled</p>
                    <Radio disabled>비활성화</Radio>
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled (selected)</p>
                    <Radio disabled value={true}>비활성화 (선택됨)</Radio>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Controlled */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">Controlled</h2>
            <div class="space-y-6">
              {/* CheckBox Controlled */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">CheckBox</h3>
                <div class="flex max-w-md flex-col gap-3">
                  <CheckBox value={controlledCheck()} onChange={setControlledCheck}>
                    동의합니다
                  </CheckBox>
                  <p class="text-sm text-base-600 dark:text-base-400">
                    현재 값: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{String(controlledCheck())}</code>
                  </p>
                  <button
                    class="w-fit rounded bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600"
                    onClick={() => setControlledCheck((v) => !v)}
                  >
                    토글
                  </button>
                </div>
              </div>

              {/* Radio Controlled (그룹) */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Radio (그룹)</h3>
                <div class="flex max-w-md flex-col gap-3">
                  <Radio value={selectedRadio() === "A"} onChange={() => setSelectedRadio("A")}>
                    옵션 A
                  </Radio>
                  <Radio value={selectedRadio() === "B"} onChange={() => setSelectedRadio("B")}>
                    옵션 B
                  </Radio>
                  <Radio value={selectedRadio() === "C"} onChange={() => setSelectedRadio("C")}>
                    옵션 C
                  </Radio>
                  <p class="text-sm text-base-600 dark:text-base-400">
                    선택: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{selectedRadio()}</code>
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
