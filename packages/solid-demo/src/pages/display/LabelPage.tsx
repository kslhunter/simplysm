import { For } from "solid-js";
import { Label, type LabelTheme, Topbar, TopbarContainer } from "@simplysm/solid";

const themes: LabelTheme[] = ["primary", "info", "success", "warning", "danger", "gray"];

export default function LabelPage() {
  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Label</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* All Themes */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">테마</h2>
            <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Label 컴포넌트는 6가지 테마를 지원합니다. 기본값은 gray입니다.
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <For each={themes}>
                {(theme) => (
                  <Label theme={theme}>{theme}</Label>
                )}
              </For>
            </div>
          </section>

          {/* Default (no theme) */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 라벨</h2>
            <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
              theme을 지정하지 않으면 gray 테마가 적용됩니다.
            </p>
            <Label>기본 라벨</Label>
          </section>

          {/* Use Cases */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">활용 예시</h2>
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="font-semibold">상태:</span>
                <Label theme="success">완료</Label>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-semibold">상태:</span>
                <Label theme="warning">대기중</Label>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-semibold">상태:</span>
                <Label theme="danger">오류</Label>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-semibold">버전:</span>
                <Label theme="info">v1.0.0</Label>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-semibold">카테고리:</span>
                <Label theme="primary">공지사항</Label>
                <Label theme="gray">일반</Label>
              </div>
            </div>
          </section>

          {/* In a List */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">목록에서 사용</h2>
            <div class="divide-y divide-gray-200 rounded border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
              <div class="flex items-center justify-between p-3">
                <span>사용자 등록 완료</span>
                <Label theme="success">완료</Label>
              </div>
              <div class="flex items-center justify-between p-3">
                <span>결제 처리 중</span>
                <Label theme="warning">진행중</Label>
              </div>
              <div class="flex items-center justify-between p-3">
                <span>서버 오류 발생</span>
                <Label theme="danger">실패</Label>
              </div>
              <div class="flex items-center justify-between p-3">
                <span>새로운 기능 배포</span>
                <Label theme="info">신규</Label>
              </div>
            </div>
          </section>

          {/* Custom Styling */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">커스텀 스타일링</h2>
            <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
              class prop으로 추가 스타일을 적용할 수 있습니다.
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <Label theme="primary" class="text-lg">큰 라벨</Label>
              <Label theme="success" class="rounded-full px-3">둥근 라벨</Label>
              <Label theme="info" class="font-bold">굵은 라벨</Label>
            </div>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
