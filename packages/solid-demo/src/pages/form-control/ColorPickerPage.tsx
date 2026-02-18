import { ColorPicker, Topbar } from "@simplysm/solid";

export default function ColorPickerPage() {
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">ColorPicker</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
          {/* 기본 사용 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">기본 사용</h2>
            <div class="flex items-center gap-4">
              <ColorPicker />
              <ColorPicker value="#3b82f6" />
              <ColorPicker value="#ef4444" />
            </div>
          </section>

          {/* 사이즈 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">사이즈</h2>
            <div class="flex items-center gap-4">
              <ColorPicker size="sm" value="#22c55e" />
              <ColorPicker value="#22c55e" />
              <ColorPicker size="lg" value="#22c55e" />
            </div>
          </section>

          {/* 상태 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">상태</h2>
            <div class="flex items-center gap-4">
              <div>
                <p class="mb-1 text-sm text-base-500">Disabled</p>
                <ColorPicker disabled value="#8b5cf6" />
              </div>
            </div>
          </section>

          {/* Validation */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">Validation</h2>
            <div class="space-y-6">
              <div>
                <h3 class="mb-3 text-lg font-semibold">Required</h3>
                <ColorPicker required value={undefined} />
              </div>
              <div>
                <h3 class="mb-3 text-lg font-semibold">touchMode (blur 후 표시)</h3>
                <ColorPicker required touchMode value={undefined} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
