import { createSignal } from "solid-js";
import { Show } from "solid-js";
import { Tab, Topbar } from "@simplysm/solid";

export default function TabPage() {
  const [tab1, setTab1] = createSignal("general");
  const [tab2, setTab2] = createSignal("a");

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Tab</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
          {/* 기본 사용 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">기본 사용</h2>
            <div class="space-y-4">
              <Tab value={tab1()} onValueChange={setTab1}>
                <Tab.Item value="general">일반</Tab.Item>
                <Tab.Item value="advanced">고급</Tab.Item>
                <Tab.Item value="about">정보</Tab.Item>
              </Tab>
              <div class="rounded border border-base-200 p-4 dark:border-base-700">
                <Show when={tab1() === "general"}>
                  <p>일반 설정 내용입니다.</p>
                </Show>
                <Show when={tab1() === "advanced"}>
                  <p>고급 설정 내용입니다.</p>
                </Show>
                <Show when={tab1() === "about"}>
                  <p>정보 페이지입니다.</p>
                </Show>
              </div>
              <p class="text-sm text-base-600 dark:text-base-400">
                선택: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{tab1()}</code>
              </p>
            </div>
          </section>

          {/* Disabled */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">Disabled</h2>
            <Tab value="a">
              <Tab.Item value="a">활성</Tab.Item>
              <Tab.Item value="b" disabled>비활성</Tab.Item>
              <Tab.Item value="c">활성</Tab.Item>
            </Tab>
          </section>

          {/* 사이즈 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">사이즈</h2>
            <div class="space-y-6">
              <div>
                <h3 class="mb-3 text-lg font-semibold">Small</h3>
                <Tab size="sm" value={tab2()} onValueChange={setTab2}>
                  <Tab.Item value="a">탭 A</Tab.Item>
                  <Tab.Item value="b">탭 B</Tab.Item>
                  <Tab.Item value="c">탭 C</Tab.Item>
                </Tab>
              </div>
              <div>
                <h3 class="mb-3 text-lg font-semibold">Default</h3>
                <Tab value={tab2()} onValueChange={setTab2}>
                  <Tab.Item value="a">탭 A</Tab.Item>
                  <Tab.Item value="b">탭 B</Tab.Item>
                  <Tab.Item value="c">탭 C</Tab.Item>
                </Tab>
              </div>
              <div>
                <h3 class="mb-3 text-lg font-semibold">Large</h3>
                <Tab size="lg" value={tab2()} onValueChange={setTab2}>
                  <Tab.Item value="a">탭 A</Tab.Item>
                  <Tab.Item value="b">탭 B</Tab.Item>
                  <Tab.Item value="c">탭 C</Tab.Item>
                </Tab>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
