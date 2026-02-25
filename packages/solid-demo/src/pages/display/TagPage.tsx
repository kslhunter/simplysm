import { For } from "solid-js";
import { Tag, type TagTheme } from "@simplysm/solid";

const themes: TagTheme[] = ["primary", "info", "success", "warning", "danger", "base"];

export default function LabelPage() {
  return (
    <div class="space-y-8 p-6">
      {/* All Themes */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Themes</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          The Tag component supports 6 themes. Default is slate.
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <For each={themes}>{(theme) => <Tag theme={theme}>{theme}</Tag>}</For>
        </div>
      </section>

      {/* Default (no theme) */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Default Tag</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          If no theme is specified, the slate theme is applied.
        </p>
        <Tag>Default Tag</Tag>
      </section>

      {/* Use Cases */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Use Cases</h2>
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <span class="font-bold">Status:</span>
            <Tag theme="success">Completed</Tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold">Status:</span>
            <Tag theme="warning">Pending</Tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold">Status:</span>
            <Tag theme="danger">Error</Tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold">Version:</span>
            <Tag theme="info">v1.0.0</Tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold">Category:</span>
            <Tag theme="primary">Announcement</Tag>
            <Tag theme="base">General</Tag>
          </div>
        </div>
      </section>

      {/* In a List */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">In a List</h2>
        <div class="divide-y divide-base-200 rounded border border-base-200 dark:divide-base-700 dark:border-base-700">
          <div class="flex items-center justify-between p-3">
            <span>User registration completed</span>
            <Tag theme="success">Completed</Tag>
          </div>
          <div class="flex items-center justify-between p-3">
            <span>Payment processing in progress</span>
            <Tag theme="warning">In Progress</Tag>
          </div>
          <div class="flex items-center justify-between p-3">
            <span>Server error occurred</span>
            <Tag theme="danger">Failed</Tag>
          </div>
          <div class="flex items-center justify-between p-3">
            <span>New feature deployed</span>
            <Tag theme="info">New</Tag>
          </div>
        </div>
      </section>

      {/* Custom Styling */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Custom Styling</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          You can apply additional styles using the class prop.
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <Tag theme="primary" class="text-lg">
            Large Tag
          </Tag>
          <Tag theme="success" class="rounded-full px-3">
            Round Tag
          </Tag>
          <Tag theme="info" class="font-bold">
            Bold Tag
          </Tag>
        </div>
      </section>
    </div>
  );
}
