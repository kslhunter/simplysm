import { ThemeToggle, Card, Alert } from "@simplysm/solid";

export default function ThemeTogglePage() {
  return (
    <div class="space-y-8 p-6">
      {/* Basic Usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Usage</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Click the ThemeToggle button to cycle through themes in order: Light → System → Dark.
        </p>
        <div class="flex items-center gap-4">
          <ThemeToggle />
          <span class="text-sm text-base-500">Click to change theme</span>
        </div>
      </section>

      {/* Sizes */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Size</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          You can adjust button size with the size prop.
        </p>
        <div class="flex items-center gap-6">
          <div class="flex flex-col items-center gap-2">
            <ThemeToggle size="sm" />
            <span class="text-xs text-base-500">sm</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <ThemeToggle />
            <span class="text-xs text-base-500">default</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <ThemeToggle size="lg" />
            <span class="text-xs text-base-500">lg</span>
          </div>
        </div>
      </section>

      {/* Theme Modes */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Theme Modes</h2>
        <div class="space-y-4">
          <Card>
            <div class="flex items-center gap-3 p-4">
              <div class="flex size-10 items-center justify-center rounded bg-warning-100 text-warning-600 dark:bg-warning-900/30">
                ☀️
              </div>
              <div>
                <h3 class="font-bold">Light Mode</h3>
                <p class="text-sm text-base-500 dark:text-base-400">Bright background with dark text</p>
              </div>
            </div>
          </Card>
          <Card>
            <div class="flex items-center gap-3 p-4">
              <div class="flex size-10 items-center justify-center rounded bg-base-100 text-base-600 dark:bg-base-700">
                💻
              </div>
              <div>
                <h3 class="font-bold">System Setting</h3>
                <p class="text-sm text-base-500 dark:text-base-400">Auto-switch based on OS setting</p>
              </div>
            </div>
          </Card>
          <Card>
            <div class="flex items-center gap-3 p-4">
              <div class="flex size-10 items-center justify-center rounded bg-info-100 text-info-600 dark:bg-info-900/30">
                🌙
              </div>
              <div>
                <h3 class="font-bold">Dark Mode</h3>
                <p class="text-sm text-base-500 dark:text-base-400">Dark background with bright text</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Usage Note */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Usage Notes</h2>
        <Alert theme="info">
          <p class="mb-2">
            <strong>ThemeProvider Required:</strong> ThemeToggle must be used within the ThemeProvider context.
          </p>
          <p>Theme settings are stored in localStorage and persist across page refreshes.</p>
        </Alert>
      </section>

      {/* In Header Example */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">
          Header Usage Example
        </h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          ThemeToggle is typically placed in the sidebar or header.
        </p>
        <Card>
          <div class="flex items-center justify-between border-b border-base-200 bg-base-50 px-4 py-3 dark:border-base-700 dark:bg-base-700/50">
            <span class="font-bold">My App</span>
            <ThemeToggle size="sm" />
          </div>
          <div class="p-4">
            <p class="text-base-600 dark:text-base-400">
              Example of ThemeToggle placed in the top-right of the header.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
