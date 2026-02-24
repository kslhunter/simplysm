import { createSignal } from "solid-js";
import { CheckboxGroup, RadioGroup } from "@simplysm/solid";

export default function CheckboxRadioGroupPage() {
  const [selectedFruits, setSelectedFruits] = createSignal<string[]>(["apple"]);
  const [selectedOption, setSelectedOption] = createSignal<string>("A");

  return (
    <div class="space-y-12 p-6">
      {/* CheckboxGroup */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">CheckboxGroup</h2>
        <div class="space-y-6">
          {/* Basic usage */}
          <div>
            <h3 class="mb-3 text-lg font-bold">기본 사용</h3>
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

          {/* Disabled item */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Disabled</h3>
            <CheckboxGroup>
              <CheckboxGroup.Item value="a">활성</CheckboxGroup.Item>
              <CheckboxGroup.Item value="b" disabled>
                비활성
              </CheckboxGroup.Item>
            </CheckboxGroup>
          </div>

          {/* All disabled */}
          <div>
            <h3 class="mb-3 text-lg font-bold">전체 Disabled</h3>
            <CheckboxGroup disabled value={["a"]}>
              <CheckboxGroup.Item value="a">옵션 A</CheckboxGroup.Item>
              <CheckboxGroup.Item value="b">옵션 B</CheckboxGroup.Item>
            </CheckboxGroup>
          </div>

          {/* Size */}
          <div>
            <h3 class="mb-3 text-lg font-bold">사이즈</h3>
            <CheckboxGroup size="sm" value={["x"]}>
              <CheckboxGroup.Item value="x">Small A</CheckboxGroup.Item>
              <CheckboxGroup.Item value="y">Small B</CheckboxGroup.Item>
            </CheckboxGroup>
          </div>

          {/* inline */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Inline</h3>
            <CheckboxGroup inline value={["a"]}>
              <CheckboxGroup.Item value="a">Inline A</CheckboxGroup.Item>
              <CheckboxGroup.Item value="b">Inline B</CheckboxGroup.Item>
            </CheckboxGroup>
          </div>

          {/* inset */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Inset</h3>
            <CheckboxGroup inset value={["a"]}>
              <CheckboxGroup.Item value="a">Inset A</CheckboxGroup.Item>
              <CheckboxGroup.Item value="b">Inset B</CheckboxGroup.Item>
            </CheckboxGroup>
          </div>
        </div>
      </section>

      {/* Validation */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Validation</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">CheckboxGroup Required</h3>
            <CheckboxGroup required value={[]}>
              <CheckboxGroup.Item value="a">옵션 A</CheckboxGroup.Item>
              <CheckboxGroup.Item value="b">옵션 B</CheckboxGroup.Item>
              <CheckboxGroup.Item value="c">옵션 C</CheckboxGroup.Item>
            </CheckboxGroup>
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">RadioGroup Required</h3>
            <RadioGroup required>
              <RadioGroup.Item value="a">옵션 A</RadioGroup.Item>
              <RadioGroup.Item value="b">옵션 B</RadioGroup.Item>
            </RadioGroup>
          </div>
          <div>
            <h3 class="mb-3 text-lg font-bold">touchMode (blur 후 표시)</h3>
            <CheckboxGroup required touchMode value={[]}>
              <CheckboxGroup.Item value="x">X</CheckboxGroup.Item>
              <CheckboxGroup.Item value="y">Y</CheckboxGroup.Item>
            </CheckboxGroup>
          </div>
        </div>
      </section>

      {/* RadioGroup */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">RadioGroup</h2>
        <div class="space-y-6">
          {/* Basic usage */}
          <div>
            <h3 class="mb-3 text-lg font-bold">기본 사용</h3>
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

          {/* Disabled item */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Disabled</h3>
            <RadioGroup>
              <RadioGroup.Item value="a">활성</RadioGroup.Item>
              <RadioGroup.Item value="b" disabled>
                비활성
              </RadioGroup.Item>
            </RadioGroup>
          </div>

          {/* All disabled */}
          <div>
            <h3 class="mb-3 text-lg font-bold">전체 Disabled</h3>
            <RadioGroup disabled value="a">
              <RadioGroup.Item value="a">옵션 A</RadioGroup.Item>
              <RadioGroup.Item value="b">옵션 B</RadioGroup.Item>
            </RadioGroup>
          </div>

          {/* Size */}
          <div>
            <h3 class="mb-3 text-lg font-bold">사이즈</h3>
            <RadioGroup size="lg" value="x">
              <RadioGroup.Item value="x">Large A</RadioGroup.Item>
              <RadioGroup.Item value="y">Large B</RadioGroup.Item>
            </RadioGroup>
          </div>

          {/* inline */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Inline</h3>
            <RadioGroup inline value="a">
              <RadioGroup.Item value="a">Inline A</RadioGroup.Item>
              <RadioGroup.Item value="b">Inline B</RadioGroup.Item>
            </RadioGroup>
          </div>

          {/* inset */}
          <div>
            <h3 class="mb-3 text-lg font-bold">Inset</h3>
            <RadioGroup inset value="a">
              <RadioGroup.Item value="a">Inset A</RadioGroup.Item>
              <RadioGroup.Item value="b">Inset B</RadioGroup.Item>
            </RadioGroup>
          </div>
        </div>
      </section>
    </div>
  );
}
