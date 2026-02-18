import { createSignal } from "solid-js";
import { Checkbox, Radio, Topbar, Button } from "@simplysm/solid";

export default function CheckboxRadioPage() {
  const [controlledCheck, setControlledCheck] = createSignal(false);
  const [selectedRadio, setSelectedRadio] = createSignal<string>("A");

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Checkbox & Radio</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
          {/* Checkbox */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">Checkbox</h2>
            <div class="space-y-6">
              {/* 기본 사용 */}
              <div>
                <h3 class="mb-3 text-lg font-bold">기본 사용</h3>
                <div class="flex flex-col items-start gap-3">
                  <Checkbox>이용약관에 동의합니다</Checkbox>
                  <Checkbox>마케팅 수신에 동의합니다</Checkbox>
                  <Checkbox />
                </div>
              </div>

              {/* 사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-bold">사이즈</h3>
                <div class="flex flex-col items-start gap-3">
                  <Checkbox size="sm">Small</Checkbox>
                  <Checkbox>Default</Checkbox>
                  <Checkbox size="lg">Large</Checkbox>
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-bold">상태</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled (unchecked)</p>
                    <Checkbox disabled>비활성화</Checkbox>
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled (checked)</p>
                    <Checkbox disabled value={true}>
                      비활성화 (체크됨)
                    </Checkbox>
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">Inset</p>
                    <Checkbox inset>인셋 스타일</Checkbox>
                  </div>
                </div>
              </div>

              {/* 인라인 */}
              <div>
                <h3 class="mb-3 text-lg font-bold">인라인</h3>
                <p class="text-base-700 dark:text-base-300">
                  텍스트 사이에 <Checkbox inline>동의</Checkbox> 체크박스를 넣을 수 있습니다. 이렇게{" "}
                  <Checkbox inline value={true}>
                    선택된
                  </Checkbox>{" "}
                  상태로도 표시됩니다.
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
                <h3 class="mb-3 text-lg font-bold">기본 사용</h3>
                <div class="flex flex-col items-start gap-3">
                  <Radio>옵션 A</Radio>
                  <Radio>옵션 B</Radio>
                  <Radio>옵션 C</Radio>
                </div>
              </div>

              {/* 사이즈 */}
              <div>
                <h3 class="mb-3 text-lg font-bold">사이즈</h3>
                <div class="flex flex-col items-start gap-3">
                  <Radio size="sm">Small</Radio>
                  <Radio>Default</Radio>
                  <Radio size="lg">Large</Radio>
                </div>
              </div>

              {/* 상태 */}
              <div>
                <h3 class="mb-3 text-lg font-bold">상태</h3>
                <div class="flex flex-col items-start gap-3">
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled</p>
                    <Radio disabled>비활성화</Radio>
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-base-500">Disabled (selected)</p>
                    <Radio disabled value={true}>
                      비활성화 (선택됨)
                    </Radio>
                  </div>
                </div>
              </div>

              {/* 인라인 */}
              <div>
                <h3 class="mb-3 text-lg font-bold">인라인</h3>
                <p class="text-base-700 dark:text-base-300">
                  텍스트 사이에 <Radio inline>옵션</Radio> 라디오를 넣을 수 있습니다. 이렇게{" "}
                  <Radio inline value={true}>
                    선택됨
                  </Radio>{" "}
                  상태로도 표시됩니다.
                </p>
              </div>
            </div>
          </section>

          {/* Validation */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">Validation</h2>
            <div class="space-y-6">
              <div>
                <h3 class="mb-3 text-lg font-bold">Required</h3>
                <div class="flex flex-col items-start gap-3">
                  <Checkbox required value={false}>
                    필수 체크
                  </Checkbox>
                  <Radio required value={false}>
                    필수 선택
                  </Radio>
                </div>
              </div>
              <div>
                <h3 class="mb-3 text-lg font-bold">touchMode (blur 후 표시)</h3>
                <div class="flex flex-col items-start gap-3">
                  <Checkbox required touchMode value={false}>
                    touchMode 필수 체크
                  </Checkbox>
                </div>
              </div>
            </div>
          </section>

          {/* Controlled */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">Controlled</h2>
            <div class="space-y-6">
              {/* Checkbox Controlled */}
              <div>
                <h3 class="mb-3 text-lg font-bold">Checkbox</h3>
                <div class="flex flex-col items-start gap-3">
                  <Checkbox value={controlledCheck()} onValueChange={setControlledCheck}>
                    동의합니다
                  </Checkbox>
                  <p class="text-sm text-base-600 dark:text-base-400">
                    현재 값:{" "}
                    <code class="rounded bg-base-200 px-1 dark:bg-base-700">
                      {String(controlledCheck())}
                    </code>
                  </p>
                  <Button
                    theme="primary"
                    variant="solid"
                    size="sm"
                    onClick={() => setControlledCheck((v) => !v)}
                  >
                    토글
                  </Button>
                </div>
              </div>

              {/* Radio Controlled (그룹) */}
              <div>
                <h3 class="mb-3 text-lg font-bold">Radio (그룹)</h3>
                <div class="flex flex-col items-start gap-3">
                  <Radio
                    value={selectedRadio() === "A"}
                    onValueChange={() => setSelectedRadio("A")}
                  >
                    옵션 A
                  </Radio>
                  <Radio
                    value={selectedRadio() === "B"}
                    onValueChange={() => setSelectedRadio("B")}
                  >
                    옵션 B
                  </Radio>
                  <Radio
                    value={selectedRadio() === "C"}
                    onValueChange={() => setSelectedRadio("C")}
                  >
                    옵션 C
                  </Radio>
                  <p class="text-sm text-base-600 dark:text-base-400">
                    선택:{" "}
                    <code class="rounded bg-base-200 px-1 dark:bg-base-700">{selectedRadio()}</code>
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
