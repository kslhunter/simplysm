import { For } from "solid-js";
import { Progress, type ProgressTheme } from "@simplysm/solid";

const themes: ProgressTheme[] = ["primary", "info", "success", "warning", "danger", "base"];

export default function ProgressPage() {
  return (
    <div class="space-y-8 p-6">
      {/* Theme */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">테마</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Progress 컴포넌트는 6가지 테마를 지원합니다. 기본값은 primary입니다.
        </p>
        <div class="space-y-2">
          <For each={themes}>{(theme) => <Progress theme={theme} value={0.75} />}</For>
        </div>
      </section>

      {/* Size */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">사이즈</h2>
        <div class="space-y-2">
          <Progress value={0.6} size="sm" />
          <Progress value={0.6} />
          <Progress value={0.6} size="lg" />
        </div>
      </section>

      {/* Inset */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Inset</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          inset을 사용하면 테두리와 둥근 모서리가 제거됩니다.
        </p>
        <div class="rounded border border-base-300 dark:border-base-700">
          <Progress value={0.5} inset />
        </div>
      </section>

      {/* Custom content */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">커스텀 콘텐츠</h2>
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

      {/* Various progress levels */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">진행률</h2>
        <div class="space-y-2">
          <Progress value={0} />
          <Progress value={0.25} />
          <Progress value={0.5} />
          <Progress value={0.75} />
          <Progress value={1} />
        </div>
      </section>
    </div>
  );
}
