import { createSignal } from "solid-js";
import { SdButton, SdCheckbox } from "@simplysm/solid";

export default function CheckboxPage() {
  const [controlled, setControlled] = createSignal(false);
  const [canChangeValue, setCanChangeValue] = createSignal(true);

  return (
    <div class="space-y-8 p-8">
      <h1 class="mb-6 text-3xl font-bold">체크박스 데모</h1>

      {/* 기본 사용 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">기본 사용</h2>
        <div class="flex flex-wrap gap-4">
          <SdCheckbox>기본 체크박스</SdCheckbox>
          <SdCheckbox defaultValue={true}>기본 체크됨</SdCheckbox>
        </div>
      </section>

      {/* Controlled 모드 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Controlled 모드</h2>
        <div class="flex flex-wrap items-center gap-4">
          <SdCheckbox value={controlled()} onChange={setControlled}>
            Controlled: {controlled() ? "ON" : "OFF"}
          </SdCheckbox>
          <SdButton theme="primary" onClick={() => setControlled((v) => !v)}>
            외부에서 토글
          </SdButton>
        </div>
      </section>

      {/* canChangeFn */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">canChangeFn (변경 제어)</h2>
        <div class="flex flex-wrap items-center gap-4">
          <SdCheckbox value={canChangeValue()} onChange={setCanChangeValue}>
            변경 허용 여부
          </SdCheckbox>
          <SdCheckbox canChangeFn={() => canChangeValue()}>
            {canChangeValue() ? "변경 가능" : "변경 차단됨"}
          </SdCheckbox>
        </div>
      </section>

      {/* 테마 변형 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Theme Variants</h2>
        <div class="flex flex-wrap gap-4">
          <SdCheckbox defaultValue={true}>Default</SdCheckbox>
          <SdCheckbox theme="primary" defaultValue={true}>
            Primary
          </SdCheckbox>
          <SdCheckbox theme="secondary" defaultValue={true}>
            Secondary
          </SdCheckbox>
          <SdCheckbox theme="info" defaultValue={true}>
            Info
          </SdCheckbox>
          <SdCheckbox theme="success" defaultValue={true}>
            Success
          </SdCheckbox>
          <SdCheckbox theme="warning" defaultValue={true}>
            Warning
          </SdCheckbox>
          <SdCheckbox theme="danger" defaultValue={true}>
            Danger
          </SdCheckbox>
          <SdCheckbox theme="gray" defaultValue={true}>
            Gray
          </SdCheckbox>
          <SdCheckbox theme="slate" defaultValue={true}>
            Blue Gray
          </SdCheckbox>
        </div>
      </section>

      {/* 크기 변형 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Size Variants</h2>
        <div class="flex flex-wrap items-center gap-4">
          <SdCheckbox size="sm" defaultValue={true}>
            Small
          </SdCheckbox>
          <SdCheckbox defaultValue={true}>Default</SdCheckbox>
          <SdCheckbox size="lg" defaultValue={true}>
            Large
          </SdCheckbox>
        </div>
      </section>

      {/* Inline 스타일 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Inline Style</h2>
        <div class="flex flex-wrap items-center gap-4">
          <SdCheckbox inline>Inline 체크박스</SdCheckbox>
          <SdCheckbox inline defaultValue={true}>
            Inline 체크됨
          </SdCheckbox>
        </div>
      </section>

      {/* Inset 스타일 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Inset Style</h2>
        <div class="flex flex-wrap items-center gap-4">
          <SdCheckbox inset>Inset 체크박스</SdCheckbox>
          <SdCheckbox inset defaultValue={true}>
            Inset 체크됨
          </SdCheckbox>
        </div>
      </section>

      {/* 비활성화 상태 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Disabled State</h2>
        <div class="flex flex-wrap gap-4">
          <SdCheckbox disabled>Disabled</SdCheckbox>
          <SdCheckbox disabled defaultValue={true}>
            Disabled 체크됨
          </SdCheckbox>
        </div>
      </section>

      {/* Children 없이 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Children 없이</h2>
        <div class="flex flex-wrap items-center gap-4">
          <SdCheckbox />
          <SdCheckbox defaultValue={true} />
          <SdCheckbox theme="success" defaultValue={true} />
        </div>
      </section>
    </div>
  );
}
