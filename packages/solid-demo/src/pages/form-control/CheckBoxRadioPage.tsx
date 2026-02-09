import { createSignal, For } from "solid-js";
import { CheckBox, CheckBoxGroup, Radio, RadioGroup, Topbar } from "@simplysm/solid";
import type { CheckBoxTheme } from "@simplysm/solid";

const themes: CheckBoxTheme[] = ["primary", "info", "success", "warning", "danger"];

export default function CheckBoxRadioPage() {
  const [controlledCheck, setControlledCheck] = createSignal(false);
  const [selectedRadio, setSelectedRadio] = createSignal<string>("A");
  const [selectedFruits, setSelectedFruits] = createSignal<string[]>(["apple"]);
  const [selectedOption, setSelectedOption] = createSignal<string>("A");

  return (
    <Topbar.Container>
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
                <div class="flex flex-col items-start gap-3">
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
                <div class="flex flex-col items-start gap-3">
                  <CheckBox size="sm">Small</CheckBox>
                  <CheckBox>Default</CheckBox>
                  <CheckBox size="lg">Large</CheckBox>
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">상태</h3>
                <div class="flex flex-col items-start gap-3">
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

              {/* 인라인 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">인라인</h3>
                <p class="text-base-700 dark:text-base-300">
                  텍스트 사이에 <CheckBox inline>동의</CheckBox> 체크박스를 넣을 수 있습니다.
                  이렇게 <CheckBox inline value={true}>선택된</CheckBox> 상태로도 표시됩니다.
                </p>
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
                <div class="flex flex-col items-start gap-3">
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
                <div class="flex flex-col items-start gap-3">
                  <Radio size="sm">Small</Radio>
                  <Radio>Default</Radio>
                  <Radio size="lg">Large</Radio>
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">상태</h3>
                <div class="flex flex-col items-start gap-3">
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

              {/* 인라인 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">인라인</h3>
                <p class="text-base-700 dark:text-base-300">
                  텍스트 사이에 <Radio inline>옵션</Radio> 라디오를 넣을 수 있습니다.
                  이렇게 <Radio inline value={true}>선택됨</Radio> 상태로도 표시됩니다.
                </p>
              </div>
            </div>
          </section>

          {/* CheckBoxGroup */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">CheckBoxGroup</h2>
            <div class="space-y-6">
              {/* 기본 사용 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
                <CheckBoxGroup
                  value={selectedFruits()}
                  onValueChange={setSelectedFruits}
                  class="flex-col gap-1"
                >
                  <CheckBoxGroup.Item value="apple">사과</CheckBoxGroup.Item>
                  <CheckBoxGroup.Item value="banana">바나나</CheckBoxGroup.Item>
                  <CheckBoxGroup.Item value="cherry">체리</CheckBoxGroup.Item>
                </CheckBoxGroup>
                <p class="mt-2 text-sm text-base-600 dark:text-base-400">
                  선택: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{JSON.stringify(selectedFruits())}</code>
                </p>
              </div>

              {/* disabled 아이템 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Disabled</h3>
                <CheckBoxGroup class="flex-col gap-1">
                  <CheckBoxGroup.Item value="a">활성</CheckBoxGroup.Item>
                  <CheckBoxGroup.Item value="b" disabled>비활성</CheckBoxGroup.Item>
                </CheckBoxGroup>
              </div>

              {/* 전체 disabled */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">전체 Disabled</h3>
                <CheckBoxGroup disabled value={["a"]} class="flex-col gap-1">
                  <CheckBoxGroup.Item value="a">옵션 A</CheckBoxGroup.Item>
                  <CheckBoxGroup.Item value="b">옵션 B</CheckBoxGroup.Item>
                </CheckBoxGroup>
              </div>

              {/* 테마/사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">테마 & 사이즈</h3>
                <CheckBoxGroup theme="success" size="sm" value={["x"]} class="gap-3">
                  <CheckBoxGroup.Item value="x">Small Success A</CheckBoxGroup.Item>
                  <CheckBoxGroup.Item value="y">Small Success B</CheckBoxGroup.Item>
                </CheckBoxGroup>
              </div>

              {/* inset */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Inset</h3>
                <CheckBoxGroup inset value={["a"]} class="flex-col">
                  <CheckBoxGroup.Item value="a">Inset A</CheckBoxGroup.Item>
                  <CheckBoxGroup.Item value="b">Inset B</CheckBoxGroup.Item>
                </CheckBoxGroup>
              </div>
            </div>
          </section>

          {/* RadioGroup */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">RadioGroup</h2>
            <div class="space-y-6">
              {/* 기본 사용 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
                <RadioGroup
                  value={selectedOption()}
                  onValueChange={setSelectedOption}
                  class="flex-col gap-1"
                >
                  <RadioGroup.Item value="A">옵션 A</RadioGroup.Item>
                  <RadioGroup.Item value="B">옵션 B</RadioGroup.Item>
                  <RadioGroup.Item value="C">옵션 C</RadioGroup.Item>
                </RadioGroup>
                <p class="mt-2 text-sm text-base-600 dark:text-base-400">
                  선택: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{selectedOption()}</code>
                </p>
              </div>

              {/* disabled 아이템 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Disabled</h3>
                <RadioGroup class="flex-col gap-1">
                  <RadioGroup.Item value="a">활성</RadioGroup.Item>
                  <RadioGroup.Item value="b" disabled>비활성</RadioGroup.Item>
                </RadioGroup>
              </div>

              {/* 전체 disabled */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">전체 Disabled</h3>
                <RadioGroup disabled value="a" class="flex-col gap-1">
                  <RadioGroup.Item value="a">옵션 A</RadioGroup.Item>
                  <RadioGroup.Item value="b">옵션 B</RadioGroup.Item>
                </RadioGroup>
              </div>

              {/* 테마/사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">테마 & 사이즈</h3>
                <RadioGroup theme="danger" size="lg" value="x" class="gap-3">
                  <RadioGroup.Item value="x">Large Danger A</RadioGroup.Item>
                  <RadioGroup.Item value="y">Large Danger B</RadioGroup.Item>
                </RadioGroup>
              </div>

              {/* inset */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Inset</h3>
                <RadioGroup inset value="a" class="flex-col">
                  <RadioGroup.Item value="a">Inset A</RadioGroup.Item>
                  <RadioGroup.Item value="b">Inset B</RadioGroup.Item>
                </RadioGroup>
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
                <div class="flex flex-col items-start gap-3">
                  <CheckBox value={controlledCheck()} onValueChange={setControlledCheck}>
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
                <div class="flex flex-col items-start gap-3">
                  <Radio value={selectedRadio() === "A"} onValueChange={() => setSelectedRadio("A")}>
                    옵션 A
                  </Radio>
                  <Radio value={selectedRadio() === "B"} onValueChange={() => setSelectedRadio("B")}>
                    옵션 B
                  </Radio>
                  <Radio value={selectedRadio() === "C"} onValueChange={() => setSelectedRadio("C")}>
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
    </Topbar.Container>
  );
}
