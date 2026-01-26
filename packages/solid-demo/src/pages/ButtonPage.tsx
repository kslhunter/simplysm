import { SdButton } from "@simplysm/solid";

export default function ButtonPage() {
  return (
    <div class="space-y-8 p-8">
      <h1 class="mb-6 text-3xl font-bold">버튼 데모</h1>

      {/* 테마 변형 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Theme Variants</h2>
        <div class="flex flex-wrap gap-2">
          <SdButton>Default</SdButton>
          <SdButton theme="primary">Primary</SdButton>
          <SdButton theme="secondary">Secondary</SdButton>
          <SdButton theme="info">Info</SdButton>
          <SdButton theme="success">Success</SdButton>
          <SdButton theme="warning">Warning</SdButton>
          <SdButton theme="danger">Danger</SdButton>
          <SdButton theme="gray">Gray</SdButton>
          <SdButton theme="slate">Blue Gray</SdButton>
        </div>
      </section>

      {/* 링크 변형 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Link Variants</h2>
        <div class="flex flex-wrap gap-2">
          <SdButton theme="link-primary">Link Primary</SdButton>
          <SdButton theme="link-secondary">Link Secondary</SdButton>
          <SdButton theme="link-info">Link Info</SdButton>
          <SdButton theme="link-success">Link Success</SdButton>
          <SdButton theme="link-warning">Link Warning</SdButton>
          <SdButton theme="link-danger">Link Danger</SdButton>
          <SdButton theme="link-gray">Link Gray</SdButton>
          <SdButton theme="link-slate">Link Blue Gray</SdButton>
        </div>
      </section>

      {/* 크기 변형 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Size Variants</h2>
        <div class="flex flex-wrap items-center gap-2">
          <SdButton theme="primary" size="sm">Small</SdButton>
          <SdButton theme="primary">Default</SdButton>
          <SdButton theme="primary" size="lg">Large</SdButton>
        </div>
      </section>

      {/* 비활성화 상태 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Disabled State</h2>
        <div class="flex flex-wrap gap-2">
          <SdButton disabled>Default Disabled</SdButton>
          <SdButton theme="primary" disabled>Primary Disabled</SdButton>
          <SdButton theme="link-primary" disabled>Link Disabled</SdButton>
        </div>
      </section>

      {/* Inset 스타일 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Inset Style</h2>
        <div class="flex flex-wrap gap-2">
          <SdButton inset>Inset Default</SdButton>
          <SdButton theme="primary" inset>Inset Primary</SdButton>
        </div>
      </section>
    </div>
  );
}
