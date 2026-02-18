import { createSignal } from "solid-js";
import { Show } from "solid-js";
import { Tabs, Topbar } from "@simplysm/solid";

export default function TabPage() {
  const [tab1, setTab1] = createSignal("general");
  const [tab2, setTab2] = createSignal("a");

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Tabs</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
          {/* 기본 사용 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">기본 사용</h2>
            <div class="space-y-4">
              <Tabs value={tab1()} onValueChange={setTab1}>
                <Tabs.Tab value="general">일반</Tabs.Tab>
                <Tabs.Tab value="advanced">고급</Tabs.Tab>
                <Tabs.Tab value="about">정보</Tabs.Tab>
              </Tabs>
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
            <Tabs value="a">
              <Tabs.Tab value="a">활성</Tabs.Tab>
              <Tabs.Tab value="b" disabled>
                비활성
              </Tabs.Tab>
              <Tabs.Tab value="c">활성</Tabs.Tab>
            </Tabs>
          </section>

          {/* 사이즈 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">사이즈</h2>
            <div class="space-y-6">
              <div>
                <h3 class="mb-3 text-lg font-bold">Small</h3>
                <Tabs size="sm" value={tab2()} onValueChange={setTab2}>
                  <Tabs.Tab value="a">탭 A</Tabs.Tab>
                  <Tabs.Tab value="b">탭 B</Tabs.Tab>
                  <Tabs.Tab value="c">탭 C</Tabs.Tab>
                </Tabs>
              </div>
              <div>
                <h3 class="mb-3 text-lg font-bold">Default</h3>
                <Tabs value={tab2()} onValueChange={setTab2}>
                  <Tabs.Tab value="a">탭 A</Tabs.Tab>
                  <Tabs.Tab value="b">탭 B</Tabs.Tab>
                  <Tabs.Tab value="c">탭 C</Tabs.Tab>
                </Tabs>
              </div>
              <div>
                <h3 class="mb-3 text-lg font-bold">Large</h3>
                <Tabs size="lg" value={tab2()} onValueChange={setTab2}>
                  <Tabs.Tab value="a">탭 A</Tabs.Tab>
                  <Tabs.Tab value="b">탭 B</Tabs.Tab>
                  <Tabs.Tab value="c">탭 C</Tabs.Tab>
                </Tabs>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
