import { createSignal } from "solid-js";
import { CheckboxGroup, RadioGroup, Topbar } from "@simplysm/solid";

export default function CheckboxRadioGroupPage() {
  const [selectedFruits, setSelectedFruits] = createSignal<string[]>(["apple"]);
  const [selectedOption, setSelectedOption] = createSignal<string>("A");

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">CheckboxGroup & RadioGroup</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
          {/* CheckboxGroup */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">CheckboxGroup</h2>
            <div class="space-y-6">
              {/* 기본 사용 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
                <CheckboxGroup value={selectedFruits()} onValueChange={setSelectedFruits}>
                  <CheckboxGroup.Item value="apple">사과</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="banana">바나나</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="cherry">체리</CheckboxGroup.Item>
                </CheckboxGroup>
                <p class="mt-2 text-sm text-base-600 dark:text-base-400">
                  선택:{" "}
                  <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                    {JSON.stringify(selectedFruits())}
                  </code>
                </p>
              </div>

              {/* disabled 아이템 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Disabled</h3>
                <CheckboxGroup>
                  <CheckboxGroup.Item value="a">활성</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="b" disabled>
                    비활성
                  </CheckboxGroup.Item>
                </CheckboxGroup>
              </div>

              {/* 전체 disabled */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">전체 Disabled</h3>
                <CheckboxGroup disabled value={["a"]}>
                  <CheckboxGroup.Item value="a">옵션 A</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="b">옵션 B</CheckboxGroup.Item>
                </CheckboxGroup>
              </div>

              {/* 사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">사이즈</h3>
                <CheckboxGroup size="sm" value={["x"]}>
                  <CheckboxGroup.Item value="x">Small A</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="y">Small B</CheckboxGroup.Item>
                </CheckboxGroup>
              </div>

              {/* inline */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Inline</h3>
                <CheckboxGroup inline value={["a"]}>
                  <CheckboxGroup.Item value="a">Inline A</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="b">Inline B</CheckboxGroup.Item>
                </CheckboxGroup>
              </div>

              {/* inset */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Inset</h3>
                <CheckboxGroup inset value={["a"]}>
                  <CheckboxGroup.Item value="a">Inset A</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="b">Inset B</CheckboxGroup.Item>
                </CheckboxGroup>
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
                <RadioGroup value={selectedOption()} onValueChange={setSelectedOption}>
                  <RadioGroup.Item value="A">옵션 A</RadioGroup.Item>
                  <RadioGroup.Item value="B">옵션 B</RadioGroup.Item>
                  <RadioGroup.Item value="C">옵션 C</RadioGroup.Item>
                </RadioGroup>
                <p class="mt-2 text-sm text-base-600 dark:text-base-400">
                  선택:{" "}
                  <code class="rounded bg-base-200 px-1 dark:bg-base-700">{selectedOption()}</code>
                </p>
              </div>

              {/* disabled 아이템 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Disabled</h3>
                <RadioGroup>
                  <RadioGroup.Item value="a">활성</RadioGroup.Item>
                  <RadioGroup.Item value="b" disabled>
                    비활성
                  </RadioGroup.Item>
                </RadioGroup>
              </div>

              {/* 전체 disabled */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">전체 Disabled</h3>
                <RadioGroup disabled value="a">
                  <RadioGroup.Item value="a">옵션 A</RadioGroup.Item>
                  <RadioGroup.Item value="b">옵션 B</RadioGroup.Item>
                </RadioGroup>
              </div>

              {/* 사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">사이즈</h3>
                <RadioGroup size="lg" value="x">
                  <RadioGroup.Item value="x">Large A</RadioGroup.Item>
                  <RadioGroup.Item value="y">Large B</RadioGroup.Item>
                </RadioGroup>
              </div>

              {/* inline */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Inline</h3>
                <RadioGroup inline value="a">
                  <RadioGroup.Item value="a">Inline A</RadioGroup.Item>
                  <RadioGroup.Item value="b">Inline B</RadioGroup.Item>
                </RadioGroup>
              </div>

              {/* inset */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Inset</h3>
                <RadioGroup inset value="a">
                  <RadioGroup.Item value="a">Inset A</RadioGroup.Item>
                  <RadioGroup.Item value="b">Inset B</RadioGroup.Item>
                </RadioGroup>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
