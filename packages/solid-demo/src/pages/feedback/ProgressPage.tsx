import { For } from "solid-js";
import { Progress, type ProgressTheme, Topbar } from "@simplysm/solid";

const themes: ProgressTheme[] = ["primary", "info", "success", "warning", "danger", "base"];

export default function ProgressPage() {
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Progress</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 테마 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">테마</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              Progress 컴포넌트는 6가지 테마를 지원합니다. 기본값은 primary입니다.
            </p>
            <div class="space-y-2">
              <For each={themes}>{(theme) => <Progress theme={theme} value={0.75} />}</For>
            </div>
          </section>

          {/* 사이즈 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">사이즈</h2>
            <div class="space-y-2">
              <Progress value={0.6} size="sm" />
              <Progress value={0.6} />
              <Progress value={0.6} size="lg" />
            </div>
          </section>

          {/* Inset */}
          <section>
            <h2 class="mb-4 text-xl font-bold">Inset</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              inset을 사용하면 테두리와 둥근 모서리가 제거됩니다.
            </p>
            <div class="rounded border border-base-300 dark:border-base-700">
              <Progress value={0.5} inset />
            </div>
          </section>

          {/* 커스텀 콘텐츠 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">커스텀 콘텐츠</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              children을 전달하면 백분율 대신 커스텀 텍스트를 표시합니다.
            </p>
            <div class="space-y-2">
              <Progress value={0.3} theme="info">
                3/10 완료
              </Progress>
              <Progress value={0.75} theme="success">
                다운로드 중...
              </Progress>
            </div>
          </section>

          {/* 다양한 진행률 */}
          <section>
            <h2 class="mb-4 text-xl font-bold">진행률</h2>
            <div class="space-y-2">
              <Progress value={0} />
              <Progress value={0.25} />
              <Progress value={0.5} />
              <Progress value={0.75} />
              <Progress value={1} />
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
