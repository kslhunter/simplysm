import { createSignal } from "solid-js";
import { RichTextEditor, Invalid } from "@simplysm/solid";

export default function RichTextEditorPage() {
  const [html, setHtml] = createSignal("<p>여기에 내용을 입력하세요...</p>");

  return (
    <div class="space-y-12 p-6">
      {/* Basic usage */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">기본 사용</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Controlled</h3>
            <RichTextEditor value={html()} onValueChange={setHtml} />
          </div>

          <div>
            <h3 class="mb-3 text-lg font-bold">HTML 출력</h3>
            <pre class="max-h-40 overflow-auto rounded bg-base-100 p-2 text-xs dark:bg-base-800">
              {html()}
            </pre>
          </div>
        </div>
      </section>

      {/* State */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">상태</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Disabled</h3>
            <RichTextEditor value={html()} disabled />
          </div>

          <div>
            <h3 class="mb-3 text-lg font-bold">Invalid</h3>
            <Invalid message="에러 메시지 예시">
              <RichTextEditor value={html()} onValueChange={setHtml} />
            </Invalid>
          </div>
        </div>
      </section>

      {/* Size */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">사이즈</h2>
        <div class="space-y-6">
          <div>
            <h3 class="mb-3 text-lg font-bold">Small</h3>
            <RichTextEditor size="sm" value="<p>Small 사이즈</p>" />
          </div>

          <div>
            <h3 class="mb-3 text-lg font-bold">Default</h3>
            <RichTextEditor value="<p>기본 사이즈</p>" />
          </div>

          <div>
            <h3 class="mb-3 text-lg font-bold">Large</h3>
            <RichTextEditor size="lg" value="<p>Large 사이즈</p>" />
          </div>
        </div>
      </section>
    </div>
  );
}
