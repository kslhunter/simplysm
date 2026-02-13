import { createSignal } from "solid-js";
import { RichTextEditor, Invalid, Topbar } from "@simplysm/solid";

export default function RichTextEditorPage() {
  const [html, setHtml] = createSignal("<p>여기에 내용을 입력하세요...</p>");

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">RichTextEditor</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
          {/* 기본 사용 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">기본 사용</h2>
            <div class="space-y-6">
              <div>
                <h3 class="mb-3 text-lg font-semibold">Controlled</h3>
                <RichTextEditor value={html()} onValueChange={setHtml} />
              </div>

              <div>
                <h3 class="mb-3 text-lg font-semibold">HTML 출력</h3>
                <pre class="max-h-40 overflow-auto rounded bg-base-100 p-2 text-xs dark:bg-base-800">{html()}</pre>
              </div>
            </div>
          </section>

          {/* 상태 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">상태</h2>
            <div class="space-y-6">
              <div>
                <h3 class="mb-3 text-lg font-semibold">Disabled</h3>
                <RichTextEditor value={html()} disabled />
              </div>

              <div>
                <h3 class="mb-3 text-lg font-semibold">Invalid</h3>
                <Invalid message="에러 메시지 예시">
                  <RichTextEditor value={html()} onValueChange={setHtml} />
                </Invalid>
              </div>
            </div>
          </section>

          {/* 사이즈 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">사이즈</h2>
            <div class="space-y-6">
              <div>
                <h3 class="mb-3 text-lg font-semibold">Small</h3>
                <RichTextEditor size="sm" value="<p>Small 사이즈</p>" />
              </div>

              <div>
                <h3 class="mb-3 text-lg font-semibold">Default</h3>
                <RichTextEditor value="<p>기본 사이즈</p>" />
              </div>

              <div>
                <h3 class="mb-3 text-lg font-semibold">Large</h3>
                <RichTextEditor size="lg" value="<p>Large 사이즈</p>" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
