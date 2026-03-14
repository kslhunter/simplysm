import { ThemeToggle, Card, Alert } from "@simplysm/solid";

export function ThemeToggleView() {
  return (
    <div class="space-y-8 p-4">
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
            <h3>Light Mode</h3>
            <p>Bright background with dark text</p>
          </Card>
          <Card>
            <h3>System Setting</h3>
            <p>Auto-switch based on OS setting</p>
          </Card>
          <Card>
            <h3>Dark Mode</h3>
            <p>Dark background with bright text</p>
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
    </div>
  );
}
