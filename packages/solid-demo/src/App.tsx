import { SdButton, useTheme } from "@simplysm/solid";

export function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div class="min-h-screen bg-bg-base text-text-base p-8 space-y-8 transition-colors">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">SdButton Demo</h1>
        <SdButton onClick={toggleTheme}>
          {theme() === "light" ? "🌙 Dark" : "☀️ Light"}
        </SdButton>
      </div>

      {/* Theme variants */}
      <section>
        <h2 class="text-lg font-semibold mb-3">Theme Variants</h2>
        <div class="flex flex-wrap gap-2">
          <SdButton>Default</SdButton>
          <SdButton theme="primary">Primary</SdButton>
          <SdButton theme="secondary">Secondary</SdButton>
          <SdButton theme="info">Info</SdButton>
          <SdButton theme="success">Success</SdButton>
          <SdButton theme="warning">Warning</SdButton>
          <SdButton theme="danger">Danger</SdButton>
          <SdButton theme="gray">Gray</SdButton>
          <SdButton theme="blue-gray">Blue Gray</SdButton>
        </div>
      </section>

      {/* Link variants */}
      <section>
        <h2 class="text-lg font-semibold mb-3">Link Variants</h2>
        <div class="flex flex-wrap gap-2">
          <SdButton theme="link-primary">Link Primary</SdButton>
          <SdButton theme="link-secondary">Link Secondary</SdButton>
          <SdButton theme="link-info">Link Info</SdButton>
          <SdButton theme="link-success">Link Success</SdButton>
          <SdButton theme="link-warning">Link Warning</SdButton>
          <SdButton theme="link-danger">Link Danger</SdButton>
          <SdButton theme="link-gray">Link Gray</SdButton>
          <SdButton theme="link-blue-gray">Link Blue Gray</SdButton>
        </div>
      </section>

      {/* Size variants */}
      <section>
        <h2 class="text-lg font-semibold mb-3">Size Variants</h2>
        <div class="flex flex-wrap items-center gap-2">
          <SdButton theme="primary" size="sm">Small</SdButton>
          <SdButton theme="primary">Default</SdButton>
          <SdButton theme="primary" size="lg">Large</SdButton>
        </div>
      </section>

      {/* Disabled state */}
      <section>
        <h2 class="text-lg font-semibold mb-3">Disabled State</h2>
        <div class="flex flex-wrap gap-2">
          <SdButton disabled>Default Disabled</SdButton>
          <SdButton theme="primary" disabled>Primary Disabled</SdButton>
          <SdButton theme="link-primary" disabled>Link Disabled</SdButton>
        </div>
      </section>

      {/* Inset style */}
      <section>
        <h2 class="text-lg font-semibold mb-3">Inset Style</h2>
        <div class="flex flex-wrap gap-2">
          <SdButton inset>Inset Default</SdButton>
          <SdButton theme="primary" inset>Inset Primary</SdButton>
        </div>
      </section>
    </div>
  );
}
