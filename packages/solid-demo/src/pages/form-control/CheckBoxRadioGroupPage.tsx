import { createSignal } from "solid-js";
import { CheckBoxGroup, RadioGroup, Topbar } from "@simplysm/solid";

export default function CheckBoxRadioGroupPage() {
  const [selectedFruits, setSelectedFruits] = createSignal<string[]>(["apple"]);
  const [selectedOption, setSelectedOption] = createSignal<string>("A");

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">CheckBoxGroup & RadioGroup</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
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
                <CheckBoxGroup>
                  <CheckBoxGroup.Item value="a">활성</CheckBoxGroup.Item>
                  <CheckBoxGroup.Item value="b" disabled>비활성</CheckBoxGroup.Item>
                </CheckBoxGroup>
              </div>

              {/* 전체 disabled */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">전체 Disabled</h3>
                <CheckBoxGroup disabled value={["a"]}>
                  <CheckBoxGroup.Item value="a">옵션 A</CheckBoxGroup.Item>
                  <CheckBoxGroup.Item value="b">옵션 B</CheckBoxGroup.Item>
                </CheckBoxGroup>
              </div>

              {/* 테마/사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">테마 & 사이즈</h3>
                <CheckBoxGroup theme="success" size="sm" value={["x"]}>
                  <CheckBoxGroup.Item value="x">Small Success A</CheckBoxGroup.Item>
                  <CheckBoxGroup.Item value="y">Small Success B</CheckBoxGroup.Item>
                </CheckBoxGroup>
              </div>

              {/* inline */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Inline</h3>
                <CheckBoxGroup inline value={["a"]}>
                  <CheckBoxGroup.Item value="a">Inline A</CheckBoxGroup.Item>
                  <CheckBoxGroup.Item value="b">Inline B</CheckBoxGroup.Item>
                </CheckBoxGroup>
              </div>

              {/* inset */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">Inset</h3>
                <CheckBoxGroup inset value={["a"]}>
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
                <RadioGroup>
                  <RadioGroup.Item value="a">활성</RadioGroup.Item>
                  <RadioGroup.Item value="b" disabled>비활성</RadioGroup.Item>
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

              {/* 테마/사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-semibold">테마 & 사이즈</h3>
                <RadioGroup theme="danger" size="lg" value="x">
                  <RadioGroup.Item value="x">Large Danger A</RadioGroup.Item>
                  <RadioGroup.Item value="y">Large Danger B</RadioGroup.Item>
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
