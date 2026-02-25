import { For } from "solid-js";
import { Progress, type ProgressTheme } from "@simplysm/solid";

const themes: ProgressTheme[] = ["primary", "info", "success", "warning", "danger", "base"];

export default function ProgressPage() {
  return (
    <div class="space-y-8 p-6">
      {/* Theme */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Themes</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          The Progress component supports 6 themes. Default is primary.
        </p>
        <div class="space-y-2">
          <For each={themes}>{(theme) => <Progress theme={theme} value={0.75} />}</For>
        </div>
      </section>

      {/* Size */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Size</h2>
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
          Using inset removes the border and rounded corners.
        </p>
        <div class="rounded border border-base-300 dark:border-base-700">
          <Progress value={0.5} inset />
        </div>
      </section>

      {/* Custom content */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Custom Content</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Pass children to display custom text instead of a percentage.
        </p>
        <div class="space-y-2">
          <Progress value={0.3} theme="info">
            3/10 Completed
          </Progress>
          <Progress value={0.75} theme="success">
            Downloading...
          </Progress>
        </div>
      </section>

      {/* Various progress levels */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Progress Levels</h2>
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
