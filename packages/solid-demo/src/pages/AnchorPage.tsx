import { SdAnchor } from "@simplysm/solid";

export default function AnchorPage() {
  return (
    <div class="space-y-8 p-8">
      <h1 class="mb-6 text-3xl font-bold">앵커 데모</h1>

      {/* 테마 변형 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Theme Variants</h2>
        <div class="flex flex-wrap gap-4">
          <SdAnchor>Primary (기본)</SdAnchor>
          <SdAnchor theme="secondary">Secondary</SdAnchor>
          <SdAnchor theme="info">Info</SdAnchor>
          <SdAnchor theme="success">Success</SdAnchor>
          <SdAnchor theme="warning">Warning</SdAnchor>
          <SdAnchor theme="danger">Danger</SdAnchor>
          <SdAnchor theme="gray">Gray</SdAnchor>
          <SdAnchor theme="slate">Blue Gray</SdAnchor>
        </div>
      </section>

      {/* 인라인 사용 예시 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Inline Usage</h2>
        <p class="text-text-base">
          이것은 일반 텍스트입니다. <SdAnchor onClick={() => alert("클릭됨!")}>여기를 클릭</SdAnchor>하면
          이벤트가 발생합니다. 또한 <SdAnchor theme="danger">위험한 작업</SdAnchor>이나{" "}
          <SdAnchor theme="success">성공 메시지</SdAnchor>를 표시할 수도 있습니다.
        </p>
      </section>

      {/* 비활성화 상태 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Disabled State</h2>
        <div class="flex flex-wrap gap-4">
          <SdAnchor disabled>Primary Disabled</SdAnchor>
          <SdAnchor theme="secondary" disabled>Secondary Disabled</SdAnchor>
          <SdAnchor theme="danger" disabled>Danger Disabled</SdAnchor>
        </div>
      </section>

      {/* 클릭 이벤트 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">Click Events</h2>
        <div class="flex flex-wrap gap-4">
          <SdAnchor onClick={() => alert("Primary 클릭!")}>클릭하세요</SdAnchor>
          <SdAnchor theme="info" onClick={() => alert("Info 클릭!")}>
            Info 알림
          </SdAnchor>
          <SdAnchor theme="warning" onClick={() => confirm("정말로 진행하시겠습니까?")}>
            확인 대화상자
          </SdAnchor>
        </div>
      </section>

      {/* 버튼과의 비교 */}
      <section>
        <h2 class="mb-3 text-lg font-semibold">SdButton과의 차이점</h2>
        <ul class="list-inside list-disc space-y-2 text-text-base">
          <li>
            <code class="rounded-sm bg-bg-elevated px-1">SdAnchor</code>는 인라인 텍스트 링크 스타일
          </li>
          <li>Ripple 효과 없음</li>
          <li>hover 시 배경색 변경 없이 언더라인만 표시</li>
          <li>
            <code class="rounded-sm bg-bg-elevated px-1">&lt;span&gt;</code> 요소 사용 (버튼은{" "}
            <code class="rounded-sm bg-bg-elevated px-1">&lt;button&gt;</code>)
          </li>
        </ul>
      </section>
    </div>
  );
}
