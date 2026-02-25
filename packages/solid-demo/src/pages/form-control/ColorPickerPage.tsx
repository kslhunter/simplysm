import { ColorPicker } from "@simplysm/solid";

export default function ColorPickerPage() {
  return (
    <div class="space-y-12 p-6">
      {/* Basic usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Basic Usage</h2>
        <div class="flex items-center gap-4">
          <ColorPicker />
          <ColorPicker value="#3b82f6" />
          <ColorPicker value="#ef4444" />
        </div>
      </section>

      {/* Size */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Size</h2>
        <div class="flex items-center gap-4">
          <ColorPicker size="sm" value="#22c55e" />
          <ColorPicker value="#22c55e" />
          <ColorPicker size="lg" value="#22c55e" />
        </div>
      </section>

      {/* State */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">State</h2>
        <div class="flex items-center gap-4">
          <div>
            <p class="mb-1 text-sm text-base-500">Disabled</p>
            <ColorPicker disabled value="#8b5cf6" />
          </div>
        </div>
      </section>

      {/* Validation */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Validation</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-semibold">Required</h3>
            <ColorPicker required value={undefined} />
          </div>
          <div>
            <h3 class="mb-3 text-lg font-semibold">touchMode (displays after blur)</h3>
            <ColorPicker required touchMode value={undefined} />
          </div>
        </div>
      </section>
    </div>
  );
}
